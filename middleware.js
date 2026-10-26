// Preserve all existing public React markup and routes. Only recognized crawlers
// requesting stable CMS document URLs receive published-only metadata, via a
// best-effort dynamic import. Browsers, drafts, and failures retain the SPA.
function continueRequest() {
  return new Response(null, { headers: { 'x-middleware-next': '1' } });
}

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
  // The school anthem is a real static asset, not an unknown SPA route.
  // Preserve Jaliya's audio component and file without modifying either.
  if (normalized === '/audio/school-anthem.mp3') return true;
  if (/^\/pages\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) return true;
  if (/^\/(?:updates|events)\/[^/]+$/.test(normalized)) return true;
  // Preserve Vercel file handling (assets, robots, sitemap, API endpoints).
  if (normalized.startsWith('/api/') || normalized.startsWith('/assets/') ||
      normalized.startsWith('/email-assets/')) return true;
  // Recognize only shipped root assets; nonexistent dotted paths must be HTTP 404.
  if (['/robots.txt', '/sitemap.xml', '/sinhala-text.svg'].includes(normalized)) return true;
  return false;
}

export default function middleware(request) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return continueRequest();
  const path = new URL(request.url).pathname;
  if (isKnownRoute(path)) {
    // Defer ESM import so normal visitors and static assets do not acquire an
    // extra dependency or any Firestore request. The helper validates both
    // the route and the published status before returning enriched HTML.
    const agent = request.headers.get('user-agent') || '';
    const eligibleCmsPath = /^\/(?:updates\/[A-Za-z0-9]{20}|events\/[A-Za-z0-9]{20}|pages\/[a-z0-9]+(?:-[a-z0-9]+)*)\/?$/.test(path);
    const crawler = /(?:Googlebot|bingbot|DuckDuckBot|Twitterbot|facebookexternalhit|LinkedInBot|Slackbot|Discordbot|WhatsApp|TelegramBot)/i.test(agent);
    if (request.method === 'GET' && eligibleCmsPath && crawler) {
      return import('./scripts/dynamic-cms-seo.mjs')
        .then(async ({ isMetadataCrawler, cmsDocumentRoute, publishedCmsResponse }) => {
          if (!isMetadataCrawler(agent) || !cmsDocumentRoute(path)) return continueRequest();
          return (await publishedCmsResponse(request)) || continueRequest();
        })
        .catch(() => continueRequest());
    }
    return continueRequest();
  }
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
