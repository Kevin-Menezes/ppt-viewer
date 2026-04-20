const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function xmlEscape(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function paragraph(text, opts = {}) {
  const runs = [];
  const parts = Array.isArray(text) ? text : [text];
  for (const p of parts) {
    const t = xmlEscape(p.text);
    const rPr = p.bold ? '<w:rPr><w:b/></w:rPr>' : '';
    runs.push(`<w:r>${rPr}<w:t xml:space="preserve">${t}</w:t></w:r>`);
  }

  const pPr = opts.spacingAfterTwips
    ? `<w:pPr><w:spacing w:after="${opts.spacingAfterTwips}"/></w:pPr>`
    : '';

  return `<w:p>${pPr}${runs.join('')}</w:p>`;
}

function documentXml(lines) {
  const body = lines.join('') +
    '<w:sectPr>' +
    '<w:pgSz w:w="12240" w:h="15840"/>' +
    '<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>' +
    '</w:sectPr>';

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    `<w:body>${body}</w:body>` +
    '</w:document>'
  );
}

function contentTypesXml() {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
    '</Types>'
  );
}

function relsXml() {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
    '</Relationships>'
  );
}

function docRelsXml() {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '</Relationships>'
  );
}

function buildUserFlowLines() {
  const lines = [];

  lines.push(paragraph([{ text: 'PPT Viewer Interface — User Flow & Functionality', bold: true }], { spacingAfterTwips: 240 }));
  lines.push(paragraph(''));

  lines.push(paragraph([{ text: '1) Landing (Home)', bold: true }], { spacingAfterTwips: 120 }));
  lines.push(paragraph('- Default behavior: if a previous reading position exists, the app redirects straight into the viewer on the last page.'));
  lines.push(paragraph('- To force the landing page, open: /?landing=1'));
  lines.push(paragraph('- Actions available: View Stories, Download .pptx'));
  lines.push(paragraph(''));

  lines.push(paragraph([{ text: '2) Viewer (Presentation)', bold: true }], { spacingAfterTwips: 120 }));
  lines.push(paragraph('- The current page is loaded in a full-screen iframe using the Google Slides embed URL.'));
  lines.push(paragraph('- While the next page is loading, a golden circle loader is shown.'));
  lines.push(paragraph('- Controls auto-hide after idle time and reappear on interaction.'));
  lines.push(paragraph(''));

  lines.push(paragraph([{ text: '3) Navigation', bold: true }], { spacingAfterTwips: 120 }));
  lines.push(paragraph('- Buttons: Prev / Next'));
  lines.push(paragraph('- Keyboard: Left/Right arrows (and Space/Down for next), Esc to exit, F for fullscreen.'));
  lines.push(paragraph('- Transitions: navigation is guarded to avoid double-triggering during load.'));
  lines.push(paragraph(''));

  lines.push(paragraph([{ text: '4) Page Overview (Thumbnails)', bold: true }], { spacingAfterTwips: 120 }));
  lines.push(paragraph('- Open from the top bar.'));
  lines.push(paragraph('- Shows thumbnails in pages (pagination) to remain fast even for 300+ pages.'));
  lines.push(paragraph('- Bookmarked pages show a bookmark icon overlay and a highlighted border.'));
  lines.push(paragraph(''));

  lines.push(paragraph([{ text: '5) Search', bold: true }], { spacingAfterTwips: 120 }));
  lines.push(paragraph('- Search is available inside Page Overview.'));
  lines.push(paragraph('- It searches the PPT text extracted at build time into public/presentation-index.json.'));
  lines.push(paragraph('- No API keys are used.'));
  lines.push(paragraph(''));

  lines.push(paragraph([{ text: '6) Bookmarks', bold: true }], { spacingAfterTwips: 120 }));
  lines.push(paragraph('- Toggle bookmark for the current page from the top bar.'));
  lines.push(paragraph('- Open the Bookmarks panel to view all saved bookmarks and jump/remove.'));
  lines.push(paragraph(''));

  lines.push(paragraph([{ text: '7) Persistence (localStorage)', bold: true }], { spacingAfterTwips: 120 }));
  lines.push(paragraph('- Progress: pptViewer.progress.<PRESENTATION_ID> => { page, at }'));
  lines.push(paragraph('- Bookmarks: pptViewer.bookmarks.<PRESENTATION_ID> => [pageNumbers]'));
  lines.push(paragraph('- Cached total pages: pptViewer.totalPages.<PRESENTATION_ID> => number'));
  lines.push(paragraph(''));

  lines.push(paragraph([{ text: '8) Build-time Index Generation', bold: true }], { spacingAfterTwips: 120 }));
  lines.push(paragraph('- Command: npm run index'));
  lines.push(paragraph('- Output: public/presentation-index.json (includes totalPages and per-page text index)'));
  lines.push(paragraph('- Regenerate: npm run index -- --force'));
  lines.push(paragraph(''));

  lines.push(paragraph([{ text: '9) Hosting on GitHub Pages (Static Export)', bold: true }], { spacingAfterTwips: 120 }));
  lines.push(paragraph('- The project is configured for static export.'));
  lines.push(paragraph('- Build output: out/'));
  lines.push(paragraph('- Set NEXT_PUBLIC_BASE_PATH when deploying under a repo subpath.'));

  return lines;
}

function main() {
  const outDir = path.join(process.cwd(), 'docs');
  ensureDir(outDir);
  const outPath = path.join(outDir, 'user-flow.docx');

  const zip = new AdmZip();

  zip.addFile('[Content_Types].xml', Buffer.from(contentTypesXml(), 'utf8'));
  zip.addFile('_rels/.rels', Buffer.from(relsXml(), 'utf8'));
  zip.addFile('word/document.xml', Buffer.from(documentXml(buildUserFlowLines()), 'utf8'));
  zip.addFile('word/_rels/document.xml.rels', Buffer.from(docRelsXml(), 'utf8'));

  zip.writeZip(outPath);
  process.stdout.write(`Wrote ${outPath}\n`);
}

main();
