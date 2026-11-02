import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');

test('public CMS detail subscriptions have asynchronous error paths and retry controls', () => {
  for (const file of ['src/pages/news/Updates.jsx', 'src/pages/events/EventDetail.jsx']) {
    const code = read(file);
    assert.match(code, /setLoadError\(true\)/);
    assert.match(code, /setLoading\(false\)/);
    assert.match(code, /setRetry\(n => n \+ 1\)/);
    assert.match(code, /active = false; unsubscribe\(\)/);
  }
  const page = read('src/pages/content/PublishedContentPage.jsx');
  assert.match(page, /error: true/);
  assert.match(page, /setRetry\(value => value \+ 1\)/);
});

test('Firestore-generated article/event links watch only one published document', () => {
  const repo = read('src/lib/contentRepository.js');
  const news = read('src/pages/news/Updates.jsx');
  const event = read('src/pages/events/EventDetail.jsx');
  assert.match(repo, /subscribePublishedById\(id, callback, handleError\)/);
  assert.match(news, /subscribePublishedNewsById\(id, record/);
  assert.match(event, /subscribePublishedEventById\(id, record/);
  assert.match(news, /subscribePublishedNews\(\(newsList\)/);
  assert.match(event, /subscribePublishedEvents\(\(eventsList\)/);
});

test('menu protects keyboard focus and scrolls instantly when reduced motion requested', () => {
  const menu = read('src/components/layout/MenuBar.jsx');
  assert.match(menu, /aria-controls="site-navigation-panel"/);
  assert.match(menu, /event\.key !== 'Tab'/);
  assert.match(menu, /focusables/);
  const scroll = read('src/navigation/RouteScroll.jsx');
  assert.match(scroll, /prefers-reduced-motion: reduce/);
  // Navigation deliberately routes through the shared reduced-motion aware scroller.
  assert.match(scroll, /scrollPageTo\(target, \{ smooth: !reducedMotion, force: true \}\)/);
});

test('campus tabs are keyboard navigable and do not auto-rotate in reduced-motion mode', () => {
  const code = read('src/components/home/ExploreSection.jsx');
  assert.match(code, /event\.key === 'ArrowRight'/);
  assert.match(code, /tabIndex=\{active === i \? 0 : -1\}/);
  assert.match(code, /if \(!visible \|\| reducedMotion\) return;/);
});

test('Google Drive uploads explicitly warn of immediate public sharing', () => {
  const code = read('src/admin/ContentManager.jsx');
  assert.match(code, /publicly accessible on Google Drive immediately/);
  assert.match(code, /window\.confirm/);
});

test('Firebase Storage limits overwriting to admins and deletion to admins', () => {
  const rules = read('storage.rules');
  assert.match(rules, /allow create: if canUploadMedia\(\)/);
  // Rules v2 evaluates create only for new objects; update is the overwrite boundary.
  assert.doesNotMatch(rules, /allow create: if resource == null/);
  assert.match(rules, /allow update: if isAdmin\(\)/);
  assert.match(rules, /allow delete: if isAdmin\(\)/);
  assert.match(rules, /allow list: if isAdmin\(\)/);
});

test('events calendar exposes load errors and a retry without losing existing calendar controls', () => {
  const events = read('src/pages/events/EventsPage.jsx');
  assert.match(events, /setLoadError\(true\)/);
  assert.match(events, /setLoadError\(false\)/);
  assert.match(events, /role="alert"/);
  assert.match(events, /setRetryEvents\(value => value \+ 1\)/);
  assert.match(events, /\[retryEvents\]/);
  assert.match(events, /window\.setInterval\(syncToday, 60_000\)/);
  assert.match(events, /window\.clearInterval\(interval\)/);
  assert.match(events, /document\.removeEventListener\('visibilitychange', syncToday\)/);
});
