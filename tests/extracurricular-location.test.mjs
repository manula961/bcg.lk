import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/pages/LifeDetailPage.jsx', import.meta.url), 'utf8');

test('extracurricular content displays on Sports & Athletics, not Societies', () => {
  assert.match(source, /\{slug === 'sports-athletics' && <SchoolContentListing kind="sports" \/>}\s*\{slug === 'sports-athletics' && <SchoolContentListing kind="extracurricular" \/>}/);
  assert.doesNotMatch(source, /\{slug === 'societies' && <SchoolContentListing kind="extracurricular" \/>}/);
  assert.match(source, /\{slug === 'societies' && <SocietiesListing \/>}/);
  assert.match(source, /\{slug === 'leadership' && <SchoolContentListing kind="leadership" \/>}/);
});
