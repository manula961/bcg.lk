import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');

test('four Life as a Nayaken detail pages retain stable slugs, titles and card links', () => {
  const pages = read('src/pages/life/lifePageData.js');
  const cards = read('src/components/home/LifeAsNayaken.jsx');
  for (const slug of ['academic-excellence', 'sports-societies', 'about-us', 'leadership']) {
    assert.ok(pages.includes("'" + slug + "':"), 'Missing page: ' + slug);
    assert.ok(cards.includes("slug: '" + slug + "'"), 'Missing card: ' + slug);
  }
  for (const title of ['Academic Excellence', 'Sports & Societies', 'About Us', 'Leadership'])
    assert.ok(pages.includes("title: '" + title + "'"), title);
  assert.match(cards, /href=\{\x60\/life\/\$\{card\.slug\}\x60\}/);
});

test('admin, life, event and published CMS routes remain distinct', () => {
  const entry = read('src/main.jsx');
  for (const guard of ['isAdminPath', 'isAboutUsPath', 'isEventsIndex',
    'eventsSlug', 'updatesSlug', 'lifeSlug', 'pageSlug'])
    assert.ok(entry.includes('else if (' + guard + ') page ='), guard);
  assert.match(entry, /page = <PublishedContentPage slug=\{pageSlug\} \/>/);
  assert.match(entry, /Object\.prototype\.hasOwnProperty\.call\(lifePages, lifeMatch\[1\]\)/);
});

test('Life detail layout retains original styles, navigation and footer', () => {
  const css = read('src/pages/life/LifeDetailPage.css');
  const page = read('src/pages/life/LifeDetailPage.jsx');
  assert.match(css, /life-detail/);
  assert.match(css, /@media/);
  assert.match(page, /import MenuBar from '\.\.\/\.\.\/components\/layout\/MenuBar'/);
  assert.match(page, /import Footer from '\.\.\/\.\.\/components\/layout\/Footer'/);
  assert.match(page, /<MenuBar \/>/);
  assert.match(page, /<Footer \/>/);
  assert.match(page, /section-container life-detail-container/);
  assert.match(page, /current\.highlights\.map/);
});

test('Sports and Societies directories are published in approved order', () => {
  const page = read('src/pages/life/LifeDetailPage.jsx');
  const sections = read('src/pages/life/components/LifePageSections.jsx');
  const directory = read('src/pages/life/components/ContentDirectory.jsx');
  assert.match(page, /<LifePageSections slug=\{normalizedSlug\} \/>/);
  const index = sections.indexOf("case 'sports-societies':");
  const societies = sections.indexOf('<ContentDirectory kind="societies" />', index);
  const sports = sections.indexOf('<ContentDirectory kind="sports" />', index);
  assert.ok(index >= 0 && societies > index && sports > societies);
  assert.match(directory, /societies:\s*\{[\s\S]*?subscribe: subscribePublishedSocieties/);
  assert.match(directory, /sports:\s*\{[\s\S]*?subscribe: subscribePublishedSports/);
  assert.match(directory, /records\.map/);
  assert.doesNotMatch(sections, /extracurricular/i);
  assert.doesNotMatch(directory, /extracurricular/i);
});

test('Life pages retain school highlights, About Us history and academic resources', () => {
  const page = read('src/pages/life/LifeDetailPage.jsx');
  const sections = read('src/pages/life/components/LifePageSections.jsx');
  assert.match(page, /current\.overview/);
  assert.match(sections, /case 'about-us':[\s\S]*?<Timeline \/>/);
  assert.match(sections, /case 'academic-excellence':[\s\S]*?<PastPapersPreview \/>/);
  assert.match(sections, /case 'leadership':[\s\S]*?<ContentDirectory kind="leadership" \/>/);
});
