import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isKnownRoute } from '../middleware.js';
import { deleteManagedDriveFile } from '../api/_lib/drive.mjs';
import { publishedCmsResponse } from '../scripts/dynamic-cms-seo.mjs';

const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('unknown dotted root assets cannot become successful SPA routes', () => {
  const config = JSON.parse(source('vercel.json'));
  const fallback = new RegExp('^' + config.rewrites.at(-1).source + '$');
  for (const name of ['/unknown.json','/missing.pdf','/favicon-bogus.ico','/not-a-real.png']) {
    assert.equal(isKnownRoute(name), false, name);
    assert.equal(fallback.test(name), false, 'Vercel fallback for ' + name);
  }
  for (const name of ['/robots.txt', '/sitemap.xml', '/sinhala-text.svg']) {
    assert.equal(isKnownRoute(name), true);
    assert.equal(fallback.test(name), false);
  }
  assert.equal(fallback.test('/pages/test-page'), true);
  assert.equal(fallback.test('/updates/something'), true);
  assert.ok(config.headers[0].headers.some(header => header.key === 'Strict-Transport-Security'));
});

test('Drive deletion accepts only an app-owned generated upload', async () => {
  const before = globalThis.fetch;
  const id = 'AbCdEfGhIjKlMnOpQrSt';
  const filename = 'bcg-123e4567-e89b-42d3-a456-426614174000.png';
  const calls = [];
  try {
    globalThis.fetch = async (url, options) => {
      calls.push({ url: String(url), options });
      if (options.method === 'DELETE') return { ok: true, status: 204 };
      return { ok: true, json: async () => ({
        id, name: filename, mimeType: 'image/png',
        appProperties: { bcgManaged: '1' }, trashed: false,
      }) };
    };
    assert.deepEqual(await deleteManagedDriveFile('test-token', id), { deleted: true, fileId: id });
    assert.equal(calls.length, 2);
    assert.equal(calls[1].options.method, 'DELETE');
    for (const call of calls) {
      assert.equal(call.options.redirect, 'error');
      assert.ok(call.options.signal instanceof AbortSignal);
    }
  } finally { globalThis.fetch = before; }
});

test('Drive refuses old/unmarked files, lookalikes and invalid IDs before deleting', async () => {
  const before = globalThis.fetch;
  const id = 'AbCdEfGhIjKlMnOpQrSt';
  let deletions = 0;
  try {
    globalThis.fetch = async (_url, options) => {
      if (options.method === 'DELETE') { deletions++; throw Error('Should never delete'); }
      return { ok: true, json: async () => ({
        id, name: 'bcg-123e4567-e89b-42d3-a456-426614174000.pdf',
        mimeType: 'application/pdf', appProperties: {}, trashed: false,
      }) };
    };
    await assert.rejects(() => deleteManagedDriveFile('test-token', id), { status: 403 });
    await assert.rejects(() => deleteManagedDriveFile('test-token', '../bad'), { status: 400 });
    assert.equal(deletions, 0);
  } finally { globalThis.fetch = before; }
});

test('CMS subscription exceptions are reported through the existing error callback', () => {
  const code = source('src/lib/contentRepository.js');
  assert.match(code, /const listenSafely = \(start, handleError\)/);
  assert.match(code, /queueMicrotask\(\(\) => handleError\(error\)\)/);
  assert.match(code, /listenSafely\(\(\) => onSnapshot\(publishedQuery\(\)/);
});

test('Firestore prevents inserted or modified timestamps from being backdated', () => {
  const code = source('firestore.rules');
  assert.match(code, /function validCreateSystemTimes\(data\)/);
  assert.match(code, /function validUpdateSystemTimes\(\)/);
  assert.match(code, /validOwnership\(request\.resource\.data\) && validCreateSystemTimes/);
  assert.match(code, /validUpdateOwnership\(\) && validUpdateSystemTimes\(\)/);
});

test('crawler guard coalesces concurrent reads without caching old publication data', async () => {
  const html = source('index.html');
  const id = 'AbCdEfGhIjKlMnOpQrSt';
  const page = new Request('https://bcglk.devoraid.com/updates/' + id);
  let resolveDocument;
  let reads = 0;
  const fetcher = async (url) => {
    if (String(url).includes('firestore.googleapis.com')) {
      reads++;
      return new Promise(resolve => { resolveDocument = resolve; });
    }
    return new Response(html, { status: 200, headers: { 'content-type': 'text/html' } });
  };
  const options = { project: 'demo-bcg-audit', apiKey: 'demo-public-key',
    canonicalOrigin: 'https://bcglk.devoraid.com', fetcher };
  const first = publishedCmsResponse(page, options);
  const second = publishedCmsResponse(page, options);
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(reads, 1);
  resolveDocument(new Response(JSON.stringify({ fields: {
    published: { booleanValue: true }, title: { stringValue: 'Published' },
    excerpt: { stringValue: 'News summary' },
  } }), { status: 200 }));
  const results = await Promise.all([first, second]);
  assert.equal(results[0].status, 200);
  assert.equal(results[1].status, 200);
});
