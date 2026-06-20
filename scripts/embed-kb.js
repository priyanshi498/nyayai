const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Ensure GEMINI_API_KEY is available
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('\x1b[31m%s\x1b[0m', 'Error: GEMINI_API_KEY environment variable is not set.');
  console.log('Please set it in your terminal, for example:');
  console.log('  Windows (PowerShell): $env:GEMINI_API_KEY="your-key-here"');
  console.log('  Windows (CMD):        set GEMINI_API_KEY=your-key-here');
  console.log('Then run this script again.');
  process.exit(1);
}

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(apiKey);
const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });

// Paths
const kbDir = path.join(__dirname, '..', 'src', 'data', 'kb');
const outputDir = path.join(__dirname, '..', 'src', 'data');
const outputFile = path.join(outputDir, 'kb-vectors.json');

// Helper to split markdown into meaningful chunks by header
function chunkMarkdown(filePath, fileName) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const chunks = [];
  let currentHeader = 'Introduction';
  let currentText = '';

  for (const line of lines) {
    if (line.startsWith('## ')) {
      // Save prior chunk if it has text
      if (currentText.trim()) {
        chunks.push({
          category: fileName.replace('.md', ''),
          header: currentHeader,
          text: `${currentHeader}\n${currentText.trim()}`
        });
      }
      currentHeader = line.replace('## ', '').trim();
      currentText = '';
    } else if (line.startsWith('# ')) {
      // Main title line, can serve as introduction start
      currentHeader = line.replace('# ', '').trim();
    } else {
      currentText += line + '\n';
    }
  }

  // Push the final chunk
  if (currentText.trim()) {
    chunks.push({
      category: fileName.replace('.md', ''),
      header: currentHeader,
      text: `${currentHeader}\n${currentText.trim()}`
    });
  }

  return chunks;
}

async function run() {
  try {
    console.log('Reading knowledge base files...');
    const files = fs.readdirSync(kbDir).filter(f => f.endsWith('.md'));
    let allChunks = [];

    for (const file of files) {
      const filePath = path.join(kbDir, file);
      const chunks = chunkMarkdown(filePath, file);
      console.log(`- Loaded ${chunks.length} chunks from ${file}`);
      allChunks = allChunks.concat(chunks);
    }

    console.log(`Total chunks to embed: ${allChunks.length}`);
    console.log('Generating embeddings using Gemini API (text-embedding-004)...');

    const vectorDb = [];

    for (let i = 0; i < allChunks.length; i++) {
      const chunk = allChunks[i];
      console.log(`[${i + 1}/${allChunks.length}] Embedding chunk: "${chunk.header}" (${chunk.category})`);

      try {
        const result = await embeddingModel.embedContent(chunk.text);
        if (result && result.embedding && result.embedding.values) {
          vectorDb.push({
            category: chunk.category,
            header: chunk.header,
            text: chunk.text,
            vector: result.embedding.values
          });
        } else {
          throw new Error('Invalid embedding response from Gemini API');
        }
      } catch (err) {
        console.error(`Failed to embed chunk "${chunk.header}":`, err.message);
      }
      
      // Small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log(`Writing embeddings database to ${outputFile}...`);
    fs.writeFileSync(outputFile, JSON.stringify(vectorDb, null, 2), 'utf-8');
    console.log('\x1b[32m%s\x1b[0m', 'Success! Local vector database created successfully.');

  } catch (error) {
    console.error('Embedding failed:', error);
  }
}

run();
