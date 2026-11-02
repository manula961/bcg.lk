/**
 * Cloudflare Pages adapter for BCG.LK's existing authenticated Node-style APIs.
 * Restrict routing to the explicit API allowlist. Unknown API routes fail closed.
 * No server credentials are ever injected into the frontend bundle.
 * Pages must use compatibility_date >= 2026-08-04 for Node crypto and process.env.
 */
import { Buffer } from 'node:buffer';
import users from '../api/admin/users.js';
import workflow from '../api/admin/workflow.js';
import postAnalytics from '../api/admin/post-analytics.js';
import publish from '../api/cron/publish.js';
import driveConnect from '../api/drive/connect.js';
import driveCallback from '../api/drive/callback.js';
import driveDelete from '../api/drive/delete.js';
import driveDisconnect from '../api/drive/disconnect.js';
import drivePapersUpload from '../api/drive/papers-upload.js';
import driveStatus from '../api/drive/status.js';
import driveUpload from '../api/drive/upload.js';
import { isKnownRoute } from '../middleware.js';
import { isMetadataCrawler, cmsDocumentRoute, publishedCmsResponse } from '../scripts/dynamic-cms-seo.mjs';

export const API_HANDLERS = Object.freeze({
  '/api/admin/users': users,
  '/api/admin/workflow': workflow,
  '/api/admin/post-analytics': postAnalytics,
  '/api/cron/publish': publish,
  '/api/drive/connect': driveConnect,
  '/api/drive/callback': driveCallback,
  '/api/drive/delete': driveDelete,
  '/api/drive/disconnect': driveDisconnect,
  '/api/drive/papers-upload': drivePapersUpload,
  '/api/drive/status': driveStatus,
  '/api/drive/upload': driveUpload,
});

const MAX_JSON_BYTES = 96 * 1024;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const SECURITY = Object.freeze({
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https: wss:; media-src 'self' blob: https:; frame-src https:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; upgrade-insecure-requests",
});

function secure(response, path) {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY)) headers.set(name, value);
  if (path === '/admin' || path.startsWith('/api/'))
    headers.set('X-Robots-Tag', 'noindex, nofollow');
  if (path.startsWith('/api/')) headers.set('Cache-Control', 'no-store');
  return new Response(response.body, {status: response.status, statusText:response.statusText, headers});
}

async function boundedJson(request) {
  const length = Number(request.headers.get('content-length') || '0');
  if (!Number.isFinite(length) || length > MAX_JSON_BYTES)
    throw Object.assign(new Error('Request too large'), {status:413});
  if (!request.body) return undefined;
  const reader = request.body.getReader();
  const chunks = [];
  let count = 0;
  try {
    while (true) {
      const {value,done} = await reader.read();
      if (done) break;
      count += value.byteLength;
      if (count > MAX_JSON_BYTES)
        throw Object.assign(new Error('Request too large'), {status:413});
      chunks.push(Buffer.from(value));
    }
  } finally { reader.releaseLock(); }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw.trim()) return undefined;
  try { return JSON.parse(raw); }
  catch { throw Object.assign(new Error('Invalid JSON'),{status:400}); }
}

export function makeLegacyResponse() {
  const headers = new Headers();
  let statusCode = 200;
  let body = '';
  let completed = false;
  const response = {
    setHeader(name, value) {
      headers.delete(name);
      for (const entry of Array.isArray(value) ? value : [value])
        headers.append(name, String(entry));
      return response;
    },
    status(code) { statusCode = code; return response; },
    json(value) {
      headers.set('Content-Type','application/json; charset=utf-8');
      body = JSON.stringify(value);
      completed = true;
      return response;
    },
    send(value) {
      body = value == null ? '' : String(value);
      completed = true;
      return response;
    },
    end(value = '') { body = value; completed = true; return response; },
    redirect(code, location) {
      if (typeof code === 'string') { location = code; code = 302; }
      statusCode = code;
      headers.set('Location',location);
      completed = true;
      return response;
    },
    toResponse() {
      if (!completed) return new Response(JSON.stringify({error:'API response incomplete'}),{
        status:502,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},
      });
      return new Response(body,{status:statusCode,headers});
    },
  };
  return response;
}

