import { useEffect, useMemo, useState } from 'react';
import { projectRawUrl } from '../../providers/registry';
import { buildSrcdoc } from '../../runtime/srcdoc';
import type { DeckPlan } from '@pixelpitch/contracts';

export interface DeckAssets {
  themeCSS: string | null;
  frameworkCSS: string | null;
}

interface Props {
  projectId: string;
  plan: DeckPlan;
  slideId: string;
  thumbnail?: boolean;
  sharedAssets?: DeckAssets;
}

export function useDeckAssets(projectId: string): DeckAssets {
  const [assets, setAssets] = useState<DeckAssets>({ themeCSS: null, frameworkCSS: null });

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    async function fetchAsset(path: string): Promise<string | null> {
      try {
        const res = await fetch(projectRawUrl(projectId, path));
        return res.ok ? res.text() : null;
      } catch { return null; }
    }
    Promise.all([
      fetchAsset('deck/theme.css'),
      fetchAsset('deck/framework.css'),
    ]).then(([theme, fwCss]) => {
      if (!cancelled) setAssets({ themeCSS: theme, frameworkCSS: fwCss });
    });
    return () => { cancelled = true; };
  }, [projectId]);

  return assets;
}

export function DeckSlidePreview({ projectId, plan, slideId, thumbnail = false, sharedAssets }: Props) {
  const fallbackAssets = useDeckAssets(sharedAssets ? '' : projectId);
  const { themeCSS, frameworkCSS } = sharedAssets ?? fallbackAssets;
  const [slideHTML, setSlideHTML] = useState<string | null>(null);

  const slide = plan.slides.find((s) => s.id === slideId);
  const slideFile = slide?.file;

  useEffect(() => {
    if (!projectId || !slideFile) return;
    let cancelled = false;
    const url = projectRawUrl(projectId, `deck/${slideFile}`);
    fetch(url)
      .then((r) => (r.ok ? r.text() : null))
      .then((html) => {
        if (!cancelled) setSlideHTML(html);
      })
      .catch(() => {
        if (!cancelled) setSlideHTML(null);
      });
    return () => { cancelled = true; };
  }, [projectId, slideFile]);

  const srcDoc = useMemo(() => {
    if (!slideHTML) return null;

    // The slide fragment is already a <section class="slide">, so render it
    // directly on a fixed 16:9 stage and scale that stage to the iframe.
    const fullDoc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>${frameworkCSS ?? ''}</style>
  <style>${themeCSS ?? ''}</style>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    :root {
      /* Theme/framework compatibility. framework.css references the html-ppt
         token namespace; generated themes usually provide the shorter deck
         namespace (--bg, --fg, --muted, --accent). */
      --deck-preview-scale: 1;
      --slide-width: 1920px;
      --slide-height: 1080px;
      --bg-soft: var(--surface, #f8f9fa);
      --surface-2: color-mix(in srgb, var(--surface, #f8f9fa) 88%, var(--fg, #111111));
      --border-strong: color-mix(in srgb, var(--border, rgba(0,0,0,.08)) 55%, var(--fg, #111111));
      --text-1: var(--fg, #111111);
      --text-2: var(--muted, #666666);
      --text-3: color-mix(in srgb, var(--muted, #666666) 76%, var(--bg, #ffffff));
      --ink: var(--fg, #111111);
      --paper: var(--bg, #ffffff);
      --accent-2: color-mix(in srgb, var(--accent, #034EA2) 68%, #7a5cff);
      --accent-3: color-mix(in srgb, var(--accent, #034EA2) 55%, #ff5c8a);
      --good: var(--success, #17a34a);
      --bad: var(--danger, #dc2626);
      --grad: linear-gradient(135deg, var(--accent, #034EA2), var(--accent-2, #355bc2) 55%, var(--accent-3, #9b4d8f));
      --grad-soft: linear-gradient(135deg, color-mix(in srgb, var(--accent, #034EA2) 10%, var(--bg, #ffffff)), var(--surface, #f8f9fa));
      --radius: 12px;
      --radius-sm: 8px;
      --radius-lg: 18px;
      --shadow: 0 10px 30px rgba(18, 24, 40, .08), 0 2px 6px rgba(18, 24, 40, .04);
      --shadow-lg: 0 24px 60px rgba(18, 24, 40, .14), 0 6px 16px rgba(18, 24, 40, .06);
      --font-sans: var(--deck-font-body, Inter, system-ui, sans-serif);
      --font-serif: Georgia, serif;
      --font-mono: var(--deck-font-mono, "Fira Code", monospace);
      --font-display: var(--deck-font-display, var(--font-sans));
      --letter-tight: -0.02em;
      --letter-normal: 0;
      --ease: cubic-bezier(.4, 0, .2, 1);
    }
    html,
    body {
      width: 100%;
      height: 100%;
      margin: 0;
      overflow: hidden;
      background: var(--bg, var(--deck-bg, #ffffff));
      color: var(--fg, var(--deck-fg, #111111));
      font-family: var(--font-sans);
    }
    body {
      display: grid;
      place-items: center;
    }
    .deck-preview-viewport {
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      display: grid;
      place-items: center;
      background: var(--bg, #ffffff);
    }
    .deck-stage {
      width: 1920px;
      height: 1080px;
      position: relative;
      flex: 0 0 auto;
      overflow: hidden;
      transform: scale(var(--deck-preview-scale));
      transform-origin: center center;
    }
    .deck-stage > .slide {
      position: relative !important;
      inset: auto !important;
      width: var(--slide-width, 1920px) !important;
      height: var(--slide-height, 1080px) !important;
      opacity: 1 !important;
      pointer-events: auto !important;
      transform: none !important;
      z-index: auto !important;
    }
    ${thumbnail ? `.deck-stage { pointer-events: none; }` : ''}
  </style>
  <script>
    (function () {
      function updateScale() {
        var width = Math.max(1, window.innerWidth || document.documentElement.clientWidth || 1);
        var height = Math.max(1, window.innerHeight || document.documentElement.clientHeight || 1);
        var scale = Math.min(width / 1920, height / 1080);
        document.documentElement.style.setProperty('--deck-preview-scale', String(scale));
      }
      window.addEventListener('resize', updateScale);
      if (window.ResizeObserver) {
        new ResizeObserver(updateScale).observe(document.documentElement);
      }
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateScale, { once: true });
      } else {
        updateScale();
      }
    })();
  </script>
</head>
<body>
  <div class="deck-preview-viewport">
    <div class="deck-stage">
      ${slideHTML}
    </div>
  </div>
</body>
</html>`;

    return buildSrcdoc(fullDoc);
  }, [slideHTML, themeCSS, frameworkCSS, slideId, thumbnail]);

  if (!srcDoc) {
    return (
      <div className={thumbnail ? 'deck-slide-thumb-placeholder' : 'deck-slide-preview-placeholder'}>
        {slide?.title ?? 'Loading...'}
      </div>
    );
  }

  return (
    <iframe
      title={`Slide: ${slide?.title ?? slideId}`}
      srcDoc={srcDoc}
      sandbox="allow-scripts"
      className={thumbnail ? 'deck-slide-thumb-iframe' : 'deck-slide-preview-iframe'}
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        ...(thumbnail ? { pointerEvents: 'none' } : {}),
      }}
    />
  );
}
