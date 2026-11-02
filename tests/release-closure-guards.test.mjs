import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('scheduled CMS jobs cannot publish until an owner explicitly enables them', () => {
  const workflow = read('.github/workflows/cms-scheduled-publishing.yml');
  assert.match(workflow, /if: vars\.BCG_SCHEDULER_ENABLED == 'true'/);
  assert.match(workflow, /CMS_CRON_SECRET: \$\{\{ secrets\.CMS_CRON_SECRET \}\}/);
  assert.match(workflow, /\^\[A-Za-z0-9_-\]\{32,256\}\$/);
});

test('scheduler pins all publishing to approved HTTPS origin', () => {
  const workflow = read('.github/workflows/cms-scheduled-publishing.yml');
  assert.match(workflow, /BCG_APPROVED_PUBLIC_ORIGIN: \$\{\{ vars\.BCG_APPROVED_PUBLIC_ORIGIN \}\}/);
  assert.match(workflow, /assertApprovedSmokeOrigin\(value, \{approvedOrigin:value, required:true\}\)/);
  assert.match(workflow, /BCG_APPROVED_PUBLIC_ORIGIN\}\/api\/cron\/publish/);
  assert.doesNotMatch(workflow, /curl[^\n]*https:\/\//);
});

test('browser smoke locates actual user-manager screen and account by email', () => {
  const script = read('tests/visual/admin-e2e.mjs');
  assert.match(script, /getByRole\('region', \{ name: 'Firebase Authentication users' \}\)/);
  assert.match(script, /hasText: email/);
  assert.doesNotMatch(script, /Role-Based Access Control/);
  assert.doesNotMatch(script, /hasText: identity\.localId/);
  assert.match(script, /Revoke Role/);
  assert.match(script, /Your console access has been removed/);
});
