const fs = require('fs');
const path = require('path');

// Paths
const kbDir = path.join(__dirname, '..', 'src', 'data', 'kb');
const outputDir = path.join(__dirname, '..', 'src', 'data');
const outputFile = path.join(outputDir, 'kb-vectors.json');

// Helper to split markdown into chunks
function chunkMarkdown(filePath, fileName) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const chunks = [];
  let currentHeader = 'Introduction';
  let currentText = '';

  for (const line of lines) {
    if (line.startsWith('## ')) {
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
      currentHeader = line.replace('# ', '').trim();
    } else {
      currentText += line + '\n';
    }
  }

  if (currentText.trim()) {
    chunks.push({
      category: fileName.replace('.md', ''),
      header: currentHeader,
      text: `${currentHeader}\n${currentText.trim()}`
    });
  }

  return chunks;
}

function run() {
  try {
    const files = fs.readdirSync(kbDir).filter(f => f.endsWith('.md'));
    let allChunks = [];

    for (const file of files) {
      const filePath = path.join(kbDir, file);
      const chunks = chunkMarkdown(filePath, file);
      allChunks = allChunks.concat(chunks);
    }

    // Create mock 768-dimension vectors (all 0.05)
    const mockVector = Array(768).fill(0.05);

    const vectorDb = allChunks.map(chunk => ({
      category: chunk.category,
      header: chunk.header,
      text: chunk.text,
      vector: mockVector
    }));

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputFile, JSON.stringify(vectorDb, null, 2), 'utf-8');
    console.log('Successfully pre-generated kb-vectors.json with dummy vectors.');
  } catch (error) {
    console.error('Failed to pre-generate vectors:', error);
  }
}

run();
