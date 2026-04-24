const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(process.cwd(), 'public/pages');

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

async function main() {
  ensureDir(OUTPUT_DIR);

  // Get all image files in the pages directory (both jpg and png)
  const files = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.jpg') || f.endsWith('.png'));
  
  if (files.length === 0) {
    throw new Error('No image files found in public/pages/. Please convert your PDF to images and place them in public/pages/ folder.');
  }

  // Sort files numerically
  files.sort((a, b) => {
    const numA = parseInt(a.match(/\d+/)[0]);
    const numB = parseInt(b.match(/\d+/)[0]);
    return numA - numB;
  });

  const totalPages = files.length;
  process.stdout.write(`Found ${totalPages} page images\n`);

  const pageData = [];
  for (let i = 0; i < files.length; i++) {
    const fileName = files[i];
    const pageNumber = parseInt(fileName.match(/\d+/)[0]);
    
    pageData.push({
      pageNumber: pageNumber,
      fileName: fileName,
    });
  }

  // Write pages.json index
  const index = {
    totalPages: totalPages,
    pages: pageData,
    generatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(OUTPUT_DIR, 'pages.json'), JSON.stringify(index, null, 2));

  process.stdout.write(`Successfully generated pages.json with ${totalPages} pages\n`);
  process.stdout.write(`Images directory: ${OUTPUT_DIR}\n`);
}

main().catch((err) => {
  process.stderr.write(String(err?.stack || err) + '\n');
  process.exit(1);
});
