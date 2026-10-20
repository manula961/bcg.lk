import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  ASSIGNABLE_ROLES, ROLE_LABELS, ROLE_PERMISSIONS,
  isConsoleRole, hasPermission, canEditRecord,
} from '../src/lib/rbac.mjs';

const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('RBAC grants least privilege by role and preserves legacy administrator rights', () => {
  for (const role of ['super_admin','admin','publisher','editor','auditor']) {
    assert.ok(isConsoleRole(role), role);
    assert.ok(ROLE_LABELS[role]);
    assert.ok(hasPermission(role, 'content.read'));
    assert.ok(Object.isFrozen(ROLE_PERMISSIONS[role]));
  }
  assert.ok(hasPermission('super_admin', 'users.manage'));
  assert.equal(hasPermission('admin', 'users.manage'), false);
  assert.equal(hasPermission('publisher', 'users.manage'), false);
  assert.ok(hasPermission('admin', 'content.delete'));
  assert.equal(hasPermission('publisher', 'content.delete'), false);
  assert.ok(hasPermission('publisher', 'content.publish'));
  assert.equal(hasPermission('editor', 'content.publish'), false);
  assert.ok(hasPermission('editor', 'content.create'));
  assert.ok(hasPermission('editor', 'media.upload'));
  assert.equal(hasPermission('auditor', 'media.upload'), false);
  assert.equal(hasPermission('auditor', 'content.edit'), false);
  assert.equal(isConsoleRole('administrator'), false);
  assert.equal(hasPermission('__proto__', 'users.manage'), false);
  assert.equal(hasPermission(undefined, 'content.read'), false);
  assert.ok(canEditRecord('editor', { published: false }));
  assert.equal(canEditRecord('editor', { published: true }), false);
  assert.equal(canEditRecord('auditor', { published: false }), false);
});

test('RBAC role manager does not expose Super Admin provisioning in the browser', () => {
  assert.ok(!ASSIGNABLE_ROLES.includes('super_admin'));
  const manager = source('src/admin/RoleManager.jsx');
  assert.match(manager, /runTransaction\(db,/);
  assert.match(manager, /UID_PATTERN/);
  assert.match(manager, /account\.role === 'super_admin'/);
  assert.match(manager, /currentUid/);
  assert.match(manager, /createdAt: serverTimestamp\(\)/);
  const rules = source('firestore.rules');
  assert.match(rules, /resource\.data\.role != 'super_admin'/);
  assert.match(rules, /uid != request\.auth\.uid/);
});

test('RBAC controls both UI and backend APIs rather than only hiding buttons', () => {
  const app = source('src/admin/AdminApp.jsx');
  const dashboard = source('src/admin/AdminDashboard.jsx');
  const editor = source('src/admin/ContentManager.jsx');
  const drive = source('api/_lib/drive.mjs');
  const rules = source('firestore.rules');
  const storage = source('storage.rules');
  assert.match(app, /isConsoleRole\(record\.data\(\)\?\.role\)/);
  assert.match(app, /stopRoleWatch\.current = onSnapshot/);
  assert.match(dashboard, /users\.manage/);
  assert.match(dashboard, /RoleManager/);
  assert.match(editor, /canEditRecord\(role, item\)/);
  assert.match(editor, /canPublish &&/);
  assert.match(editor, /canDelete &&/);
  assert.match(editor, /content\.reorder/);
  assert.match(drive, /hasPermission\(record\?\.fields\?\.role\?\.stringValue, 'media\.upload'\)/);
  assert.match(rules, /editorDraftUpdateOnly/);
  assert.match(rules, /canPublishContent/);
  assert.match(rules, /canDeleteContent/);
  assert.match(storage, /allow create: if isAdmin\(\)/);
  assert.match(storage, /allow update: if isAdmin\(\)/);
  assert.doesNotMatch(storage, /canUploadMedia/);
});
