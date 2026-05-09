import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { I18nProvider } from '../src/i18n';
import { LayerProvider } from '../src/layers';
import '../src/index.css';

export const metadata: Metadata = {
  title: 'Google Cloud APAC AI Practice',
  icons: {
    icon: '/logo.svg',
    // Safari pinned-tab mask icon — Next.js's Metadata API doesn't have a
    // dedicated `mask` field, so we surface it via the generic `other`
    // bucket which renders as a raw <link rel="mask-icon" ...>.
    other: [{ rel: 'mask-icon', url: '/logo.svg', color: '#ed6f5c' }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#efe7d2' },
    { media: '(prefers-color-scheme: dark)', color: '#15140f' },
  ],
};

/**
 * Inline script that runs before React hydrates to apply the saved theme
 * preference without a flash of unstyled content. It reads the same
 * localStorage key used by `state/config.ts` and sets `data-theme` on
 * `<html>` immediately — before any CSS or React paint.
 */
const themeInitScript = `(function(){try{var t=JSON.parse(localStorage.getItem('pixelpitch:config')||'{}').theme;if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang='en' suppressHydrationWarning>
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: intentional theme-init inline script to prevent FOUC */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body suppressHydrationWarning>
        <I18nProvider>
          <LayerProvider>{children}</LayerProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
