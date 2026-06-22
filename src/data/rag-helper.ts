import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

export interface KbChunk {
  category: string;
  header: string;
  text: string;
  vector: number[];
}

// Simple dot product
function dotProduct(a: number[], b: number[]): number {
  return a.reduce((sum, val, idx) => sum + val * (b[idx] || 0), 0);
}

// Simple magnitude calculation
function magnitude(a: number[]): number {
  return Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
}

// Cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  const magA = magnitude(a);
  const magB = magnitude(b);
  if (magA === 0 || magB === 0) return 0;
  return dotProduct(a, b) / (magA * magB);
}

// Fallback Keyword Search (TF-IDF style)
function keywordSearch(query: string, chunks: KbChunk[], limit: number = 3): KbChunk[] {
  const queryTerms = query
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(term => term.length > 2); // filter short words

  if (queryTerms.length === 0) {
    return chunks.slice(0, limit);
  }

  const scoredChunks = chunks.map(chunk => {
    const chunkTextLower = chunk.text.toLowerCase();
    let score = 0;

    queryTerms.forEach(term => {
      // Score based on term occurrence and header match boost
      if (chunkTextLower.includes(term)) {
        score += 1;
        if (chunk.header.toLowerCase().includes(term)) {
          score += 2; // boost for header match
        }
        if (chunk.category.toLowerCase().includes(term)) {
          score += 1.5; // boost for category match
        }
      }
    });

    return { chunk, score };
  });

  // Sort by score descending and filter out zero scores if possible
  return scoredChunks
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.chunk);
}

export async function retrieveRelevantContext(
  query: string,
  userApiKey?: string,
  limit: number = 3
): Promise<string> {
  try {
    const filePath = path.join(process.cwd(), 'src', 'data', 'kb-vectors.json');
    if (!fs.existsSync(filePath)) {
      console.warn('kb-vectors.json not found, RAG returning empty context.');
      return '';
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const chunks: KbChunk[] = JSON.parse(fileContent);

    if (!chunks || chunks.length === 0) {
      return '';
    }

    // Check if the vectors are dummy vectors (all identical values)
    const firstVector = chunks[0].vector;
    const isDummy = firstVector.every((val, _, arr) => val === arr[0]);

    const effectiveKey = userApiKey || process.env.GEMINI_API_KEY;

    if (!effectiveKey || isDummy) {
      console.log('Using Keyword Search fallback (No API key or dummy vectors detected)');
      const results = keywordSearch(query, chunks, limit);
      return results.map(c => `[Category: ${c.category} | Topic: ${c.header}]\n${c.text}`).join('\n\n');
    }

    console.log('Performing Semantic Vector Search using Gemini embeddings...');
    const genAI = new GoogleGenerativeAI(effectiveKey);
    const embeddingModel = genAI.getGenerativeModel({ model: 'gemini-embedding-2' });

    const embeddingResult = await embeddingModel.embedContent(query);
    const queryVector = embeddingResult.embedding.values;

    const scored = chunks.map(chunk => ({
      chunk,
      similarity: cosineSimilarity(queryVector, chunk.vector)
    }));

    const sortedResults = scored
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(item => item.chunk);

    return sortedResults.map(c => `[Category: ${c.category} | Topic: ${c.header}]\n${c.text}`).join('\n\n');
  } catch (error) {
    console.error('Error in retrieveRelevantContext RAG pipeline:', error);
    return '';
  }
}
