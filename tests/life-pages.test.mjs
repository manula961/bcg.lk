import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('four Life as a Nayaken detail pages have stable paths and source-based titles', () => {
  const pages = read('src/pages/LifeDetailPage.jsx');
  for (const slug of ['academic-excellence', 'sports-athletics', 'societies', 'leadership']) {
    assert.ok(pages.includes("'" + slug + "':"), 'Missing page ' + slug);
  }
  for (const heading of ['Academic Excellence', 'Sports & Athletics', 'Societies', 'Leadership']) {
    assert.ok(pages.includes("title: '" + heading + "'"), 'Missing heading ' + heading);
  }
  assert.match(pages, /href=\{'\/life\/' \+ key\}/);
  assert.match(pages, /href="\/" onClick=\{handleBackToHome\}/);
});

test('homepage and admin routes remain the unchanged defaults', () => {
  const entry = read('src/main.jsx');
  assert.match(entry, /if \(isAdminPath\) return /);
  assert.match(entry, /if \(isEventsIndex\) return /);
  assert.match(entry, /if \(eventsSlug\) return /);
  assert.match(entry, /if \(updatesSlug\) return /);
  assert.match(entry, /if \(lifeSlug\) return /);
  assert.match(entry, /if \(pageSlug\) return /);
  assert.match(entry, /<PublishedContentPage slug=\{pageSlug\} \/>/);
  assert.match(entry, /Object\.prototype\.hasOwnProperty\.call\(lifePages, lifeMatch\[1\]\)/);
  const home = read('src/components/LifeAsNayaken.jsx');
  assert.match(home, /life-bento-grid/);
  assert.match(home, /className="life-section"/);
});

test('new pages follow the original school typography and palette', () => {
  const css = read('src/pages/LifeDetailPage.css');
  for (const value of ['#7B1C1C', '#1a3a6b', '#C9A84C', "'Geologica'", "'Google Sans Flex'"]) {
    assert.ok(css.includes(value), 'Missing design token ' + value);
  }
  assert.match(css, /@media \(max-width: 600px\)/);
  assert.match(css, /prefers-reduced-motion/);
});

test('detail pages reuse the original homepage navigation, footer and layout container', () => {
  const source = read('src/pages/LifeDetailPage.jsx');
  assert.match(source, /import MenuBar from '\.\.\/components\/MenuBar'/);
  assert.match(source, /import Footer from '\.\.\/components\/Footer'/);
  assert.match(source, /<MenuBar \/>/);
  assert.match(source, /<Footer \/>/);
  assert.match(source, /section-container life-detail-container/);
});


test('each detail page contains three substantive editorial sections with source links', () => {
  const pages = read('src/pages/LifeDetailPage.jsx');
  for (const heading of [
    'Pathways for every ambition',
    'Excellence in national examinations',
    'Learning through discovery',
    'Four houses, one college spirit',
    'A record across many sports',
    'Developing character through competition',
    'Science, technology and discovery',
    'Creativity and communication',
    'Citizenship and service',
    'Values that guide leadership',
    'Discipline and cadet tradition',
    'Leadership beyond a title',
  ]) assert.ok(pages.includes("heading: '" + heading + "'"), 'Missing editorial section: ' + heading);
  assert.match(pages, /current\.sections\.map/);
  assert.match(pages, /current\.highlights\.map/);
  assert.match(pages, /href=\{section\.source\}/);
  assert.match(pages, /rel="noopener noreferrer"/);
});

test('college-specific claims link back to traceable sources', () => {
  const pages = read('src/pages/LifeDetailPage.jsx');
  for (const source of [
    'https://bcg.lk/about_us',
    'https://bcg.lk/sports_achievements',
    'https://bcg.lk/cadet_band_platoon',
    'https://bcg.lk/clubs_societies',
    'https://bcss.lk/',
  ]) assert.ok(pages.includes(source), 'Missing evidence: ' + source);
});

test('replacement cards lead to current routes, never retired pages', () => {
  const source = read('src/components/LifeAsNayaken.jsx');
  const pages = read('src/pages/LifeDetailPage.jsx');
  for (const slug of ['academic-excellence','sports-athletics','societies','leadership']) {
    assert.ok(source.includes("'/life/" + slug + "'"), 'Unlinked card: ' + slug);
    assert.ok(pages.includes("'" + slug + "':"), 'Missing detail page: ' + slug);
  }
  assert.doesNotMatch(source, /Arts & Culture|Prefect Council/);
  assert.doesNotMatch(pages, /'arts-culture':|'prefect-council':/);
  assert.match(source, /role="link"\s+tabIndex=\{0\}/);
});

test('Societies hides editorial highlights but retains admin-managed directory', () => {
  const source = read('src/pages/LifeDetailPage.jsx');
  assert.match(source, /\{slug !== 'societies' && \(\s*<section className="life-detail-story"/);
  assert.match(source, /\{slug === 'societies' && <SocietiesListing \/>}/);
  assert.match(source, /life-detail-top-wrapper/);
  assert.match(source, /life-content-group/);
});

