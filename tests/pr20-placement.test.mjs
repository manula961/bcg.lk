import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');

test('Sports and Societies directory remains in its canonical Life page', () => {
  const page = read('src/pages/life/LifeDetailPage.jsx');
  const sections = read('src/pages/life/components/LifePageSections.jsx');
  assert.match(page, /<LifePageSections slug=\{normalizedSlug\} \/>/);
  const start = sections.indexOf("case 'sports-societies':");
  const clubs = sections.indexOf('<ContentDirectory kind="societies" />', start);
  const sports = sections.indexOf('<ContentDirectory kind="sports" />', start);
  assert.ok(start >= 0 && clubs > start && sports > clubs);
  assert.equal(sections.match(/<ContentDirectory kind="sports" \/>/g)?.length, 1);
  assert.doesNotMatch(sections, /extracurricular/i);
});

test('Rule #1 still protects every public Life detail component', () => {
  const guard = read('scripts/verify-no-ui-changes.mjs');
  assert.match(guard, /src\\\/\\\(\\\?:components\\\|admin\\\|pages\\\|navigation\\\|assets/);
  assert.match(guard, /tailwind\.config\.js/);
  assert.match(guard, /protectedPath/);
  assert.match(guard, /unapproved protected UI deletion/);
});
