import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('Sports and Societies directory remains in its canonical page', () => {
  const source = read('src/pages/LifeDetailPage.jsx');
  const directory = [
    "{normalizedSlug === 'sports-societies' && (",
    "<SocietiesListing />",
    "<SchoolContentListing kind=\"sports\" />",
  ];
  let previous = -1;
  for (const entry of directory) {
    const index = source.indexOf(entry);
    assert.ok(index > previous, 'Missing or incorrectly ordered directory: ' + entry);
    previous = index;
  }
  assert.equal(source.match(/<SchoolContentListing kind="sports" \/>/g)?.length, 1);
  assert.doesNotMatch(source, /slug === 'societies' && <SchoolContentListing kind="extracurricular"/);
  assert.doesNotMatch(source, /slug === 'sports-athletics' && <SchoolContentListing kind="extracurricular"/);
});

test('Rule #1 continues to protect existing public Life detail source', () => {
  const guard = read('scripts/verify-no-ui-changes.mjs');
  assert.match(guard, /\^src\\\/\(\?:components\|admin\|pages\)/);
  assert.doesNotMatch(guard, /approvedRouteFile = 'src\/pages\/LifeDetailPage\.jsx'/);
});
