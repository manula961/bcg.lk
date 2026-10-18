import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('four Life as a Nayaken detail pages have stable paths and source-based titles', () => {
  const pages = read('src/pages/lifePageData.js');
  for (const slug of ['academic-excellence', 'sports-societies', 'about-us', 'leadership']) {
    assert.ok(pages.includes("'" + slug + "':"), 'Missing page ' + slug);
  }
  for (const heading of ['Academic Excellence', 'Sports & Societies', 'About Us', 'Leadership']) {
    assert.ok(pages.includes("title: '" + heading + "'"), 'Missing heading ' + heading);
  }
  assert.match(read('src/components/LifeAsNayaken.jsx'), /href=\{`\/life\/\$\{card\.slug\}`\}/);
  assert.match(read('src/pages/LifeDetailPage.jsx'), /href="\/" onClick=\{handleBackToHome\}/);
});

test('homepage and admin routes remain the unchanged defaults', () => {
  const entry = read('src/main.jsx');
  assert.match(entry, /if \(isAdminPath\) return /);
  assert.match(entry, /if \(isAboutUsPath\) return /);
  assert.match(entry, /if \(isEventsIndex\) return /);
  assert.match(entry, /if \(eventsSlug\) return /);
  assert.match(entry, /if \(updatesSlug\) return /);
  assert.match(entry, /if \(lifeSlug\) return /);
  assert.match(entry, /if \(pageSlug\) return /);
  assert.match(entry, /<PublishedContentPage slug=\{pageSlug\} \/>/);
  assert.match(entry, /Object\.prototype\.hasOwnProperty\.call\(lifePages, lifeMatch\[1\]\)/);
  const home = read('src/components/LifeAsNayaken.jsx');
  assert.match(home, /life-bento-grid/);
  assert.match(home, /className="life-bento-section"/);
});

test('Life detail page retains its existing stylesheet and responsive rules', () => {
  const css = read('src/pages/LifeDetailPage.css');
  assert.match(css, /life-detail/);
  assert.match(css, /@media/);
});

test('detail pages reuse the original homepage navigation, footer and layout container', () => {
  const source = read('src/pages/LifeDetailPage.jsx');
  assert.match(source, /import MenuBar from '\.\.\/components\/MenuBar'/);
  assert.match(source, /import Footer from '\.\.\/components\/Footer'/);
  assert.match(source, /<MenuBar \/>/);
  assert.match(source, /<Footer \/>/);
  assert.match(source, /section-container life-detail-container/);
});


test('Life detail pages render existing editorial content and CMS directories', () => {
  const pages = read('src/pages/LifeDetailPage.jsx');
  assert.match(pages, /current\.highlights\.map/);
  assert.match(pages, /normalizedSlug === 'sports-societies' && \(/);
  assert.match(pages, /<SocietiesListing \/>/);
  assert.match(pages, /<SchoolContentListing kind="sports" \/>/);
});

test('replacement cards lead to current routes, never retired pages', () => {
  const source = read('src/components/LifeAsNayaken.jsx');
  const pages = read('src/pages/lifePageData.js');
  for (const slug of ['academic-excellence','sports-societies','about-us','leadership']) {
    assert.ok(source.includes("slug: '" + slug + "'"), 'Unlinked card: ' + slug);
    assert.match(source, /href=\{`\/life\/\$\{card\.slug\}`\}/);
    assert.ok(pages.includes("'" + slug + "':"), 'Missing detail page: ' + slug);
  }
  assert.doesNotMatch(source, /Arts & Culture|Prefect Council/);
  assert.doesNotMatch(pages, /'arts-culture':|'prefect-council':/);
  assert.match(source, /<a[\s\S]*?href=\{`\/life\/\$\{card\.slug\}`\}/);
});

test('Sports and Societies retains admin-managed directory', () => {
  const source = read('src/pages/LifeDetailPage.jsx');
  assert.match(source, /normalizedSlug === 'sports-societies' && \(/);
  assert.match(source, /<SocietiesListing \/>/);
  assert.match(source, /life-detail-top-wrapper/);
  assert.match(source, /life-content-group/);
});
