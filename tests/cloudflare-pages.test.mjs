import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {API_HANDLERS,legacyRequest,makeLegacyResponse,onRequest} from '../functions/[[path]].js';
import {assertProductionReleaseApproved} from '../scripts/production-release-gate.mjs';

const source = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');
const A = 'a'.repeat(40);
const B = 'b'.repeat(40);

test('Cloudflare Pages production uses an exact reviewed commit SHA', () => {
  const cf = {CF_PAGES:'1',CF_PAGES_BRANCH:'main',CF_PAGES_COMMIT_SHA:A};
  assert.throws(()=>assertProductionReleaseApproved(cf),/BCG_APPROVED_PRODUCTION_SHA/);
  assert.throws(()=>assertProductionReleaseApproved({...cf,BCG_APPROVED_PRODUCTION_SHA:B}),
    /not the approved production revision/);
  assert.deepEqual(assertProductionReleaseApproved({...cf,BCG_APPROVED_PRODUCTION_SHA:A}),{enforced:true});
  assert.deepEqual(assertProductionReleaseApproved({...cf,CF_PAGES_BRANCH:'staging'}),{enforced:false});
  assert.throws(()=>assertProductionReleaseApproved({...cf,CF_PAGES_COMMIT_SHA:'bad',BCG_APPROVED_PRODUCTION_SHA:'bad'}),
    /Cloudflare Pages commit identity/);
});

test('all 11 protected legacy API paths have Cloudflare handlers', () => {
  assert.deepEqual(Object.keys(API_HANDLERS).sort(),[
    '/api/admin/post-analytics','/api/admin/users','/api/admin/workflow','/api/cron/publish',
    '/api/drive/callback','/api/drive/connect','/api/drive/delete','/api/drive/disconnect',
    '/api/drive/papers-upload','/api/drive/status','/api/drive/upload',
  ].sort());
});

test('API adapter preserves JSON input and important authorization headers', async () => {
  const request = new Request('https://example.pages.dev/api/admin/workflow?status=all',{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer abc','Origin':'https://example.pages.dev'},
    body:JSON.stringify({action:'submit',kind:'news',id:'abcd'}),
  });
  const req = await legacyRequest(request);
  assert.deepEqual(req.body,{action:'submit',kind:'news',id:'abcd'});
  assert.equal(req.query.status,'all');
  assert.equal(req.headers.authorization,'Bearer abc');
  assert.equal(req.headers.origin,'https://example.pages.dev');
});

test('API adapter streams upload data and rejects large unauthenticated bodies', async () => {
  const request = new Request('https://example.pages.dev/api/drive/upload',{
    method:'POST',headers:{'Content-Type':'image/png'},
    body:new Uint8Array([137,80,78,71]),
  });
  const req = await legacyRequest(request,{upload:true});
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  assert.equal(Buffer.concat(chunks).length,4);
  await assert.rejects(legacyRequest(new Request('https://example.pages.dev/api/admin/users',{
    method:'POST',headers:{'Content-Length':String(1000000)},body:'{}',
  })),/Request too large/);
});

test('res.setHeader supports independent Set-Cookie values and explicit HTTP status', () => {
  const res = makeLegacyResponse();
  res.setHeader('Set-Cookie',['first=1; Secure','second=2; Secure']);
  res.status(201).json({ok:true});
  const response = res.toResponse();
  assert.equal(response.status,201);
  assert.equal(response.headers.getSetCookie().length,2);
});

test('unknown routes return HTTP 404, not SPA HTML; admin and assets are preserved', async () => {
  const ctx = path => ({
    request:new Request('https://example.pages.dev'+path),
    env:{},
    next: async () => new Response('<html>SPA</html>',{status:200,headers:{'Content-Type':'text/html'}}),
  });
  const missing = await onRequest(ctx('/not-a-real-route'));
  assert.equal(missing.status,404);
  const admin = await onRequest(ctx('/admin'));
  assert.equal(admin.status,200);
  assert.equal(admin.headers.get('X-Robots-Tag'),'noindex, nofollow');
  const missingApi = await onRequest(ctx('/api/not-real'));
  assert.equal(missingApi.status,404);
  assert.equal(missingApi.headers.get('Cache-Control'),'no-store');
});

test('Cloudflare Pages shipping artifacts preserve runtime and deployment controls', () => {
  const config = source('wrangler.toml');
  const routes = JSON.parse(source('public/_routes.json'));
  const headers = source('public/_headers');
  const cron = source('cloudflare/cron-worker.mjs');
  assert.match(config,/compatibility_date = "2026-10-30"/);
  assert.match(config,/pages_build_output_dir = ".\/dist"/);
  assert.deepEqual(routes.include,['/*']);
  assert.ok(routes.exclude.includes('/assets/*'));
  assert.match(headers,/Content-Security-Policy/);
  assert.match(cron,/CMS_CRON_SECRET/);
  assert.match(cron,/failed \|\| result.deferred \|\| result.truncated/);
});
