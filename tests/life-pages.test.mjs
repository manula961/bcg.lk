import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('four Life as a Nayaken detail pages have stable paths and source-based titles', () => {
  const pages = read('src/pages/LifeDetailPage.jsx');
  for (const slug of ['academic-excellence', 'sports-athletics', 'arts-culture', 'prefect-council']) {
    assert.ok(pages.includes("'" + slug + "':"), 'Missing page ' + slug);
  }
  for (const heading of ['Academic Excellence', 'Sports & Athletics', 'Arts & Culture', 'Prefect Council']) {
    assert.ok(pages.includes("title: '" + heading + "'"), 'Missing heading ' + heading);
  }
  assert.match(pages, /href=\{'\/life\/' \+ key\}/);
  assert.match(pages, /href="\/#extracurricular"/);
});

test('homepage and admin routes remain the unchanged defaults', () => {
  const entry = read('src/main.jsx');
  assert.match(entry, /isAdminPath \? <AdminApp \/> : lifeSlug \? <LifeDetailPage slug=\{lifeSlug\} \/> : <App \/>/);
  assert.match(entry, /Object\.prototype\.hasOwnProperty\.call\(lifePages, lifeMatch\[1\]\)/);
  const home = read('src/components/LifeAsNayaken.jsx');
  assert.match(home, /life-bento-grid/);
  assert.match(home, /className="life-section"/);
});

test('new pages follow the original school typography and palette', () => {
  const css = read('src/pages/LifeDetailPage.css');
  for (const value of ['#7B1C1C', '#1a3a6b', '#C9A84C', "'Cinzel'", "'Geologica'", "'Oswald'"]) {
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
