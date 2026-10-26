import test from 'node:test';
import assert from 'node:assert/strict';
import middleware from '../middleware.js';

const postId = 'AbCdEfGhIjKlMnOpQrSt';
const url = 'https://bcglk.devoraid.com/updates/' + postId;
const shell = '<!doctype html><html lang="en"><head>' +
  '<title>Original Site</title>' +
  '<meta name="description" content="Original" />' +
  '<link rel="canonical" href="https://bcglk.devoraid.com/" />' +
  '<meta property="og:title" content="Original" />' +
  '<meta property="og:description" content="Original" />' +
  '<meta property="og:url" content="https://bcglk.devoraid.com/" />' +
  '</head><body><div id="root"></div></body></html>';

test('CMS SEO middleware enriches published records for bots, not browsers or drafts', async () => {
  const original = globalThis.fetch;
  const keys = ['VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_API_KEY', 'BCG_CANONICAL_ORIGIN'];
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  const calls = [];
  try {
    process.env.VITE_FIREBASE_PROJECT_ID = 'bcg-test-project';
    process.env.VITE_FIREBASE_API_KEY = 'test-public-firebase-api-key';
    process.env.BCG_CANONICAL_ORIGIN = 'https://bcglk.devoraid.com';
    let published = true;
    globalThis.fetch = async input => {
      const target = new URL(String(input));
      calls.push(target.pathname);
      if (target.hostname === 'firestore.googleapis.com') {
        return new Response(JSON.stringify({ fields: {
          published: { booleanValue: published },
          title: { stringValue: 'School News & Updates' },
          excerpt: { stringValue: 'Published article' },
        } }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      if (target.pathname === '/index.html')
        return new Response(shell, { status: 200, headers: { 'content-type': 'text/html' } });
      throw Error('Unexpected network request: ' + target.pathname);
    };
    const browser = middleware(new Request(url, { headers: { 'user-agent': 'Mozilla/5.0' } }));
    assert.equal(browser.headers.get('x-middleware-next'), '1');
    assert.deepEqual(calls, [], 'Ordinary visitors must not trigger metadata reads');

    const bot = new Request(url, { headers: { 'user-agent': 'Googlebot/2.1' } });
    const enriched = await middleware(bot);
    assert.equal(enriched.status, 200);
    assert.match(await enriched.text(), /School News &amp; Updates/);
    assert.equal(enriched.headers.get('cache-control'), 'private, no-store');
    assert.equal(calls.length, 2);

    published = false;
    calls.length = 0;
    const draft = await middleware(bot);
    assert.equal(draft.headers.get('x-middleware-next'), '1');
    assert.equal(calls.length, 1, 'Never send draft content or fetch template for drafts');

    globalThis.fetch = async () => { throw Error('Upstream temporarily unavailable'); };
    const failure = await middleware(bot);
    assert.equal(failure.headers.get('x-middleware-next'), '1');
    assert.equal(middleware(new Request('https://bcglk.devoraid.com/invalid')).status, 404);
  } finally {
    globalThis.fetch = original;
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});
