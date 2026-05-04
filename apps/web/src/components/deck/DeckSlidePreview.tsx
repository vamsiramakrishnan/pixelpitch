import { useEffect, useMemo, useState } from 'react';
import { projectRawUrl } from '../../providers/registry';
import { buildSrcdoc } from '../../runtime/srcdoc';
import type { DeckPlan } from '@pixelpitch/contracts';

interface Props {
  projectId: string;
  plan: DeckPlan;
  slideId: string;
  thumbnail?: boolean;
}

export function DeckSlidePreview({ projectId, plan, slideId, thumbnail = false }: Props) {
  const [themeCSS, setThemeCSS] = useState<string | null>(null);
  const [frameworkCSS, setFrameworkCSS] = useState<string | null>(null);
  const [frameworkJS, setFrameworkJS] = useState<string | null>(null);
  const [slideHTML, setSlideHTML] = useState<string | null>(null);

  const slide = plan.slides.find((s) => s.id === slideId);
  const slideFile = slide?.file;

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    async function fetchAsset(path: string): Promise<string | null> {
      try {
        const url = projectRawUrl(projectId, path);
        const res = await fetch(url);
        if (!res.ok) return null;
        return res.text();
      } catch {
        return null;
      }
    }

    Promise.all([
      fetchAsset('deck/theme.css'),
      fetchAsset('deck/framework.css'),
      fetchAsset('deck/framework.js'),
    ]).then(([theme, fwCss, fwJs]) => {
      if (cancelled) return;
      setThemeCSS(theme);
      setFrameworkCSS(fwCss);
      setFrameworkJS(fwJs);
    });

    return () => { cancelled = true; };
  }, [projectId]);

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

    const fullDoc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>${frameworkCSS ?? ''}</style>
  <style>${themeCSS ?? ''}</style>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { overflow: hidden; background: var(--deck-bg, #0f172a); }
    .slide { display: flex; flex-direction: column; width: 1920px; height: 1080px; overflow: hidden; }
    .deck-stage { width: 1920px; height: 1080px; position: relative; }
    ${thumbnail ? `
      .slide { transform-origin: top left; }
    ` : ''}
  </style>
</head>
<body>
  <div class="deck-stage">
    <section class="slide active" data-slide-id="${slideId}">
      ${slideHTML}
    </section>
  </div>
  ${!thumbnail && frameworkJS ? `<script>${frameworkJS}</script>` : ''}
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