export async function legacyRequest(request, {upload = false} = {}) {
  const url = new URL(request.url);
  const headers = Object.fromEntries([...request.headers].map(([k,v])=>[k.toLowerCase(),v]));
  const contentLength = Number(headers['content-length'] || '0');
  const limit = upload ? MAX_UPLOAD_BYTES : MAX_JSON_BYTES;
  if (!Number.isFinite(contentLength) || contentLength > limit)
    throw Object.assign(new Error('Request too large'),{status:413});
  const req = {
    method:request.method,
    url:url.pathname + url.search,
    headers,
    query:Object.fromEntries(url.searchParams),
    body:undefined,
    async *[Symbol.asyncIterator]() {
      if (!upload || !request.body) return;
      const reader = request.body.getReader();
      let size = 0;
      try {
        while (true) {
          const {value,done} = await reader.read();
          if (done) return;
          size += value.byteLength;
          if (size > limit)
            throw Object.assign(new Error('Request too large'),{status:413});
          yield Buffer.from(value);
        }
      } finally { reader.releaseLock(); }
    },
  };
  if (!upload && !['GET','HEAD'].includes(request.method))
    req.body = await boundedJson(request);
  return req;
}

async function runApi(request, path) {
  const handler = API_HANDLERS[path];
  if (!handler) return new Response(JSON.stringify({error:'Not found'}),{
    status:404,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},
  });
  const upload = path === '/api/drive/upload' || path === '/api/drive/papers-upload';
  try {
    const req = await legacyRequest(request,{upload});
    const res = makeLegacyResponse();
    await handler(req,res);
    return res.toResponse();
  } catch(error) {
    const code = [400,405,413,415].includes(error?.status) ? error.status : 502;
    return new Response(JSON.stringify({error:code===502?'API request failed':error.message}),{
      status:code,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},
    });
  }
}

const NOT_FOUND_HTML = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Page not found | Bandaranayake College</title></head><body style="background:#0a0a0a;color:#f5f0e8;font-family:Georgia,serif;text-align:center;padding:12vh 20px"><main><h1>Page not found</h1><p>This address does not match a published college page.</p><a style="color:#c9a84c" href="/">Back to home</a></main></body></html>';

export async function onRequest(context) {
  const {request} = context;
  const path = new URL(request.url).pathname;
  if (path.startsWith('/api/'))
    return secure(await runApi(request,path),path);

  if (request.method !== 'GET' && request.method !== 'HEAD')
    return secure(new Response('Method not allowed',{status:405}),path);

  if (!isKnownRoute(path)) return secure(new Response(request.method === 'HEAD' ? null : NOT_FOUND_HTML, {
    status:404,headers:{'Content-Type':'text/html; charset=utf-8','X-Robots-Tag':'noindex','Cache-Control':'no-store'},
  }),path);

  const agent = request.headers.get('user-agent') || '';
  if (request.method === 'GET' && cmsDocumentRoute(path) && isMetadataCrawler(agent)) {
    // The metadata helper only responds on the approved canonical origin. Use
    // no client/production Firebase secrets on untrusted preview branches.
    const enriched = await publishedCmsResponse(request, {
      // Do not fetch the live hostname from within its own Worker. Obtain the
      // HTML shell through the Pages asset binding to avoid same-zone loops.
      fetcher(input, options) {
        const url = new URL(input);
        if (url.origin === new URL(request.url).origin && url.pathname === '/index.html')
          return context.env.ASSETS.fetch(new Request(new URL('/', request.url)));
        return fetch(input, options);
      },
    });
    if (enriched) return secure(enriched,path);
  }

  // Serves static generated SEO pages and original SPA without editing React UI.
  return secure(await context.next(),path);
}
