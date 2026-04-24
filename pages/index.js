import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

const PRESENTATION_NAME = 'bible-stories';
const DOWNLOAD_URL = 'pdf/Bible-Stories.pdf';
const PPT_URL = 'https://1drv.ms/p/c/9da6160325629680/IQCAlmIlAxamIICd1QMAAAAAAXgCGwaUB9WUlii7hB-n4ZE?e=rMw4Wx';

const STORAGE_KEY_PROGRESS = `pdfViewer.progress.${PRESENTATION_NAME}`;

function safeParseJson(value, fallback) {
  try {
    if (!value) return fallback;
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export default function Home() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const allowLanding = router.query?.landing === '1';
    if (allowLanding) return;

    const saved = safeParseJson(
      typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY_PROGRESS) : null,
      null
    );
    const savedPage = Number(saved?.page ?? saved?.slide);
    if (!Number.isFinite(savedPage) || savedPage < 1) return;

    setRedirecting(true);
    router.replace(`/presentation/?page=${savedPage}`);
  }, [router]);

  return (
    <>
      <Head>
        <title>Bible Stories</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' fill='%23080808'/><rect x='6' y='8' width='20' height='16' rx='1' fill='none' stroke='%23c8a96e' stroke-width='1.5'/><line x1='10' y1='12' x2='22' y2='12' stroke='%23c8a96e' stroke-width='1'/><line x1='10' y1='16' x2='18' y2='16' stroke='%23c8a96e' stroke-width='1'/></svg>" />
      </Head>

      {redirecting ? (
        <div className="redirect" />
      ) : (
      <div className="landing">
        <div className="grid-bg" />

        <span className="corner corner--tl" style={{ opacity: mounted ? 1 : 0 }} />
        <span className="corner corner--tr" style={{ opacity: mounted ? 1 : 0 }} />
        <span className="corner corner--bl" style={{ opacity: mounted ? 1 : 0 }} />
        <span className="corner corner--br" style={{ opacity: mounted ? 1 : 0 }} />

        <div className="content">
          <div
            className="eyebrow"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(12px)',
            }}
          >
          
          </div>

          <h1
            className="title"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            }}
          >
            Bible
            <br />
            <em>Stories</em>
          </h1>

          <p
            className="subtitle"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(16px)',
            }}
          >
            When you get to know more about God, you'll begin to love Him even more🤍
          </p>

          <div
            className="actions"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(16px)',
            }}
          >
            <button
              className="btn btn--primary"
              onClick={() => router.push('/presentation/')}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <polygon points="5,2 13,8 5,14" fill="currentColor" />
              </svg>
              Start Bible Stories
            </button>

            <a
              className="btn btn--ghost"
              href={PPT_URL}
              target="_blank"
              rel="noreferrer"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <line x1="8" y1="2" x2="8" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <polyline points="4,7 8,11 12,7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="2" y1="14" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Download PPT
            </a>

            <a
              className="btn btn--ghost"
              href={DOWNLOAD_URL}
              download="Bible Stories.pdf"
              target="_blank"
              rel="noreferrer"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <line x1="8" y1="2" x2="8" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <polyline points="4,7 8,11 12,7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="2" y1="14" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Download PDF
            </a>
          </div>

          <div
            className="footer"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(16px)',
            }}
          >
            Made with 🤍 for God & his people<br />
            Copyright © : 2026+ Kevin Menezes
          </div>
        </div>

        <div
          className="status-bar"
          style={{ opacity: mounted ? 1 : 0 }}
        >

        </div>
      </div>
      )}

      <style jsx>{`
        .redirect {
          position: fixed;
          inset: 0;
          background: var(--black);
        }

        .landing {
          position: relative;
          width: 100vw;
          height: 100vh;
          background: var(--black);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        /* Subtle grid background */
        .grid-bg {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(200, 169, 110, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(200, 169, 110, 0.04) 1px, transparent 1px);
          background-size: 60px 60px;
          mask-image: radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 100%);
        }

        /* Corner decorations */
        .corner {
          position: absolute;
          width: 28px;
          height: 28px;
          border-color: var(--gold);
          border-style: solid;
          transition: opacity 1.2s var(--ease-out);
        }
        .corner--tl { top: 32px; left: 32px; border-width: 1px 0 0 1px; }
        .corner--tr { top: 32px; right: 32px; border-width: 1px 1px 0 0; }
        .corner--bl { bottom: 32px; left: 32px; border-width: 0 0 1px 1px; }
        .corner--br { bottom: 32px; right: 32px; border-width: 0 1px 1px 0; }

        /* Content */
        .content {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0;
          z-index: 1;
        }

        .eyebrow {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 28px;
          transition: opacity 0.8s var(--ease-out), transform 0.8s var(--ease-out);
          transition-delay: 0.1s;
        }
        .eyebrow-line {
          display: block;
          width: 40px;
          height: 1px;
          background: var(--gold);
          opacity: 0.5;
        }
        .eyebrow-text {
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 0.28em;
          color: var(--gold);
          font-weight: 400;
        }

        .title {
          font-family: var(--font-display);
          font-size: clamp(72px, 10vw, 140px);
          font-weight: 300;
          line-height: 0.9;
          letter-spacing: -0.02em;
          color: var(--white);
          margin-bottom: 24px;
          transition: opacity 0.9s var(--ease-out), transform 0.9s var(--ease-out);
          transition-delay: 0.2s;
        }
        .title em {
          font-style: italic;
          color: var(--gold);
          font-weight: 300;
        }

        .subtitle {
          font-family: var(--font-mono);
          font-size: 12px;
          letter-spacing: 0.18em;
          color: #fff;
          margin-bottom: 56px;
          padding: 0 20px;
          transition: opacity 0.9s var(--ease-out), transform 0.9s var(--ease-out);
          transition-delay: 0.3s;
        }

        .actions {
          display: flex;
          gap: 16px;
          align-items: center;
          transition: opacity 0.9s var(--ease-out), transform 0.9s var(--ease-out);
          transition-delay: 0.4s;
          flex-wrap: wrap;
          justify-content: center;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 14px 28px;
          font-family: var(--font-mono);
          font-size: 12px;
          letter-spacing: 0.12em;
          font-weight: 400;
          text-decoration: none;
          border: 1px solid transparent;
          cursor: pointer;
          transition: all 0.25s ease;
          position: relative;
          overflow: hidden;
        }

        .btn--primary {
          background: var(--gold);
          color: var(--black);
          border-color: var(--gold);
        }
        .btn--primary:hover {
          background: transparent;
          color: var(--gold);
        }

        .btn--ghost {
          background: transparent;
          color: var(--white);
          border-color: rgba(240, 237, 232, 0.2);
        }
        .btn--ghost:hover {
          border-color: var(--gold);
          color: var(--gold);
        }

        /* Status bar */
        .status-bar {
          position: absolute;
          bottom: 32px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 0.12em;
          color: var(--text-muted);
          transition: opacity 1.2s var(--ease-out);
          transition-delay: 0.6s;
          white-space: nowrap;
        }

        /* Footer */
        .footer {
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 0.12em;
          color: #888;
          margin-top: 32px;
          padding: 0 20px;
          transition: opacity 1.2s var(--ease-out), transform 1.2s var(--ease-out);
          transition-delay: 0.9s;
          text-align: center;
        }
        .status-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--gold);
          opacity: 0.7;
          animation: pulse 2.4s ease-in-out infinite;
        }
        .status-sep {
          opacity: 0.3;
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 0.2; }
        }

        @media (max-width: 640px) {
          .corner--tl { top: 18px; left: 18px; }
          .corner--tr { top: 18px; right: 18px; }
          .corner--bl { bottom: 18px; left: 18px; }
          .corner--br { bottom: 18px; right: 18px; }

          .btn {
            padding: 12px 18px;
          }

          .subtitle {
            margin-bottom: 36px;
          }
        }
      `}</style>
    </>
  );
}
