import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8');

test('Firebase compatibility audit is read-only and requires explicit local consent', () => {
  const script = read('scripts/audit-firestore-readonly.mjs');
  assert.match(script, /BCG_READONLY_AUDIT/);
  assert.match(script, /FIREBASE_AUDIT_ACCESS_TOKEN/);
  assert.match(script, /method: 'GET'/);
  assert.doesNotMatch(script, /method: '(?:POST|PUT|PATCH|DELETE)'/);
  for (const kind of ['news','events','pages','societies','sports','extracurricular','leadership'])
    assert.match(script, new RegExp(kind));
});
test('public Storage downloads do not imply anonymous directory listing', () => {
  const rules = read('storage.rules');
  assert.match(rules, /allow get: if true;/);
  assert.match(rules, /allow list: if isAdmin\(\);/);
  assert.doesNotMatch(rules, /allow read: if true;/);
});
test('public deployment smoke is GET-only and does not request admin secrets', () => {
  const script = read('scripts/check-public-deployment.mjs');
  assert.match(script, /method: 'GET'/);
  assert.match(script, /\/api\/drive\/status/);
  assert.doesNotMatch(script, /Bearer|refresh.token|Authorization/);
});
test('dependabot schedules safe dev updates without silent major framework migration', () => {
  const yaml = read('.github/dependabot.yml');
  assert.match(yaml, /interval: weekly/);
  assert.match(yaml, /dependency-name: vite/);
  assert.match(yaml, /semver-major/);
});
