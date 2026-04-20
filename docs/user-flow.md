# PPT Viewer Interface — User Flow & Functionality

## Overview

This project is a responsive, lightweight presentation “reader” built with Next.js and a Google Slides embed (iframe). It adds “book reader” features like resume reading, bookmarks, a paginated page overview, and simple search without any runtime API keys.

Key goals:

- No Google Slides API key usage
- Works as a static export (GitHub Pages compatible)
- Smooth page transitions with a minimal loader

## Pages

### 1) Landing page (`/`)

What you see:

- Title/branding
- Primary action to open the reader
- Download button for the `.pptx`

Auto-resume behavior:

- If a last-read page exists in local storage and you did not explicitly request the landing page, the app redirects to that page in the reader.

How to force the landing page:

- Open `/?landing=1`

### 2) Reader / Viewer (`/presentation`)

What the viewer does:

- Displays the current page using the Google Slides embed URL in an iframe
- Shows navigation controls and reading progress
- Supports keyboard navigation and fullscreen
- Shows a golden spinner while a page is loading

Deep link behavior:

- You can open a specific page via:
  - `/presentation?page=12`
- Backward compatibility is kept for:
  - `/presentation?slide=12`

## Navigation & Reading

### Prev / Next

- Use Prev/Next buttons to move between pages.
- Navigation is guarded during transitions to avoid double-triggering.

### Click zones

- Invisible left/right side click zones can be used to go to previous/next page.

### Keyboard shortcuts

- `←` / `→`: previous / next page
- `F`: fullscreen
- `Esc`: exit fullscreen / close overlays

### Loading states (golden loader)

- When moving to a new page, the app sets a transition state.
- While the iframe is loading the next page, a centered golden circular spinner is shown.
- When the iframe fires `onLoad`, the transition state ends and the loader disappears.

## Page Overview (Thumbnails)

How to use:

- Open “All Pages” / overview from the top bar.
- A grid of page previews is shown.

Performance behavior:

- The overview is paginated to stay fast for large presentations (300+ pages).
- Only a subset of thumbnails are rendered per overview page.

Bookmark indicators:

- Pages that are bookmarked show a bookmark icon.
- Bookmarked pages are visually highlighted.

## Search

Where search lives:

- Search is available inside the Page Overview.

How search works (no API keys):

- Search does not call Google APIs.
- Instead, it searches a build-time generated local index file:
  - `public/presentation-index.json`

Matching behavior:

- Search runs on the extracted text for each page.
- Search results provide a list of matching page numbers.
- Clicking a result jumps to that page.

If search index is missing:

- The UI will show an error that the index isn’t available.
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

## Resume reading

How it works:

- The viewer saves your current page into local storage as you read.
- When you come back later, the landing page will redirect you to your last-read page (unless `?landing=1` is used).

## Persistence (Local Storage)

The app stores data per presentation id:

- Progress:
  - Key: `pptViewer.progress.<PRESENTATION_ID>`
  - Value: `{ page, at }`
- Bookmarks:
  - Key: `pptViewer.bookmarks.<PRESENTATION_ID>`
  - Value: `[pageNumber, ...]`
- Cached total pages:
  - Key: `pptViewer.totalPages.<PRESENTATION_ID>`
  - Value: `number`

## Build-time Index Generation (page count + search)

### What it generates

- File: `public/presentation-index.json`
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

## Static export / GitHub Pages

- The project is configured for static export (`output: 'export'`).
- Build output is written to `out/`.

Base path:

- If deploying under a repo subpath on GitHub Pages, set `NEXT_PUBLIC_BASE_PATH` during build so assets and the index JSON resolve correctly.

Example:

- Repo: `https://username.github.io/ppt-viewer-interface/`
- Base path: `/ppt-viewer-interface`

## Troubleshooting

### Search shows “index not found”

- Run:

```bash
npm run index
```

### Total page count looks wrong

- Regenerate index:

```bash
npm run index -- --force
```
