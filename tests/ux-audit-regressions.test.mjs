import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('homepage resolves anchor scrolling only after the curtain is gone', () => {
  const home = read('src/App.jsx');
  const scroll = read('src/navigation/RouteScroll.jsx');
  const entry = read('src/main.jsx');
  assert.match(home, /sessionStorage\.removeItem\('skipLoading'\)/);
  assert.match(scroll, /window\.location\.hash/);
  assert.match(scroll, /document\.getElementById\(id\)/);
  assert.match(scroll, /target\.scrollIntoView/);
  assert.match(entry, /<RouteScroll/);
});

test('homepage CMS distinguishes loading, empty, and unavailable content', () => {
  for (const path of ['src/components/home/NewsSection.jsx', 'src/components/home/EventsSection.jsx']) {
    const source = read(path);
    assert.match(source, /setLoadState\('loading'\)/);
    assert.match(source, /setLoadState\('error'\)/);
    assert.match(source, /setLoadState\('ready'\)/);
    assert.match(source, /role="alert"/);
    assert.match(source, /Try again/);
    assert.match(source, /setRetry\(n => n \+ 1\)/);
  }
  const news = read('src/components/home/NewsSection.jsx');
  assert.match(news, /const dotsList = filtered\.length > 1 \? filtered : \[\]/);
  assert.match(news, /aria-pressed=\{activeFilter === f\}/);
});

test('campus carousel motion is optional and keyboard controlled', () => {
  const section = read('src/components/home/ExploreSection.jsx');
  assert.match(section, /useState\(true\).*userPaused|\[userPaused, setUserPaused\] = useState\(true\)/);
  assert.match(section, /isPaused \|\| reducedMotion \|\| userPaused/);
  assert.match(section, /onKeyDown=\{event => \{/);
  assert.match(section, /aria-selected=\{active === i\}/);
  assert.match(section, /tabIndex=\{active === i \? 0 : -1\}/);
});

test('admin content-search controls are explicitly accessible', () => {
  const manager = read('src/admin/ContentManager.jsx');
  assert.match(manager, /aria-label=\{`Search \$\{config\.title\}`\}/);
  assert.match(manager, /aria-label=\{`Filter \$\{config\.title\} by publication status`\}/);
});
