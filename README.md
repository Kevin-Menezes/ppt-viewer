# PPT Viewer — Next.js

A sleek, full-screen presentation viewer for Google Slides.

## Setup

```bash
npm install
npm run index
npm run dev
```
## This is to automatically delete and update the index file
```bash
npm run index -- --force
```

Open [http://localhost:3000](http://localhost:3000)

`npm run index` downloads the presentation `.pptx` and generates `public/presentation-index.json` used for:

- Total page count (no hardcoding)
- Fast in-app search (no API keys)

## Features

- 🎬 **Full-screen viewer** — the page fills the entire viewport
- ⬅️ ➡️ **Smooth navigation** — prev/next buttons, keyboard arrows
- ⌨️ **Keyboard shortcuts** — `←/→` to navigate, `F` for fullscreen, `Esc` to exit
- �️ **Page overview** — paginated thumbnail grid to jump to any page
- 🔎 **Search** — search through PPT text via `presentation-index.json` (no API keys)
- 🔖 **Bookmarks** — bookmark pages and jump from bookmark list
- 🕘 **Resume reading** — reopens the last page on return (localStorage)
- ⬇️ **Download** — exports the original `.pptx` file
- 🌑 **Auto-hiding UI** — controls fade out after 3.5s of inactivity
- 🟡 **Loader** — golden spinner shown while pages load

## Documentation

- User flow & functionality: `docs/user-flow.md`

## Configuration

Edit `pages/presentation.js` and `scripts/generate-ppt-index.js` to point to your presentation:

```js
const PRESENTATION_ID = '...';
```

`TOTAL_SLIDES` is only a fallback initial value. The real page count is read from `public/presentation-index.json`.

To regenerate the index after changing the presentation:

```bash
npm run index -- --force
```

## How animations work

Each slide is loaded via Google Slides embed (`?slide=id.pN`). Entry animations
defined in the presentation play automatically when a slide loads. Click-triggered
animations respond to clicks within the slide area (the iframe handles them natively).

## Build for production

```bash
npm run build
```

This project is configured for static export (`output: 'export'`). The static output is generated in `out/`.

## GitHub Pages

- Set `NEXT_PUBLIC_BASE_PATH` to your repo subpath (example: `/ppt-viewer-interface`) when building for Pages.
- Deploy the contents of `out/`.
