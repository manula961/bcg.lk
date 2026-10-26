/**
 * SEO metadata for published CMS documents, without changing any React markup.
 * Uses anonymous Firestore REST reads: Firestore Security Rules remain the
 * authorization boundary. Fail open to the original SPA on network errors.
 */
const defaultOrigin = 'https://bcglk.devoraid.com';
const botAgent = /(?:Googlebot|bingbot|DuckDuckBot|Twitterbot|facebookexternalhit|LinkedInBot|Slackbot|Discordbot|WhatsApp|TelegramBot)/i;
// Per-isolate pressure guard: coalesce concurrent reads of one public record and
// cap unique in-flight Firestore reads. No published metadata is cached after a
// read resolves, so unpublication cannot leave stale metadata in this layer.
const MAX_PARALLEL_METADATA_READS = 12;
let activeMetadataReads = 0;
const pendingMetadata = new Map();
function boundedMetadataRead(key, work) {
  if (pendingMetadata.has(key)) return pendingMetadata.get(key);
  if (activeMetadataReads >= MAX_PARALLEL_METADATA_READS) return Promise.resolve(null);
  activeMetadataReads++;
  const promise = Promise.resolve().then(work).finally(() => {
    activeMetadataReads--;
    pendingMetadata.delete(key);
  });
  pendingMetadata.set(key, promise);
  return promise;
}

export function isMetadataCrawler(userAgent) {
  return typeof userAgent === 'string' && botAgent.test(userAgent);
}

export function cmsDocumentRoute(path) {
  if (typeof path !== 'string' || path.length > 180) return null;
  const clean = path.length > 1 ? path.replace(/\/$/, '') : path;
  const page = /^\/pages\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(clean);
  if (page) return { collection: 'pages', id: page[1], path: clean };
  const post = /^\/updates\/([A-Za-z0-9]{20})$/.exec(clean);
  if (post) return { collection: 'news', id: post[1], path: clean };
  const event = /^\/events\/([A-Za-z0-9]{20})$/.exec(clean);
  if (event) return { collection: 'events', id: event[1], path: clean };
  // Legacy title-based URLs continue to render the existing client-side page.
  return null;
}

function xmlEscape(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function stringField(fields, key) {
  const value = fields?.[key]?.stringValue;
  return typeof value === 'string' ? value : '';
}

export function publishedMetadata(document, collection) {
  const fields = document?.fields;
  if (fields?.published?.booleanValue !== true) return null;
  const title = stringField(fields, 'title').trim().slice(0, 180);
  if (!title) return null;
  const summaryField = collection === 'news' ? 'excerpt'
    : collection === 'events' ? 'description' : 'seoDescription';
  const fallback = collection === 'pages' ? stringField(fields, 'body') : '';
  const description = (stringField(fields, summaryField) || fallback)
    .replace(/\s+/g, ' ').trim().slice(0, 240);
  return { title, description };
}

export function renderCmsMetadata(template, metadata, canonical) {
  if (typeof template !== 'string' || !template.includes('id="root"'))
    return null;
  const title = metadata.title + ' | Bandaranayake College';
  const substitutions = [
    [/<title>[^<]*<\/title>/, '<title>' + xmlEscape(title) + '</title>'],
    [/<meta name="description" content="[^"]*"\s*\/>/, '<meta name="description" content="' + xmlEscape(metadata.description) + '" />'],
    [/<link rel="canonical" href="[^"]*"\s*\/>/, '<link rel="canonical" href="' + xmlEscape(canonical) + '" />'],
    [/<meta property="og:title" content="[^"]*"\s*\/>/, '<meta property="og:title" content="' + xmlEscape(title) + '" />'],
    [/<meta property="og:description" content="[^"]*"\s*\/>/, '<meta property="og:description" content="' + xmlEscape(metadata.description) + '" />'],
    [/<meta property="og:url" content="[^"]*"\s*\/>/, '<meta property="og:url" content="' + xmlEscape(canonical) + '" />'],
  ];
  let html = template;
  for (const [pattern, replacement] of substitutions) {
    if (!pattern.test(html)) return null;
    html = html.replace(pattern, () => replacement);
  }
  return html;
}

/**
 * Return undefined to preserve the existing Vercel SPA route if any external
 * service is unavailable; never serve drafts, invalid records or error payloads.
 */
export async function publishedCmsResponse(request, {
  project = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
  apiKey = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_WEB_API_KEY,
  canonicalOrigin = process.env.BCG_CANONICAL_ORIGIN || defaultOrigin,
  fetcher = fetch,
} = {}) {
  const requestUrl = new URL(request.url);
  const match = cmsDocumentRoute(requestUrl.pathname);
  if (!match || !project || !apiKey || !/^[a-z0-9][a-z0-9-]{3,62}$/.test(project)) return undefined;
  let origin;
  try {
    const url = new URL(canonicalOrigin);
    if (url.protocol !== 'https:' || url.origin !== canonicalOrigin) return undefined;
    origin = url.origin;
  } catch {
    return undefined;
  }
  // Never fetch an HTML shell from a caller-controlled host. A deployment
  // must explicitly configure its own canonical origin before serving bot HTML.
  if (requestUrl.origin !== origin) return undefined;
  try {
    const endpoint = new URL('https://firestore.googleapis.com/v1/projects/' +
      encodeURIComponent(project) + '/databases/(default)/documents/' +
      match.collection + '/' + encodeURIComponent(match.id));
    endpoint.searchParams.set('key', apiKey);
    const document = await boundedMetadataRead(project + '/' + match.collection + '/' + match.id, async () => {
      const docResponse = await fetcher(endpoint, {
        method: 'GET', redirect: 'error', signal: AbortSignal.timeout(3500),
      });
      return docResponse.ok ? docResponse.json() : null;
    });
    if (!document) return undefined;
    const metadata = publishedMetadata(document, match.collection);
    if (!metadata) return undefined;

    const shell = await fetcher(new URL('/index.html', origin), {
      method: 'GET', redirect: 'error', signal: AbortSignal.timeout(3500),
    });
    if (!shell.ok || !(shell.headers.get('content-type') || '').includes('text/html'))
      return undefined;
    const html = renderCmsMetadata(await shell.text(), metadata, origin + match.path);
    if (!html) return undefined;
    // Content is identical to the React SPA except for the metadata-only head.
    // Do not cache unpublished or recently unpublished content in shared caches.
    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'private, no-store',
        'Vary': 'User-Agent',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      },
    });
  } catch {
    return undefined;
  }
}
