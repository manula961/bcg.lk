import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('homepage anchors are resolved after the loading screen unmounts', () => {
  const app = read('src/App.jsx');
  assert.match(app, /pendingSection = useRef\(sessionStorage\.getItem\('scrollToSection'\)/);
  assert.match(app, /if \(loading\) return undefined;/);
  assert.match(app, /getElementById\(target\)\?\.scrollIntoView/);
  assert.match(app, /\}, \[loading\]\);/);
});

test('public CMS sections distinguish load failures from zero published records', () => {
  for (const file of ['src/components/NewsSection.jsx', 'src/components/EventsSection.jsx']) {
    const source = read(file);
    assert.match(source, /setIsLoading\(false\)/);
    assert.match(source, /setLoadError\(true\)/);
    assert.match(source, /role="alert"/);
    assert.match(source, /role="status"/);
  }
  assert.doesNotMatch(read('src/components/NewsSection.jsx'), /filtered\.length > 0 \? filtered : \[null\]/);
});

test('administrator search and publishing filter have accessible labels', () => {
  const source = read('src/admin/ContentManager.jsx');
  assert.match(source, /aria-label=\{\x60Search \$\{kind\} content\x60\}/);
  assert.match(source, /aria-label="Filter content by publishing status"/);
});

test('campus carousel can be paused and stops on manual interaction', () => {
  const source = read('src/components/ExploreSection.jsx');
  assert.match(source, /aria-pressed=\{userPaused\}/);
  assert.match(source, /Resume automatic rotation/);
  assert.match(source, /setUserPaused\(true\)/);
  assert.match(source, /isPaused \|\| userPaused \|\| reducedMotion/);
});

test('Past Papers has an allowed production route and crawlable metadata', () => {
  const middleware = read('middleware.js');
  const seo = read('scripts/generate-seo-pages.mjs');
  const config = JSON.parse(read('vercel.json'));
  assert.ok(middleware.includes("'/past-papers'"));
  assert.match(seo, /path: '\/past-papers'/);
  assert.ok(config.rewrites.some(rule => rule.source === '/past-papers' &&
    rule.destination === '/past-papers/index.html'));
});

test('direct Storage uploads are administrator-only; Drive still gates upload by media role', () => {
  const rules = read('storage.rules');
  const drive = read('api/_lib/drive.mjs');
  assert.match(rules, /allow create: if isAdmin\(\)/);
  assert.match(rules, /allow update: if isAdmin\(\)/);
  assert.match(rules, /allow delete: if isAdmin\(\)/);
  assert.match(drive, /hasPermission\(record\?\.fields\?\.role\?\.stringValue, 'media\.upload'\)/);
});
