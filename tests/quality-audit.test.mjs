import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('Past Papers has production routing and crawlable static SEO metadata', () => {
  const middleware = read('middleware.js');
  const seo = read('scripts/generate-seo-pages.mjs');
  const config = JSON.parse(read('vercel.json'));
  assert.ok(middleware.includes("'/past-papers'"));
  assert.match(seo, /path: '\/past-papers'/);
  assert.ok(config.rewrites.some(rule => rule.source === '/past-papers' &&
    rule.destination === '/past-papers/index.html'));
});

test('direct Storage uploads are administrator-only and Drive remains role-gated', () => {
  const rules = read('storage.rules');
  const drive = read('api/_lib/drive.mjs');
  assert.match(rules, /function canUploadMedia\(\) \{\s*return isAdmin\(\);/);
  assert.match(rules, /allow create: if canUploadMedia\(\)/);
  assert.match(rules, /allow update: if isAdmin\(\)/);
  assert.match(rules, /allow delete: if isAdmin\(\)/);
  assert.match(rules, /allow list: if isAdmin\(\)/);
  assert.match(drive, /hasPermission\(record\?\.fields\?\.role\?\.stringValue, 'media\.upload'\)/);
});

test('consolidated browser smoke covers deep links, small screens, and Past Papers', () => {
  const smoke = read('tests/visual/smoke.mjs');
  for (const route of ['home-news-anchor-390', 'home-tablet', 'home-laptop',
    'events-narrow', 'past-papers-mobile', 'past-papers-narrow', 'admin-narrow']) {
    assert.ok(smoke.includes("label: '" + route + "'"), 'Missing smoke route: ' + route);
  }
});
