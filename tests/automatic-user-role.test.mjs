import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('adding a user automatically provisions the chosen Firestore role on the server', () => {
  const service = read('api/_lib/user-admin.mjs');
  const form = read('src/admin/UserAccountsManager.jsx');
  assert.match(form, /action: 'create', \.\.\.createForm/);
  assert.match(form, /Initial access role/);
  assert.match(service, /await setRole\(actor\.uid, createdUid, createRole\)/);
  assert.match(service, /disabled: true/);
  assert.match(service, /disableUser: false/);
});

test('manual UID role grant form is removed while existing role management remains available', () => {
  const source = read('src/admin/RoleManager.jsx');
  assert.doesNotMatch(source, /role-target-uid|Paste exact Firebase Authentication UID|aria-label="Role assignment"/);
  assert.match(source, /<UserAccountsManager/);
  const userList = read('src/admin/UserAccountsManager.jsx');
  assert.match(userList, /onAssignRole\(user\.uid, chosenRole\)/);
  assert.match(userList, /onRevokeRole\(\{ uid: user\.uid, role: activeRole \}\)/);
});
