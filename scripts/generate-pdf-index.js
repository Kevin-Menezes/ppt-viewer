const fs = require('fs');
const path = require('path');
const { getDocument } = require('pdfjs-dist/legacy/build/pdf.js');

const PDF_FILE_PATH = path.join(process.cwd(), 'public/pdf/Bible Stories.pdf');

function cleanupText(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

async function main() {
  const force = process.argv.includes('--force');
  const publicDir = path.join(process.cwd(), 'public');
  ensureDir(publicDir);
  const outPath = path.join(publicDir, 'presentation-index.json');

  if (!force && fs.existsSync(outPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(outPath, 'utf8'));
      if (existing && existing.fileName === 'Bible Stories.pdf' && Number(existing.totalPages) > 0) {
        process.stdout.write(`Using existing ${outPath} (${existing.totalPages} pages)\n`);
        return;
      }
    } catch {
    }
  }

  if (!fs.existsSync(PDF_FILE_PATH)) {
    throw new Error(`PDF file not found: ${PDF_FILE_PATH}`);
  }

  const loadingTask = getDocument(PDF_FILE_PATH);
  const pdf = await loadingTask.promise;
  const totalPages = pdf.numPages;

  // Extract text from all pages for search index
  const index = [];
  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    index.push(cleanupText(pageText).toLowerCase());
  }

  const out = {
    fileName: 'Bible Stories.pdf',
    filePath: PDF_FILE_PATH,
    totalPages: totalPages,
    generatedAt: new Date().toISOString(),
    index: index,
  };
  fs.writeFileSync(outPath, JSON.stringify(out));

  process.stdout.write(`Wrote ${outPath} (${totalPages} pages)\n`);
}

main().catch((err) => {
  process.stderr.write(String(err?.stack || err) + '\n');
  process.exit(1);
});
