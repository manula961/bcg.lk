import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { manageUsers, requireSuperAdmin, safeAccount } from '../api/_lib/user-admin.mjs';

const source = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('Authentication responses never return sensitive credential fields', () => {
  const result = safeAccount({
    localId: 'testuser', email: 'staff@example.test',
    displayName: 'Staff Member', passwordHash: 'redacted',
    salt: 'redacted', refreshToken: 'redacted',
  });
  assert.deepEqual(Object.keys(result).sort(), [
    'uid', 'email', 'displayName', 'disabled', 'emailVerified', 'createdAt', 'lastLoginAt',
  ].sort());
  assert.ok(!JSON.stringify(result).includes('redacted'));
});

test('anonymous API requests cannot list or modify Firebase users', async () => {
  const request = { method: 'GET', headers: {}, query: {} };
  await assert.rejects(() => requireSuperAdmin(request), { status: 401 });
  await assert.rejects(() => manageUsers(request), { status: 401 });
  await assert.rejects(() => manageUsers({ ...request, method: 'POST' }), { status: 401 });
});

test('unsupported request methods reject before service credentials are used', async () => {
  await assert.rejects(() => manageUsers({ method: 'DELETE', headers: {} }), { status: 405 });
});

test('only safe role selections and account actions are shown in the console', () => {
  const ui = source('src/admin/UserAccountsManager.jsx');
  const roles = source('src/lib/rbac.mjs');
  for (const action of ['create', 'update', 'disable', 'enable', 'delete', 'reset']) {
    assert.ok(ui.includes(action), action);
  }
  assert.match(ui, /api\/admin\/users/);
  assert.match(ui, /getIdToken\(\)/);
  assert.match(ui, /confirmEmail/);
  assert.match(roles, /ASSIGNABLE_ROLES/);
  assert.doesNotMatch(roles, /ASSIGNABLE_ROLES = Object\.freeze\(\[[^\]]*'super_admin'/);
});

test('the role-grant path verifies a real, enabled Firebase account', () => {
  const code = source('src/admin/RoleManager.jsx');
  assert.match(code, /api\/admin\/users\?uid=/);
  assert.match(code, /account\.user\?\.uid !== uid/);
  assert.match(code, /account\.user\.disabled/);
});

test('backend protects self and Super Admin accounts, with append-only audit requests', () => {
  const code = source('api/_lib/user-admin.mjs');
  assert.match(code, /target\.uid === actor \|\| targetRole === 'super_admin'/);
  assert.match(code, /function validOrigin/);
  assert.match(code, /roleDocument\(targetUid\)/);
  assert.match(code, /userAudit/);
  assert.match(code, /roleAudit/);
  assert.match(code, /requestType: 'PASSWORD_RESET'/);
  assert.match(code, /currentDocument:/);
});
