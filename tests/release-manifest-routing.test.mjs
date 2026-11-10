import test from 'node:test';
import assert from 'node:assert/strict';
import { isKnownRoute } from '../middleware.js';

test('release manifest is a known static route, while unknown JSON paths remain 404', () => {
  for (const known of ['/release.json', '/release.json/', '/sitemap.xml', '/robots.txt']) {
    assert.equal(isKnownRoute(known), true, known);
  }
  for (const unknown of ['/release-info.json', '/release.json.bak', '/unknown.json', '/secrets.json']) {
    assert.equal(isKnownRoute(unknown), false, unknown);
  }
});

test('GET and HEAD for release.json continue to the actual static Vercel asset', async () => {
  const { default: middleware } = await import('../middleware.js');
  for (const method of ['GET', 'HEAD']) {
    const result = await middleware(new Request('https://school.example/release.json', { method }));
    assert.equal(result.status, 200);
    assert.equal(result.headers.get('x-middleware-next'), '1');
    assert.equal(await result.text(), '');
  }
  const unknown = await middleware(new Request('https://school.example/nonexistent.json'));
  assert.equal(unknown.status, 404);
  assert.match(await unknown.text(), /Page not found/);
});
