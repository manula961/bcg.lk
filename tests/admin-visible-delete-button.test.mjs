import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { hasPermission } from '../src/lib/rbac.mjs';

const source = (name) => readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const manager = source('src/admin/ContentManager.jsx');
const theme = source('src/admin/AdminFrontendTheme.css');

test('Delete is an always-rendered, labeled content-row action for every CMS section', () => {
  for (const kind of ['news','events','pages','societies','sports','leadership','pastPapers']) {
    assert.match(manager, new RegExp('\\b' + kind + ': \\{'), 'missing CMS collection: ' + kind);
  }
  assert.match(manager, /<div className="admin-row-actions">[\s\S]*?className=\{knownArchived\.has\(item\.id\) \? 'admin-btn-restore' : 'admin-btn-delete'\}/);
  assert.doesNotMatch(manager, /\(canDelete \|\| \['news', 'events', 'pages'\]\.includes\(kind\)\)/);
  assert.match(manager, /'Delete \(Admin only\)'/);
  assert.match(manager, /aria-label=\{\x60\$\{knownArchived\.has\(item\.id\)/);
});

test('Delete remains permission-controlled and uses recoverable server-side archive', () => {
  assert.equal(hasPermission('super_admin', 'content.delete'), true);
  assert.equal(hasPermission('admin', 'content.delete'), true);
  for (const role of ['publisher','editor','auditor']) {
    assert.equal(hasPermission(role, 'content.delete'), false);
  }
  assert.match(manager, /disabled=\{!canDelete \|\| !archivesReady \|\| actionId !== null\}/);
  assert.match(manager, /if \(!canDelete \|\| !archivesReady \|\| actionId !== null\) return;/);
  assert.match(manager, /await archiveCmsRecord\(kind, item\.id\)/);
  assert.match(manager, /await restoreCmsRecord\(kind, item\.id\)/);
  assert.match(manager, /window\.confirm\('Delete /);
  assert.doesNotMatch(manager, /await config\.remove\(/);
});

test('Delete and Restore have visible contrasting backgrounds, keyboard focus and responsive wrapping', () => {
  assert.match(theme, /\.admin-body \.admin-btn-delete,[\s\S]*?background: #a3212b;/);
  assert.match(theme, /\.admin-body \.admin-btn-restore \{[\s\S]*?background: #244d3b;/);
  assert.match(theme, /\.admin-body \.admin-btn-delete:focus-visible/);
  assert.match(theme, /\.admin-body \.admin-row-actions \{[\s\S]*?flex-wrap: wrap;/);
  assert.match(theme, /@media \(max-width: 840px\) \{[\s\S]*?\.admin-body \.admin-row-actions/);
  assert.match(theme, /\.admin-body \.admin-btn-delete:disabled/);
});
