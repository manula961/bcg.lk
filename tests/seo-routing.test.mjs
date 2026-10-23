import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isKnownRoute } from '../middleware.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('known static and CMS routes retain the React SPA', () => {
  for (const path of ['/', '/index.html', '/admin', '/events', '/about-us',
    '/life/sports-societies', '/life/leadership', '/past-papers', '/updates/abc123', '/events/abc123',
    '/pages/about-college', '/assets/index.js', '/email-assets/school-logo.png', '/email-assets/computer-society-logo.png', '/api/drive/upload']) {
    assert.equal(isKnownRoute(path), true, path);
  }
});
test('unrecognized routes do not receive a success status', async () => {
  const { default: middleware } = await import('../middleware.js');
  for (const path of ['/does-not-exist', '/life/unknown-life-page', '/unknown/route']) {
    assert.equal(isKnownRoute(path), false, path);
    const res = middleware(new Request('https://example.test' + path));
    assert.equal(res.status, 404, path);
    assert.match(res.headers.get('x-robots-tag'), /noindex/);
    assert.match(await res.text(), /Page not found/);
  }
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
