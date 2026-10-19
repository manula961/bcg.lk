import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');

test('public CMS detail subscriptions have asynchronous error paths and retry controls', () => {
  for (const file of ['src/pages/Updates.jsx', 'src/pages/EventDetail.jsx']) {
    const code = read(file);
    assert.match(code, /setLoadError\(true\)/);
    assert.match(code, /setLoading\(false\)/);
    assert.match(code, /setRetry\(n => n \+ 1\)/);
    assert.match(code, /active = false; unsubscribe\(\)/);
  }
  const page = read('src/pages/PublishedContentPage.jsx');
  assert.match(page, /error: true/);
  assert.match(page, /setRetry\(value => value \+ 1\)/);
});

test('Firestore-generated article/event links watch only one published document', () => {
  const repo = read('src/lib/contentRepository.js');
  const news = read('src/pages/Updates.jsx');
  const event = read('src/pages/EventDetail.jsx');
  assert.match(repo, /subscribePublishedById\(id, callback, handleError\)/);
  assert.match(news, /subscribePublishedNewsById\(id, record/);
  assert.match(event, /subscribePublishedEventById\(id, record/);
  assert.match(news, /subscribePublishedNews\(\(newsList\)/);
  assert.match(event, /subscribePublishedEvents\(\(eventsList\)/);
});

test('menu protects keyboard focus and scrolls instantly when reduced motion requested', () => {
  const menu = read('src/components/MenuBar.jsx');
  assert.match(menu, /aria-controls="site-navigation-panel"/);
  assert.match(menu, /event\.key !== 'Tab'/);
  assert.match(menu, /focusables/);
  assert.match(menu, /prefers-reduced-motion: reduce/);
});

test('campus tabs are keyboard navigable and do not auto-rotate in reduced-motion mode', () => {
  const code = read('src/components/ExploreSection.jsx');
  assert.match(code, /event\.key === 'ArrowRight'/);
  assert.match(code, /tabIndex=\{active === i \? 0 : -1\}/);
  assert.match(code, /isPaused \|\| reducedMotion/);
});

test('Google Drive uploads explicitly warn of immediate public sharing', () => {
  const code = read('src/admin/ContentManager.jsx');
  assert.match(code, /publicly accessible on Google Drive immediately/);
  assert.match(code, /window\.confirm/);
});

test('Firebase Storage limits overwriting to admins and deletion to admins', () => {
  const rules = read('storage.rules');
  assert.match(rules, /allow create: if resource == null && canUploadMedia\(\)/);
  assert.match(rules, /allow update: if isAdmin\(\)/);
  assert.match(rules, /allow delete: if isAdmin\(\)/);
  assert.match(rules, /allow list: if isAdmin\(\)/);
});
