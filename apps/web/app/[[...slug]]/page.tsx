import { ClientApp } from './client-app';
import { LandingPage } from './landing';

// The catch-all renders either the landing page (at /) or the client SPA
// (at any deeper path).  For `output: 'export'` we emit a single shell at
// out/index.html; the daemon's SPA fallback serves it for deep links.
export function generateStaticParams() {
  return [{ slug: [] as string[] }];
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  if (!slug || slug.length === 0) {
    return <LandingPage />;
  }
  return <ClientApp />;
}
