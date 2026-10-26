import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8');

test('the normal CMS admin action uses server-audited archive and restore, never direct hard delete', () => {
  const manager = read('src/admin/ContentManager.jsx');
  assert.match(manager, /getArchiveStatus\(kind, item\.id\)/);
  assert.match(manager, /await archiveCmsRecord\(kind, item\.id\)/);
  assert.match(manager, /await restoreCmsRecord\(kind, item\.id\)/);
  assert.match(manager, /Archive \/ Restore/);
  assert.doesNotMatch(manager, /await config\.remove\(/);
  assert.doesNotMatch(manager, /Permanently delete/);
  assert.match(manager, /Publicly shared Drive files remain accessible/);
});

test('the authenticated archive client never sends tokens to arbitrary destinations', () => {
  const client = read('src/lib/cmsWorkflowClient.js');
  assert.match(client, /from '\.\/firebase'/);
  assert.match(client, /await user\.getIdToken\(\)/);
  assert.match(client, /\/api\/admin\/workflow/);
  assert.match(client, /credentials: 'same-origin'/);
  assert.match(client, /action: 'trash'/);
  assert.match(client, /JSON\.stringify\(\{ action, kind, id \}\)/);
  assert.match(client, /'archive'/);
  assert.match(client, /'restore'/);
  assert.doesNotMatch(client, /deleteDoc\s*\(/);
});

test('archive service saves a snapshot and restores records as unpublished', () => {
  const backend = read('api/_lib/cms-workflow.mjs');
  assert.match(backend, /act === 'archive'/);
  assert.match(backend, /snapshot:fstr\(JSON\.stringify\(existing\.fields \|\| \{\}\)\)/);
  assert.match(backend, /act === 'restore'/);
  assert.match(backend, /published:fbool\(false\)/);
  assert.match(backend, /writes\.push\(audit\(/);
});
