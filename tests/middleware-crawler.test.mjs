import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import middleware from '../middleware.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const story = 'AbCdEfGhIjKlMnOpQrSt';
const url = 'https://bcglk.devoraid.com/updates/' + story;

test('ordinary visitors retain the original SPA and never query Firebase in middleware', () => {
  const res = middleware(new Request(url, { headers: { 'user-agent': 'Mozilla/5.0' } }));
  assert.equal(res.headers.get('x-middleware-next'), '1');
  assert.equal(middleware(new Request('https://bcglk.devoraid.com/events')).headers.get('x-middleware-next'), '1');
});

test('crawler gets metadata only for published records; unavailable data falls back safely', async () => {
  const prevFetch = globalThis.fetch;
  const env = ['VITE_FIREBASE_PROJECT_ID', 'FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_API_KEY', 'FIREBASE_WEB_API_KEY'];
  const saved = Object.fromEntries(env.map(name => [name, process.env[name]]));
  process.env.VITE_FIREBASE_PROJECT_ID = 'bcg-preview-metadata';
  process.env.FIREBASE_PROJECT_ID = 'bcg-preview-metadata';
  process.env.VITE_FIREBASE_API_KEY = 'fake-public-web-key';
  process.env.FIREBASE_WEB_API_KEY = 'fake-public-web-key';
  let published = true;
  let firestoreReads = 0;
  globalThis.fetch = async address => {
    if (String(address).startsWith('https://firestore.googleapis.com/')) {
      firestoreReads++;
      return new Response(JSON.stringify({ fields: {
        title: { stringValue: 'Science & Innovation' },
        excerpt: { stringValue: 'News for college students' },
        published: { booleanValue: published },
      }}), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (new URL(address).pathname === '/index.html')
      return new Response(html, { headers: { 'content-type': 'text/html' } });
    throw Error('Unexpected external request');
  };
  try {
    const request = new Request(url, { headers: { 'user-agent': 'Googlebot/2.1' } });
    const response = await middleware(request);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /Science &amp; Innovation \| Bandaranayake College/);
    assert.equal(firestoreReads, 1);

    published = false;
    const draft = await middleware(request);
    assert.equal(draft.headers.get('x-middleware-next'), '1');
    assert.equal(firestoreReads, 2, 'Unpublished CMS records must never be cached as published');
  } finally {
    globalThis.fetch = prevFetch;
    for (const name of env) {
      if (saved[name] === undefined) delete process.env[name];
      else process.env[name] = saved[name];
    }
  }
});
