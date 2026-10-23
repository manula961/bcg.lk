// Vercel routing middleware: known SPA routes retain the current React app.
// Unrecognized static paths return an actual 404 instead of SPA HTTP 200.
// Dynamic CMS document paths remain resolved client-side because published
// Firestore documents cannot be checked at the edge without a live read.
const publicRoutes = new Set([
  '/', '/index.html', '/about-us', '/events', '/past-papers',
  '/life/about-us', '/life/academic-excellence',
  '/life/sports-societies', '/life/leadership',
]);

export function isKnownRoute(path) {
  const normalized = path.length > 1 ? path.replace(/\/$/, '') : path;
  if (publicRoutes.has(normalized) || normalized === '/admin') return true;
  if (/^\/pages\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) return true;
  if (/^\/(?:updates|events)\/[^/]+$/.test(normalized)) return true;
  // Preserve Vercel file handling (assets, robots, sitemap, API endpoints).
  if (normalized.startsWith('/api/') || normalized.startsWith('/assets/') || normalized.startsWith('/email-assets/') ||
      /^\/[A-Za-z0-9._-]+\.[A-Za-z0-9]+$/.test(normalized)) return true;
  return false;
}

export default function middleware(request) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return;
  const path = new URL(request.url).pathname;
  if (isKnownRoute(path)) return;
  // This lightweight branded response is shown only for unknown routes.
  // The existing public React pages/styles are unchanged.
  const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Page not found | Bandaranayake College</title></head><body style="background:#0a0a0a;color:#f5f0e8;font-family:Georgia,serif;text-align:center;padding:12vh 20px"><main><h1>Page not found</h1><p>This address does not match a published college page.</p><a style="color:#c9a84c" href="/">Back to home</a></main></body></html>';
  return new Response(request.method === 'HEAD' ? null : html, {
    status: 404,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex',
      'Cache-Control': 'no-store',
    },
  });
}
