# PDF Viewer — User Flow & Functionality

## Overview

This project is a responsive, lightweight PDF viewer built with Next.js and pdfjs-dist. It adds "book reader" features like resume reading, bookmarks, a paginated page overview with thumbnails, and simple search without any runtime API keys.

Key goals:

- No external API key usage
- Works as a static export (GitHub Pages compatible)
- Smooth page transitions with a minimal loader
- Gold/white color theme for elegant presentation

## Pages

### 1) Landing page (`/`)

What you see:

- Title/branding
- Primary action to open the reader ("Start Bible Stories")
- Download buttons for PPT (OneDrive) and PDF

Auto-resume behavior:

- If a last-read page exists in local storage and you did not explicitly request the landing page, the app redirects to that page in the reader.

How to force the landing page:

- Open `/?landing=1`

### 2) Reader / Viewer (`/presentation`)

What the viewer does:

- Displays the current PDF page using canvas rendering via pdfjs-dist
- Shows navigation controls and reading progress
- Supports keyboard navigation and fullscreen
- Shows a golden spinner while a page is loading
- Auto-hides controls after 3.5 seconds of inactivity

Deep link behavior:

- You can open a specific page via:
  - `/presentation?page=12`

## Navigation & Reading

### Prev / Next

- Use Prev/Next buttons to move between pages.
- The back button functions as "Previous page"
- Navigation is guarded during transitions to avoid double-triggering.

### Click zones

- Invisible left/right side click zones can be used to go to previous/next page.

### Keyboard shortcuts

- `←` / `→`: previous / next page
- `F`: fullscreen
- `Esc`: exit fullscreen / close overlays

### Loading states (golden loader)

- When moving to a new page, the app sets a transition state.
- While the PDF is being rendered, a centered golden circular spinner is shown.
- When rendering completes, the transition state ends and the loader disappears.

### Image quality

- PDF pages are rendered with high quality using `image-rendering: crisp-edges` for sharpness
- Canvas rendering ensures proper scaling for different screen sizes

## Page Overview (Thumbnails)

How to use:

- Open "All Pages" / overview from the top bar.
- A grid of page thumbnails is shown, rendered via canvas.

Performance behavior:

- The overview is paginated to stay fast for large PDFs (150+ pages).
- Only a subset of thumbnails are rendered per overview page.
- Each thumbnail is rendered only once to prevent canvas errors.

Bookmark indicators:

- Pages that are bookmarked show a bookmark icon.
- Bookmarked pages are visually highlighted with a white border.

Download options:

- PPT download button links to OneDrive
- PDF download button for direct PDF download

## Search

Where search lives:

- Search is available inside the Page Overview.

How search works (no API keys):

- Search does not call external APIs.
- Instead, it searches a build-time generated local index file:
  - `public/pdf-index.json`

Matching behavior:

- Search runs on the extracted text for each page.
- Search results provide a list of matching page numbers.
- Clicking a result jumps to that page.

If search index is missing:

- The UI will show an error that the index isn't available.
- Fix by generating it:

```bash
npm run index
```

## Bookmarks

### Toggle bookmark

- You can bookmark the current page using the bookmark action in the top bar.
- Toggling a bookmark adds/removes the current page number from your bookmark list.

### Bookmarks panel

- Open the Bookmarks panel to:
  - Jump to a bookmarked page
  - Remove a bookmark
  - View thumbnails of bookmarked pages

Download options:

- PPT download button links to OneDrive
- PDF download button for direct PDF download

## Resume reading

How it works:

- The viewer saves your current page into local storage as you read.
- When you come back later, the landing page will redirect you to your last-read page (unless `?landing=1` is used).

## Persistence (Local Storage)

The app stores data per presentation id:

- Progress:
  - Key: `pdfViewer.progress.<PRESENTATION_NAME>`
  - Value: page number
- Bookmarks:
  - Key: `pdfViewer.bookmarks.<PRESENTATION_NAME>`
  - Value: `[pageNumber, ...]`
- Cached total pages:
  - Key: `pdfViewer.totalPages.<PRESENTATION_NAME>`
  - Value: `number`

## Build-time Index Generation (page count + search)

### What it generates

- File: `public/pdf-index.json`
- Contains:
  - `totalPages`
  - `index[]` (lowercased extracted text per page)

### Commands

Generate (or reuse if already generated):

```bash
npm run index
```

Force regenerate:

```bash
npm run index -- --force
```

## Configuration

### PDF File

- Place your PDF in `public/pdf/` directory
- Update `PDF_URL` in `pages/presentation.js` and `pages/index.js`

### PPT Download

- Update `PPT_URL` in `pages/presentation.js` and `pages/index.js` to point to your PPT file (OneDrive, Google Drive, or local)

### Presentation Name

- Update `PRESENTATION_NAME` in both `pages/presentation.js` and `pages/index.js`

## Static export / GitHub Pages

- The project is configured for static export (`output: 'export'`).
- Build output is written to `out/`.

### GitHub Pages Configuration

For GitHub Pages deployment, the following files need to be configured with the `/bible-stories` prefix:

**next.config.js:**
```js
basePath: '/bible-stories',
assetPrefix: '/bible-stories',
```

**pages/presentation.js:**
```js
const PDF_URL = '/bible-stories/pdf/Bible-Stories.pdf';
```

**pages/index.js:**
```js
const DOWNLOAD_URL = '/bible-stories/pdf/Bible-Stories.pdf';
```

### Local Development Configuration

When working locally, ensure the following files are configured without the `/bible-stories` prefix:

**next.config.js:**
```js
basePath: '',
assetPrefix: '',
```

**pages/presentation.js:**
```js
const PDF_URL = '/pdf/Bible-Stories.pdf';
```

**pages/index.js:**
```js
const DOWNLOAD_URL = '/pdf/Bible-Stories.pdf';
```

## Color Theme

The application uses a gold/white color scheme:

- Gold color: `var(--gold)` - used for icons, numbers, borders, and buttons
- White color: `#fff` - used for active states and highlights
- Dark background: `rgba(0,0,0,0.72)` - for topbar gradient

## Troubleshooting

### Search shows "index not found"

- Run:

```bash
npm run index
```

### Total page count looks wrong

- Regenerate index:

```bash
npm run index -- --force
```

### PDF not loading on GitHub Pages

- Ensure `basePath` and `assetPrefix` in `next.config.js` are set to your repo subpath
- Ensure `PDF_URL` in both page files includes the base path prefix
- Check that the PDF file is committed to the repository in `public/pdf/`

### Canvas rendering errors in thumbnails

- This is prevented by the `data-rendered` check in the canvas ref callback
- If errors persist, clear local storage and reload

### Local development not working after GitHub Pages deployment

- Revert the basePath/assetPrefix and PDF_URL changes as documented in "Local Development Configuration"
