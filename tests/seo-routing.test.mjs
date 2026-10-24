import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isKnownRoute } from '../middleware.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('known static and CMS routes retain the React SPA', () => {
  for (const path of ['/', '/index.html', '/admin', '/events', '/about-us',
    '/life/sports-societies', '/life/leadership', '/past-papers', '/updates/abc123', '/events/abc123',
    '/pages/about-college', '/audio/school-anthem.mp3', '/assets/index.js', '/email-assets/school-logo.png', '/email-assets/computer-society-logo.png', '/api/drive/upload']) {
    assert.equal(isKnownRoute(path), true, path);
  }
});
test('unrecognized routes do not receive a success status', async () => {
  const { default: middleware } = await import('../middleware.js');
  for (const path of ['/does-not-exist', '/life/unknown-life-page', '/unknown/route', '/audio/unknown-track.mp3']) {
    assert.equal(isKnownRoute(path), false, path);
    const res = middleware(new Request('https://example.test' + path));
    assert.equal(res.status, 404, path);
    assert.match(res.headers.get('x-robots-tag'), /noindex/);
    assert.match(await res.text(), /Page not found/);
  }
});
test('the school anthem remains reachable without opening arbitrary audio routes', () => {
  assert.equal(isKnownRoute('/audio/school-anthem.mp3'), true);
  assert.equal(isKnownRoute('/audio/school-anthem.mp3/'), true);
  assert.equal(isKnownRoute('/audio/unknown.mp3'), false);
  assert.equal(isKnownRoute('/audio/../private.mp3'), false);
});

test('Vercel rewrites keep static media paths out of the SPA fallback', () => {
  const config = JSON.parse(read('vercel.json'));
  const fallback = config.rewrites.at(-1);
  assert.equal(fallback.destination, '/index.html');
  const match = new RegExp('^' + fallback.source + '$');
  for (const path of ['/api/admin/users', '/audio/school-anthem.mp3',
    '/assets/index.js', '/email-assets/school-logo.png']) {
    assert.equal(match.test(path), false, path);
  }
  for (const path of ['/updates/abc123', '/events/abc123', '/pages/about-college', '/admin']) {
    assert.equal(match.test(path), true, path);
  }
});

test('crawler metadata responses leave ordinary site navigation unchanged', async () => {
  const { default: middleware } = await import('../middleware.js');
  const plain = new Request('https://example.test/updates/AbCdEfGhIjKlMnOpQrSt', {
    headers: { 'user-agent': 'Mozilla/5.0' },
  });
  assert.equal(middleware(plain), undefined);
  assert.equal(middleware(new Request('https://example.test/robots.txt')), undefined);
});

test('public sitemap and robots entries are consistent and admin excluded', () => {
  const sitemap = read('public/sitemap.xml');
  const robots = read('public/robots.txt');
  assert.match(sitemap, /<urlset /);
  assert.match(sitemap, /https:\/\/bcglk\.devoraid\.com\/life\/sports-societies/);
  assert.doesNotMatch(sitemap, /\/admin/);
  assert.match(robots, /Disallow: \/admin/);
  assert.match(robots, /Sitemap: https:\/\/bcglk\.devoraid\.com\/sitemap\.xml/);
});
