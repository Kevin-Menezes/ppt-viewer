const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const PRESENTATION_ID = '1OaxpxNqroKJ2pjUk8CJ5zCfOUH_VGXGc';
const DOWNLOAD_URL = `https://docs.google.com/presentation/d/${PRESENTATION_ID}/export/pptx`;

function decodeXml(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function cleanupText(text) {
  return String(text || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractSlideText(xml) {
  const parts = [];
  const re = /<a:t[^>]*>([\s\S]*?)<\/a:t>/g;
  let m;
  while ((m = re.exec(xml))) {
    parts.push(cleanupText(decodeXml(m[1] || '')));
  }
  return cleanupText(parts.filter(Boolean).join(' '));
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
      if (existing && existing.presentationId === PRESENTATION_ID && Number(existing.totalPages) > 0) {
        process.stdout.write(`Using existing ${outPath} (${existing.totalPages} pages)\n`);
        return;
      }
    } catch {
    }
  }

  const res = await fetch(DOWNLOAD_URL);
  if (!res.ok) throw new Error(`Failed to download pptx: ${res.status} ${res.statusText}`);

  const arrayBuffer = await res.arrayBuffer();
  const buf = Buffer.from(arrayBuffer);

  const zip = new AdmZip(buf);
  const entries = zip
    .getEntries()
    .map((e) => e.entryName)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/i.test(n))
    .sort((a, b) => {
      const an = Number(a.match(/slide(\d+)\.xml/i)?.[1] || 0);
      const bn = Number(b.match(/slide(\d+)\.xml/i)?.[1] || 0);
      return an - bn;
    });

  const pages = entries.map((name, idx) => {
    const slideNum = Number(name.match(/slide(\d+)\.xml/i)?.[1] || idx + 1);
    const xml = zip.readAsText(name);
    let notesText = '';
    const notesName = `ppt/notesSlides/notesSlide${slideNum}.xml`;
    if (zip.getEntry(notesName)) {
      try {
        notesText = extractSlideText(zip.readAsText(notesName));
      } catch {
      }
    }
    return {
      page: idx + 1,
      text: cleanupText([extractSlideText(xml), notesText].filter(Boolean).join(' ')),
    };
  });

  const index = pages.map((p) => (p.text || '').toLowerCase());

  const out = {
    presentationId: PRESENTATION_ID,
    sourceUrl: DOWNLOAD_URL,
    totalPages: pages.length,
    generatedAt: new Date().toISOString(),
    index,
  };
  fs.writeFileSync(outPath, JSON.stringify(out));

  process.stdout.write(`Wrote ${outPath} (${pages.length} pages)\n`);
}

main().catch((err) => {
  process.stderr.write(String(err?.stack || err) + '\n');
  process.exit(1);
});
