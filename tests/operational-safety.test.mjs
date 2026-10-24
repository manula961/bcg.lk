import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8');

test('Firebase compatibility audit is read-only and requires explicit local consent', () => {
  const script = read('scripts/audit-firestore-readonly.mjs');
  assert.match(script, /BCG_READONLY_AUDIT/);
  assert.match(script, /FIREBASE_AUDIT_ACCESS_TOKEN/);
  assert.match(script, /FIREBASE_STORAGE_BUCKET/);
  assert.match(script, /storageRulesVerified/);
  assert.match(script, /method: 'GET'/);
  assert.doesNotMatch(script, /method: '(?:POST|PUT|PATCH|DELETE)'/);
  assert.match(script, /CMS_REQUIRED_FIELDS/);
  assert.match(script, /validateCmsRecord/);
  const schema = read('scripts/firestore-record-validation.mjs');
  for (const kind of ['news','events','pages','societies','sports','leadership','pastPapers'])
    assert.match(schema, new RegExp(kind));
});
test('Rules #1 and #2 guard UI config and Jaliya-authored files', () => {
  const ui = read('scripts/verify-no-ui-changes.mjs');
  const jaliya = read('scripts/verify-jaliya-preservation.mjs');
  const workflow = read('.github/workflows/backend-checks.yml');
  assert.match(ui, /tailwind\.config\.js/);
  assert.match(ui, /navigation/);
  assert.match(jaliya, /--author=JaliyaMaheshakya0529/);
  assert.match(jaliya, /--diff-filter=ACMRD/);
  assert.match(jaliya, /fail closed/);
  assert.match(workflow, /node scripts\/verify-jaliya-preservation\.mjs/);
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

test('CI builds against Vercel production Node 24 and maintained action majors', () => {
  for (const file of [
    'build.yml', 'backend-checks.yml', 'browser-smoke.yml',
    'dependency-security.yml', 'production-readonly-smoke.yml',
    'visual-regression.yml',
  ]) {
    const workflow = read('.github/workflows/' + file);
    assert.match(workflow, /node-version: '24'/);
    assert.doesNotMatch(workflow, /actions\/(?:checkout|setup-node|setup-java)@v4/);
    assert.match(workflow, /actions\/checkout@v5/);
    assert.match(workflow, /actions\/setup-node@v5/);
  }
});
