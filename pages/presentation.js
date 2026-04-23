import Head from 'next/head';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

const PRESENTATION_NAME = 'bible-stories';
const PDF_URL = '/bible-stories/pdf/Bible-Stories.pdf';
const PPT_URL = 'https://1drv.ms/p/c/9da6160325629680/IQCAlmIlAxamIICd1QMAAAAAAXgCGwaUB9WUlii7hB-n4ZE?e=rMw4Wx';
const TOTAL_PAGES = 154; // will be updated from index

const STORAGE_KEYS = {
  progress: `pdfViewer.progress.${PRESENTATION_NAME}`,
  bookmarks: `pdfViewer.bookmarks.${PRESENTATION_NAME}`,
  totalPages: `pdfViewer.totalPages.${PRESENTATION_NAME}`,
};

function safeParseJson(value, fallback) {
  try {
    if (!value) return fallback;
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeForSearch(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export default function Presentation() {
  const router = useRouter();
  const hideTimerRef = useRef(null);
  const didInitRef = useRef(false);
  const canvasRef = useRef(null);
  const pdfDocRef = useRef(null);

  const [currentSlide, setCurrentSlide] = useState(1);
  const [totalPages, setTotalPages] = useState(TOTAL_PAGES);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [showThumbs, setShowThumbs] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [bookmarks, setBookmarks] = useState([]);
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [rendering, setRendering] = useState(false);

  const [thumbPage, setThumbPage] = useState(1);
  const [thumbQuery, setThumbQuery] = useState('');
  const [searchIndex, setSearchIndex] = useState(null);
  const [searchStatus, setSearchStatus] = useState('idle');
  const [searchError, setSearchError] = useState('');

  const bookmarkSet = useMemo(() => new Set(bookmarks), [bookmarks]);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    try {
      const savedCount = Number(window.localStorage.getItem(STORAGE_KEYS.totalPages));
      if (Number.isFinite(savedCount) && savedCount > 0) setTotalPages(savedCount);
    } catch {
    }
  }, []);

  // Load PDF document
  useEffect(() => {
    if (!mounted) return;

    const loadPDF = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument(PDF_URL);
        const pdf = await loadingTask.promise;
        pdfDocRef.current = pdf;
        setTotalPages(pdf.numPages);
        setPdfLoaded(true);
        try {
          window.localStorage.setItem(STORAGE_KEYS.totalPages, String(pdf.numPages));
        } catch {
        }
      } catch (error) {
        console.error('Error loading PDF:', error);
      }
    };

    loadPDF();
  }, [mounted]);

  // Render current page
  useEffect(() => {
    if (!pdfLoaded || !pdfDocRef.current || !canvasRef.current || rendering) return;

    const renderPage = async () => {
      setRendering(true);
      try {
        const pdf = pdfDocRef.current;
        const page = await pdf.getPage(currentSlide);
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        const viewport = page.getViewport({ scale: 1.5 });
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;
      } catch (error) {
        console.error('Error rendering page:', error);
      } finally {
        setRendering(false);
      }
    };

    renderPage();
  }, [pdfLoaded, currentSlide, rendering]);

  useEffect(() => {
    const controller = new AbortController();
    setSearchStatus('loading');
    setSearchError('');

    (async () => {
      try {
        const url = `${router.basePath || ''}/presentation-index.json`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) {
          setSearchStatus('error');
          setSearchError('Search index not found. Run: npm run index');
          return;
        }
        const data = await res.json();
        const count = Number(data?.totalPages);
        const idx = Array.isArray(data?.index) ? data.index : null;

        if (Number.isFinite(count) && count > 0) {
          setTotalPages(count);
          try {
            window.localStorage.setItem(STORAGE_KEYS.totalPages, String(count));
          } catch {
          }
        }

        if (idx) {
          setSearchIndex(
            idx
              .map((s) => normalizeForSearch(typeof s === 'string' ? s : ''))
              .slice(0, Math.max(count || 0, idx.length))
          );
          setSearchStatus('ready');
          setSearchError('');
        } else {
          setSearchStatus('error');
          setSearchError('Search index invalid. Run: npm run index');
        }
      } catch {
        setSearchStatus('error');
        setSearchError('Search index not available.');
      }
    })();

    return () => controller.abort();
  }, [router.basePath]);

  useEffect(() => {
    if (!router.isReady) return;
    if (didInitRef.current) return;
    didInitRef.current = true;

    const fromQueryRaw = router.query?.page ?? router.query?.slide;
    const fromQuery = Array.isArray(fromQueryRaw) ? fromQueryRaw[0] : fromQueryRaw;
    const queryPage = Number(fromQuery);

    let initialPage = 1;
    if (Number.isFinite(queryPage) && queryPage >= 1) {
      initialPage = Math.max(1, Math.min(totalPages, queryPage));
    } else {
      const saved = safeParseJson(window.localStorage.getItem(STORAGE_KEYS.progress), null);
      const savedPage = Number(saved?.page ?? saved?.slide);
      if (Number.isFinite(savedPage) && savedPage >= 1) {
        initialPage = Math.max(1, Math.min(totalPages, savedPage));
      }
    }

    const savedBookmarks = safeParseJson(window.localStorage.getItem(STORAGE_KEYS.bookmarks), []);
    if (Array.isArray(savedBookmarks)) {
      const normalized = savedBookmarks
        .map((n) => Number(n))
        .filter((n) => Number.isFinite(n) && n >= 1 && n <= totalPages);
      const uniqueSorted = Array.from(new Set(normalized)).sort((a, b) => a - b);
      setBookmarks(uniqueSorted);
    }

    if (initialPage !== 1) {
      setCurrentSlide(initialPage);
    }
  }, [router.isReady, router.query, totalPages]);

  /* ── Page navigation ── */
  const goToPage = useCallback(
    (n) => {
      const target = Math.max(1, Math.min(totalPages, n));
      if (target === currentSlide) return;
      setCurrentSlide(target);
    },
    [currentSlide, totalPages]
  );

  const prev = useCallback(() => goToPage(currentSlide - 1), [currentSlide, goToPage]);
  const next = useCallback(() => goToPage(currentSlide + 1), [currentSlide, goToPage]);

  /* ── Auto-hide controls on idle ── */
  const showControls = useCallback(() => {
    setControlsVisible(true);
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setControlsVisible(false), 3500);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', showControls);
    window.addEventListener('touchstart', showControls);
    showControls();
    return () => {
      window.removeEventListener('mousemove', showControls);
      window.removeEventListener('touchstart', showControls);
      clearTimeout(hideTimerRef.current);
    };
  }, [showControls]);

  /* ── Fullscreen ── */
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  const toggleBookmark = useCallback(() => {
    setBookmarks((prevList) => {
      const has = prevList.includes(currentSlide);
      const nextList = has
        ? prevList.filter((n) => n !== currentSlide)
        : [...prevList, currentSlide].sort((a, b) => a - b);

      try {
        window.localStorage.setItem(STORAGE_KEYS.bookmarks, JSON.stringify(nextList));
      } catch {
      }

      return nextList;
    });
  }, [currentSlide]);

  const isBookmarked = bookmarks.includes(currentSlide);

  useEffect(() => {
    if (!showThumbs) return;
    const perPage = 24;
    const initialThumbPage = Math.floor((currentSlide - 1) / perPage) + 1;
    setThumbPage(initialThumbPage);
  }, [currentSlide, showThumbs]);

  useEffect(() => {
    if (!showThumbs) return;
    const q = thumbQuery.trim();
    if (q.length < 2) {
      setSearchStatus('idle');
      setSearchError('');
      return;
    }

    if (searchIndex) {
      setSearchStatus('ready');
      return;
    }

    setSearchStatus('error');
    setSearchError('Search index not found. Run: npm run index');
  }, [searchIndex, showThumbs, thumbQuery]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEYS.progress,
        JSON.stringify({ page: currentSlide, at: Date.now() })
      );
    } catch {
    }
  }, [currentSlide]);

  const progress = ((currentSlide - 1) / Math.max(totalPages - 1, 1)) * 100;

  const thumbsPerPage = 24;
  const totalThumbPages = Math.max(1, Math.ceil(totalPages / thumbsPerPage));
  const safeThumbPage = Math.max(1, Math.min(totalThumbPages, thumbPage));
  const thumbStart = (safeThumbPage - 1) * thumbsPerPage + 1;
  const thumbEnd = Math.min(totalPages, thumbStart + thumbsPerPage - 1);

  const isSearching = showThumbs && thumbQuery.trim().length >= 2;
  const searchMeta = useMemo(() => {
    if (!isSearching) return { hits: [], total: 0 };
    if (!searchIndex) return { hits: [], total: 0 };
    const tokens = normalizeForSearch(thumbQuery)
      .split(' ')
      .filter((t) => t && t.length >= 2);
    if (tokens.length === 0) return { hits: [], total: 0 };

    const MAX_HITS = 80;
    const hits = [];
    let total = 0;

    for (let i = 0; i < searchIndex.length; i++) {
      const hay = searchIndex[i] || '';
      let ok = true;
      for (let t = 0; t < tokens.length; t++) {
        if (!hay.includes(tokens[t])) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;

      total++;
      if (hits.length < MAX_HITS) hits.push(i + 1);
    }

    return { hits, total };
  }, [isSearching, searchIndex, thumbQuery]);

  const searchResults = searchMeta.hits;
  const searchTotal = searchMeta.total;
  const MAX_RENDER_THUMBS = 36;
  const searchThumbs = useMemo(
    () => (isSearching ? searchResults.slice(0, MAX_RENDER_THUMBS) : []),
    [isSearching, searchResults]
  );

  return (
    <>
      <Head>
        <title>{`Bible Stories : Page ${currentSlide} of ${totalPages}`}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' fill='%23080808'/><path d='M16 9c-3-2-7-2-10-1v15c3-1 7-1 10 1' fill='none' stroke='%23c8a96e' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/><path d='M16 9c3-2 7-2 10-1v15c-3-1-7-1-10 1' fill='none' stroke='%23c8a96e' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/><line x1='16' y1='9' x2='16' y2='24' stroke='%23c8a96e' stroke-width='1.2' opacity='0.7'/></svg>"
        />
      </Head>

      <div
        className={`viewer ${mounted ? 'mounted' : ''}`}
        onMouseMove={showControls}
      >
        <div className="pdf-viewer-container">
          {!pdfLoaded ? (
            <div className="loader">
              <span className="spinner" />
            </div>
          ) : (
            <canvas ref={canvasRef} className="pdf-canvas" />
          )}
        </div>

        <div className={`topbar ${controlsVisible ? 'visible' : ''}`}>
          <button className="icon-btn" onClick={prev} title="Previous page">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <polyline points="11,4 6,9 11,14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Back</span>
          </button>

          <div className="topbar-title">
            <span className="slide-counter">
              {String(currentSlide).padStart(2, '0')}
              <span className="sep"> / </span>
              {String(totalPages).padStart(2, '0')}
            </span>
          </div>

          <div className="topbar-actions">
            <button
              className="icon-btn"
              onClick={() => setShowThumbs((v) => !v)}
              title="Page overview"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect x="2" y="2" width="6" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
                <rect x="10" y="2" width="6" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
                <rect x="2" y="11" width="6" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
                <rect x="10" y="11" width="6" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
              </svg>
            </button>

            <button
              className={`icon-btn ${isBookmarked ? 'is-active' : ''}`}
              onClick={toggleBookmark}
              title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                  d="M5 3.2h8c.55 0 1 .45 1 1V15l-5-2.6L4 15V4.2c0-.55.45-1 1-1Z"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                  fill={isBookmarked ? 'currentColor' : 'none'}
                  opacity={isBookmarked ? 0.9 : 1}
                />
              </svg>
            </button>

            <button
              className="icon-btn"
              onClick={() => setShowBookmarks((v) => !v)}
              title="Bookmarks"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                  d="M4.5 4.5h9M4.5 8h9M4.5 11.5h6.2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <button className="icon-btn" onClick={toggleFullscreen} title="Fullscreen">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M3 7V3h4M11 3h4v4M15 11v4h-4M7 15H3v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>

        <div className={`controls ${controlsVisible ? 'visible' : ''}`}>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>

          <div className="nav-row">
            <button
              className={`nav-btn ${currentSlide === 1 ? 'disabled' : ''}`}
              onClick={prev}
              disabled={currentSlide === 1}
              title="Previous (←)"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <polyline points="13,4 7,10 13,16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Prev</span>
            </button>

            <div className="dots">
              {Array.from({ length: Math.min(totalPages, 9) }).map((_, i) => {
                const half = 4;
                let pageIndex;
                if (totalPages <= 9) {
                  pageIndex = i + 1;
                } else {
                  let start = Math.max(1, Math.min(currentSlide - half, totalPages - 8));
                  pageIndex = start + i;
                }
                const isActive = pageIndex === currentSlide;
                return (
                  <button
                    key={pageIndex}
                    className={`dot ${isActive ? 'active' : ''}`}
                    onClick={() => goToPage(pageIndex)}
                    title={`Page ${pageIndex}`}
                  />
                );
              })}
            </div>

            <button
              className={`nav-btn ${currentSlide === totalPages ? 'disabled' : ''}`}
              onClick={next}
              disabled={currentSlide === totalPages}
              title="Next (→)"
            >
              <span>Next</span>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <polyline points="7,4 13,10 7,16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>

        {showThumbs && (
          <div className="thumb-panel" onClick={() => setShowThumbs(false)}>
            <div className="thumb-grid" onClick={(e) => e.stopPropagation()}>
              <div className="thumb-header">
                <span>All Pages</span>
                <div className="thumb-header-actions">
                  <a
                    className="icon-btn"
                    href={PPT_URL}
                    target="_blank"
                    rel="noreferrer"
                    title="Download PPT"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <line x1="8" y1="2" x2="8" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <polyline points="4,7 8,11 12,7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <line x1="2" y1="14" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    <span>PPT</span>
                  </a>
                  <a
                    className="icon-btn"
                    href={PDF_URL}
                    download="Bible Stories.pdf"
                    target="_blank"
                    rel="noreferrer"
                    title="Download PDF"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <line x1="8" y1="2" x2="8" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <polyline points="4,7 8,11 12,7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <line x1="2" y1="14" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    <span>PDF</span>
                  </a>

                  <button className="icon-btn" onClick={() => setShowThumbs(false)} title="Close">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <line x1="3" y1="3" x2="13" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <line x1="13" y1="3" x2="3" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="thumb-tools">
                <div className="thumb-search">
                  <input
                    value={thumbQuery}
                    onChange={(e) => setThumbQuery(e.target.value)}
                    placeholder="Search pages..."
                    spellCheck={false}
                  />
                  {thumbQuery ? (
                    <button
                      className="thumb-clear"
                      onClick={() => {
                        setThumbQuery('');
                        setSearchStatus('idle');
                        setSearchError('');
                      }}
                      title="Clear"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <line x1="3" y1="3" x2="11" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        <line x1="11" y1="3" x2="3" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </button>
                  ) : null}
                </div>

                {!isSearching && (
                  <div className="thumb-pager">
                    <button
                      className={`thumb-page-btn ${safeThumbPage === 1 ? 'disabled' : ''}`}
                      onClick={() => setThumbPage((p) => Math.max(1, p - 1))}
                      disabled={safeThumbPage === 1}
                      title="Previous"
                    >
                      Prev
                    </button>
                    <span className="thumb-page-label">
                      {safeThumbPage} / {totalThumbPages}
                    </span>
                    <button
                      className={`thumb-page-btn ${safeThumbPage === totalThumbPages ? 'disabled' : ''}`}
                      onClick={() => setThumbPage((p) => Math.min(totalThumbPages, p + 1))}
                      disabled={safeThumbPage === totalThumbPages}
                      title="Next"
                    >
                      Next
                    </button>
                  </div>
                )}

                {isSearching && searchStatus === 'ready' && (
                  <div className="thumb-page-label">Results: {searchTotal}</div>
                )}
              </div>

              <div className="thumb-list">
                {isSearching ? (
                  searchStatus === 'loading' ? (
                    <div className="thumb-hint" role="status" aria-label="Loading">
                      <span className="thumb-spinner" />
                    </div>
                  ) : searchStatus === 'error' ? (
                    <div className="thumb-hint">{searchError || 'Search unavailable.'}</div>
                  ) : searchResults.length === 0 ? (
                    <div className="thumb-hint">No results.</div>
                  ) : (
                    searchThumbs.map((n) => {
                      const marked = bookmarkSet.has(n);
                      return (
                        <button
                          key={n}
                          className={`thumb-item ${n === currentSlide ? 'active' : ''} ${marked ? 'bookmarked' : ''}`}
                          onClick={() => {
                            goToPage(n);
                            setShowThumbs(false);
                          }}
                        >
                          <div className="thumb-preview">
                            {marked ? (
                              <span className="thumb-bookmark" title="Bookmarked">
                                <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
                                  <path
                                    d="M5 3.2h8c.55 0 1 .45 1 1V15l-5-2.6L4 15V4.2c0-.55.45-1 1-1Z"
                                    fill="currentColor"
                                    opacity="0.9"
                                  />
                                </svg>
                              </span>
                            ) : null}
                            <canvas
                              ref={(el) => {
                                if (el && pdfDocRef.current && !el.dataset.rendered) {
                                  el.dataset.rendered = 'true';
                                  pdfDocRef.current.getPage(n).then((page) => {
                                    const viewport = page.getViewport({ scale: 0.3 });
                                    el.height = viewport.height;
                                    el.width = viewport.width;
                                    page.render({
                                      canvasContext: el.getContext('2d'),
                                      viewport: viewport,
                                    });
                                  });
                                }
                              }}
                              className="thumb-canvas"
                            />
                          </div>
                          <span className="thumb-num">{String(n).padStart(2, '0')}</span>
                        </button>
                      );
                    })
                  )
                ) : (
                  Array.from({ length: Math.max(0, thumbEnd - thumbStart + 1) }).map((_, i) => {
                    const n = thumbStart + i;
                    const marked = bookmarkSet.has(n);
                    return (
                      <button
                        key={n}
                        className={`thumb-item ${n === currentSlide ? 'active' : ''} ${marked ? 'bookmarked' : ''}`}
                        onClick={() => {
                          goToPage(n);
                          setShowThumbs(false);
                        }}
                      >
                        <div className="thumb-preview">
                          {marked ? (
                            <span className="thumb-bookmark" title="Bookmarked">
                              <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
                                <path
                                  d="M5 3.2h8c.55 0 1 .45 1 1V15l-5-2.6L4 15V4.2c0-.55.45-1 1-1Z"
                                  fill="currentColor"
                                  opacity="0.9"
                                />
                              </svg>
                            </span>
                          ) : null}
                          <canvas
                            ref={(el) => {
                              if (el && pdfDocRef.current && !el.dataset.rendered) {
                                el.dataset.rendered = 'true';
                                pdfDocRef.current.getPage(n).then((page) => {
                                  const viewport = page.getViewport({ scale: 0.3 });
                                  el.height = viewport.height;
                                  el.width = viewport.width;
                                  page.render({
                                    canvasContext: el.getContext('2d'),
                                    viewport: viewport,
                                  });
                                });
                              }
                            }}
                            className="thumb-canvas"
                          />
                        </div>
                        <span className="thumb-num">{String(n).padStart(2, '0')}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {showBookmarks && (
          <div className="bookmark-panel" onClick={() => setShowBookmarks(false)}>
            <div className="bookmark-card" onClick={(e) => e.stopPropagation()}>
              <div className="bookmark-header">
                <span>Bookmarks</span>
                <div className="bookmark-header-actions">
                  <a
                    className="icon-btn"
                    href={PPT_URL}
                    target="_blank"
                    rel="noreferrer"
                    title="Download PPT"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <line x1="8" y1="2" x2="8" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <polyline points="4,7 8,11 12,7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <line x1="2" y1="14" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    <span>PPT</span>
                  </a>
                  <a
                    className="icon-btn"
                    href={PDF_URL}
                    download="Bible Stories.pdf"
                    target="_blank"
                    rel="noreferrer"
                    title="Download PDF"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <line x1="8" y1="2" x2="8" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <polyline points="4,7 8,11 12,7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <line x1="2" y1="14" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    <span>PDF</span>
                  </a>
                  <button className="icon-btn" onClick={() => setShowBookmarks(false)}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <line x1="3" y1="3" x2="13" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <line x1="13" y1="3" x2="3" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </div>
              {bookmarks.length === 0 ? (
                <div className="bookmark-empty">No bookmarks yet.</div>
              ) : (
                <div className="bookmark-grid">
                  {bookmarks.map((n) => (
                    <button
                      key={n}
                      className={`thumb-item ${n === currentSlide ? 'active' : ''} bookmarked`}
                      onClick={() => {
                        goToPage(n);
                        setShowBookmarks(false);
                      }}
                      title={`Go to page ${n}`}
                    >
                      <div className="thumb-preview">
                        <button
                          className="bookmark-thumb-remove"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setBookmarks((prev) => {
                              const nextList = prev.filter((x) => x !== n);
                              try {
                                window.localStorage.setItem(STORAGE_KEYS.bookmarks, JSON.stringify(nextList));
                              } catch {
                              }
                              return nextList;
                            });
                          }}
                          title="Remove"
                        >
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                            <line x1="3" y1="3" x2="11" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            <line x1="11" y1="3" x2="3" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        </button>
                        <canvas
                          ref={(el) => {
                            if (el && pdfDocRef.current && !el.dataset.rendered) {
                              el.dataset.rendered = 'true';
                              pdfDocRef.current.getPage(n).then((page) => {
                                const viewport = page.getViewport({ scale: 0.3 });
                                el.height = viewport.height;
                                el.width = viewport.width;
                                page.render({
                                  canvasContext: el.getContext('2d'),
                                  viewport: viewport,
                                });
                              });
                            }
                          }}
                          className="bookmark-thumb-canvas"
                        />
                      </div>
                      <span className="thumb-num">{String(n).padStart(2, '0')}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .viewer {
          position: fixed;
          inset: 0;
          background: #000;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          cursor: none;
        }
        .viewer.mounted {
          cursor: default;
        }

        /* ── PDF Viewer ── */
        .pdf-viewer-container {
          position: absolute;
          inset: 0;
          z-index: 1;
          background: #000;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: auto;
        }

        .pdf-canvas {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          image-rendering: -webkit-optimize-contrast;
          image-rendering: crisp-edges;
          image-rendering: pixelated;
        }

        .loader {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 11;
          pointer-events: none;
          background: #000;
        }

        .spinner {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          border: 2px solid rgba(200, 169, 110, 0.25);
          border-top-color: var(--gold);
          box-shadow: 0 0 0 1px rgba(200, 169, 110, 0.06);
          animation: spin 0.75s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* ── Click zones ── */
        .zone {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 12%;
          z-index: 8;
          cursor: pointer;
          pointer-events: all;
          transition: background 0.2s ease, opacity 0.3s ease;
        }
        .zone--left {
          left: 0;
          background: linear-gradient(90deg, rgba(0,0,0,0.18) 0%, transparent 100%);
        }
        .zone--right {
          right: 0;
          background: linear-gradient(270deg, rgba(0,0,0,0.18) 0%, transparent 100%);
        }
        .zone:hover {
          background: linear-gradient(90deg, rgba(200,169,110,0.06) 0%, transparent 100%);
        }
        .zone--right:hover {
          background: linear-gradient(270deg, rgba(200,169,110,0.06) 0%, transparent 100%);
        }

        /* ── Topbar ── */
        .topbar {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          background: linear-gradient(180deg, rgba(0,0,0,0.72) 0%, transparent 100%);
          z-index: 10;
          opacity: 0;
          transform: translateY(-8px);
          transition: opacity 0.3s ease, transform 0.3s ease;
          pointer-events: none;
        }
        .topbar.visible {
          opacity: 1;
          transform: translateY(0);
          pointer-events: all;
        }

        .topbar-title {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
        }
        .slide-counter {
          font-family: var(--font-mono);
          font-size: 12px;
          letter-spacing: 0.1em;
          color: var(--gold);
        }
        .slide-counter .sep {
          color: var(--gold);
          opacity: 0.6;
        }

        .topbar-actions {
          display: flex;
          gap: 4px;
        }

        /* ── Bottom controls ── */
        .controls {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 10;
          opacity: 0;
          transform: translateY(8px);
          transition: opacity 0.3s ease, transform 0.3s ease;
          pointer-events: none;
          background: linear-gradient(0deg, rgba(0,0,0,0.75) 0%, transparent 100%);
          padding-top: 32px;
        }
        .controls.visible {
          opacity: 1;
          transform: translateY(0);
          pointer-events: all;
        }

        /* Progress bar */
        .progress-track {
          height: 2px;
          background: rgba(255,255,255,0.08);
          margin: 0 20px 16px;
          border-radius: 1px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: var(--gold);
          border-radius: 1px;
          transition: width 0.35s var(--ease-out);
        }

        /* Nav row */
        .nav-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 24px;
          padding-bottom: 20px;
        }

        .nav-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 20px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          color: var(--white);
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.1em;
          cursor: pointer;
          transition: all 0.2s ease;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        .nav-btn:hover:not(.disabled) {
          background: rgba(200, 169, 110, 0.14);
          border-color: var(--gold);
          color: var(--gold);
        }
        .nav-btn.disabled {
          opacity: 0.25;
          cursor: default;
        }

        /* Slide dots */
        .dots {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--gold);
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          padding: 0;
        }
        .dot:hover {
          background: rgba(200, 169, 110, 0.6);
          transform: scale(1.3);
        }
        .dot.active {
          background: #fff;
          transform: scale(1.4);
        }

        /* ── Icon button ── */
        :global(.icon-btn) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 0 10px;
          height: 36px;
          background: transparent;
          border: none;
          color: var(--gold);
          cursor: pointer;
          transition: color 0.2s ease, background 0.2s ease;
          border-radius: 4px;
          text-decoration: none;
          font-size: 11px;
          font-family: var(--font-mono);
          letter-spacing: 0.05em;
        }
        :global(.icon-btn:hover) {
          color: #fff;
          background: rgba(200, 169, 110, 0.08);
        }

        :global(.icon-btn.is-active) {
          color: #fff;
        }

        :global(.icon-btn span) {
          display: inline;
        }

        /* ── Thumbnail panel ── */
        .thumb-panel {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.82);
          z-index: 20;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          animation: fadein 0.22s ease;
        }

        @keyframes fadein {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .thumb-grid {
          width: min(90vw, 960px);
          max-height: 80vh;
          background: rgba(12, 12, 12, 0.95);
          border: 1px solid rgba(200, 169, 110, 0.12);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .thumb-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid rgba(200, 169, 110, 0.1);
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.14em;
          color: var(--text-muted);
          flex-shrink: 0;
        }

        .thumb-header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .thumb-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 12px;
          padding: 16px 20px 20px;
          overflow-y: auto;
        }

        .thumb-tools {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }

        .thumb-search {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 160px;
        }

        .thumb-search input {
          width: 100%;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(240, 237, 232, 0.8);
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.08em;
          padding: 10px 10px;
          outline: none;
        }

        .thumb-search input:focus {
          border-color: rgba(200, 169, 110, 0.35);
        }

        .thumb-clear {
          width: 32px;
          height: 32px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(240, 237, 232, 0.45);
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .thumb-clear:hover {
          border-color: rgba(200, 169, 110, 0.35);
          color: var(--gold);
          background: rgba(200, 169, 110, 0.05);
        }

        .thumb-pager {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        .thumb-page-btn {
          padding: 8px 10px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(240, 237, 232, 0.7);
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 0.1em;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .thumb-page-btn:hover:not(.disabled) {
          border-color: rgba(200, 169, 110, 0.35);
          color: var(--gold);
          background: rgba(200, 169, 110, 0.05);
        }

        .thumb-page-btn.disabled {
          opacity: 0.25;
          cursor: default;
        }

        .thumb-page-label {
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 0.12em;
          color: rgba(240, 237, 232, 0.45);
          white-space: nowrap;
        }

        .thumb-results {
          grid-column: 1 / -1;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .thumb-hint {
          grid-column: 1 / -1;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.08em;
          color: rgba(240, 237, 232, 0.45);
          padding: 10px 4px;
        }

        .thumb-spinner {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: 2px solid rgba(200, 169, 110, 0.22);
          border-top-color: var(--gold);
          display: inline-block;
          animation: spin 0.75s linear infinite;
        }

        .thumb-result {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(240, 237, 232, 0.72);
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.1em;
          padding: 10px 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .thumb-result:hover {
          border-color: rgba(200, 169, 110, 0.35);
          color: var(--gold);
          background: rgba(200, 169, 110, 0.05);
        }

        .thumb-result.active {
          border-color: var(--gold);
        }

        .thumb-result-mark {
          color: var(--gold);
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .thumb-item {
          display: flex;
          flex-direction: column;
          gap: 7px;
          align-items: center;
          background: transparent;
          border: 1px solid var(--gold);
          cursor: pointer;
          padding: 6px 6px 10px;
          transition: border-color 0.2s ease, background 0.2s ease;
        }
        .thumb-item:hover {
          border-color: rgba(200, 169, 110, 0.35);
          background: rgba(200, 169, 110, 0.04);
        }
        .thumb-item.active {
          border-color: #fff;
        }

        .thumb-item.bookmarked {
          border-color: rgba(200, 169, 110, 0.35);
        }

        .thumb-preview {
          width: 100%;
          aspect-ratio: 16/9;
          overflow: hidden;
          background: #111;
          position: relative;
        }

        .thumb-placeholder {
          width: 100%;
          aspect-ratio: 16/9;
          background: rgba(255,255,255,0.04);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          color: var(--text-muted);
          border-radius: 3px;
          transform: scale(0.294);
          transform-origin: top left;
          pointer-events: none;
          border: none;
        }

        .bookmark-thumb-canvas {
          width: 100%;
          aspect-ratio: 16/9;
          object-fit: contain;
          border-radius: 3px;
        }

        .thumb-canvas {
          width: 100%;
          aspect-ratio: 16/9;
          object-fit: contain;
          border-radius: 3px;
        }

        .thumb-bookmark {
          position: absolute;
          top: 6px;
          right: 6px;
          z-index: 2;
          width: 22px;
          height: 22px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          background: rgba(0,0,0,0.55);
          color: var(--gold);
          border: 1px solid rgba(200, 169, 110, 0.25);
        }
        .thumb-preview iframe {
          position: absolute;
          top: 0;
          left: 0;
          width: 340%;
          height: 340%;
          transform: scale(0.294);
          transform-origin: top left;
          pointer-events: none;
          border: none;
        }

        .thumb-num {
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 0.1em;
          color: var(--gold);
        }
        .thumb-item.active .thumb-num {
          color: #fff;
        }

        .bookmark-panel {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.72);
          z-index: 30;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          animation: fadein 0.22s ease;
        }

        .bookmark-card {
          width: min(92vw, 980px);
          max-height: 80vh;
          background: rgba(12, 12, 12, 0.95);
          border: 1px solid rgba(200, 169, 110, 0.12);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .bookmark-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px;
          border-bottom: 1px solid rgba(200, 169, 110, 0.1);
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.14em;
          color: var(--text-muted);
          flex-shrink: 0;
        }

        .bookmark-header-actions {
          display: flex;
          gap: 4px;
        }

        .bookmark-empty {
          padding: 18px;
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.08em;
          color: rgba(240, 237, 232, 0.45);
        }

        .bookmark-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 12px;
          padding: 16px 20px 20px;
          overflow-y: auto;
        }

        .bookmark-thumb-remove {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 26px;
          height: 26px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          background: rgba(0,0,0,0.55);
          border: 1px solid rgba(255,255,255,0.12);
          color: rgba(240, 237, 232, 0.6);
          cursor: pointer;
          transition: all 0.2s ease;
          z-index: 2;
        }

        .bookmark-thumb-remove:hover {
          border-color: rgba(200, 169, 110, 0.35);
          color: var(--gold);
          background: rgba(0,0,0,0.75);
        }

        @media (max-width: 640px) {
          .zone {
            width: 18%;
            display: none;
          }

          .topbar {
            padding: 0 12px;
            height: 52px;
          }

          :global(.icon-btn) {
            width: 32px;
            height: 32px;
          }

          .controls {
            padding-top: 26px;
          }

          .progress-track {
            margin: 0 12px 12px;
          }

          .nav-row {
            gap: 14px;
            padding-bottom: 14px;
          }

          .nav-btn {
            padding: 9px 14px;
          }

          .nav-btn span {
            display: none;
          }

          .thumb-grid {
            width: 94vw;
            max-height: 84vh;
          }

          .thumb-list {
            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
            padding: 14px;
          }

          .thumb-tools {
            padding: 10px 14px;
            flex-direction: column;
            align-items: stretch;
          }

          .thumb-pager {
            justify-content: space-between;
          }
        }

        @media (max-width: 360px) {
          .slide-counter {
            font-size: 11px;
          }
        }
      `}</style>
    </>
  );
}
