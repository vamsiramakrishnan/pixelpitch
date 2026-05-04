import { useEffect, useMemo, useState } from 'react';
import { projectRawUrl } from '../../providers/registry';
import { buildSrcdoc } from '../../runtime/srcdoc';
import type { DeckPlan } from '@pixelpitch/contracts';

export interface DeckAssets {
  themeCSS: string | null;
  frameworkCSS: string | null;
  frameworkJS: string | null;
}

interface Props {
  projectId: string;
  plan: DeckPlan;
  slideId: string;
  thumbnail?: boolean;
  sharedAssets?: DeckAssets;
}

export function useDeckAssets(projectId: string): DeckAssets {
  const [assets, setAssets] = useState<DeckAssets>({ themeCSS: null, frameworkCSS: null, frameworkJS: null });

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
      fetchAsset('deck/framework.js'),
    ]).then(([theme, fwCss, fwJs]) => {
      if (!cancelled) setAssets({ themeCSS: theme, frameworkCSS: fwCss, frameworkJS: fwJs });
    });
    return () => { cancelled = true; };
  }, [projectId]);

  return assets;
}

export function DeckSlidePreview({ projectId, plan, slideId, thumbnail = false, sharedAssets }: Props) {
  const fallbackAssets = useDeckAssets(sharedAssets ? '' : projectId);
  const { themeCSS, frameworkCSS, frameworkJS } = sharedAssets ?? fallbackAssets;
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

    // The slide fragment is already a <section class="slide">.
    // Don't wrap it in another section — just inject it directly.
    // Use --bg (from theme.css) for body background, with white fallback.
    const fullDoc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>${frameworkCSS ?? ''}</style>
  <style>${themeCSS ?? ''}</style>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      /* Compatibility layer: map theme tokens to framework tokens */
      --text-1: var(--fg, #111111);
      --text-2: var(--muted, #5f6f89);
      --text-3: var(--accent, #1a73e8);
      --grad: linear-gradient(135deg, var(--accent, #1a73e8), var(--accent-2, #8430ce));
      --accent-2: color-mix(in oklch, var(--accent, #1a73e8) 60%, #8b5cf6);
      --border: var(--border, rgba(0,0,0,0.1));
    }
    body {
      overflow: hidden;
      background: var(--bg, var(--deck-bg, #ffffff));
      color: var(--fg, var(--deck-fg, #111111));
      font-family: var(--deck-font-body, var(--deck-font-display, system-ui, sans-serif));
    }
    .slide {
      display: flex;
      flex-direction: column;
      width: 1920px;
      height: 1080px;
      overflow: hidden;
      background: var(--bg, var(--deck-bg, #ffffff));
      color: var(--fg, var(--deck-fg, #111111));
      padding: 80px;
      position: relative;
    }
    .slide.active { display: flex; }
    .slide-shell {
      display: flex;
      flex-direction: column;
      flex: 1;
      gap: 24px;
    }
    .deck-stage {
      width: 1920px;
      height: 1080px;
      position: relative;
      transform-origin: top left;
    }
    .eyebrow {
      font-size: 18px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--accent, var(--deck-accent, #1a73e8));
    }
    h1 { font-family: var(--deck-font-display, system-ui, sans-serif); line-height: 1.1; }
    ${thumbnail ? `.deck-stage { pointer-events: none; }` : ''}
  </style>
</head>
<body>
  <div class="deck-stage">
    ${slideHTML}
  </div>
  ${!thumbnail && frameworkJS ? `<script>${frameworkJS}<\/script>` : ''}
</body>
</html>`;

    return buildSrcdoc(fullDoc, { deck: !thumbnail });
  }, [slideHTML, themeCSS, frameworkCSS, frameworkJS, slideId, thumbnail]);

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
