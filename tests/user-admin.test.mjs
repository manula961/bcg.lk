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

test('role grants require privileged API, a real enabled identity and an auditable write', () => {
  const service = source('api/_lib/user-admin.mjs');
  const code = source('src/admin/RoleManager.jsx');
  assert.match(code, /roleRequest\(/);
  assert.match(code, /action: 'role'/);
  assert.match(service, /existing = await lookup\(targetUid\)/);
  assert.match(service, /action === 'role' && existing.disabled/);
  assert.match(service, /await setRole\(actor.uid, targetUid, role\(body.role\)\)/);
  assert.match(service, /writeAudit\(actor, targetUid/);
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


test('valid Firebase tokens still require a live Super Admin Firestore role', async () => {
  const previous = globalThis.fetch;
  const settings = ['FIREBASE_PROJECT_ID', 'FIREBASE_WEB_API_KEY'];
  const old = Object.fromEntries(settings.map(k => [k, process.env[k]]));
  process.env.FIREBASE_PROJECT_ID = 'demo-bcg-test';
  process.env.FIREBASE_WEB_API_KEY = 'example-key';
  let currentRole = 'editor';
  globalThis.fetch = async url => {
    const value = String(url);
    const data = value.includes('/accounts:lookup?key=')
      ? { users: [{ localId: 'example-user', disabled: false }] }
      : { fields: { role: { stringValue: currentRole } } };
    return { ok: true, status: 200, json: async () => data };
  };
  const request = { method: 'GET', headers: { authorization: 'Bearer ' + 'x'.repeat(45) }, query: {} };
  try {
    await assert.rejects(() => requireSuperAdmin(request), { status: 403 });
    currentRole = 'super_admin';
    const session = await requireSuperAdmin(request);
    assert.equal(session.uid, 'example-user');
  } finally {
    globalThis.fetch = previous;
    for (const [key, value] of Object.entries(old)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test('cross-origin account writes are rejected even from a verified Super Admin', async () => {
  const previous = globalThis.fetch;
  const keys = ['FIREBASE_PROJECT_ID', 'FIREBASE_WEB_API_KEY', 'USER_ADMIN_ORIGIN'];
  const old = Object.fromEntries(keys.map(k => [k, process.env[k]]));
  process.env.FIREBASE_PROJECT_ID = 'demo-bcg-test';
  process.env.FIREBASE_WEB_API_KEY = 'example-key';
  process.env.USER_ADMIN_ORIGIN = 'https://example.test';
  let requests = 0;
  globalThis.fetch = async url => {
    requests++;
    return { ok: true, status: 200, json: async () => String(url).includes('/accounts:lookup?key=')
      ? { users: [{ localId: 'example-user', disabled: false }] }
      : { fields: { role: { stringValue: 'super_admin' } } } };
  };
  try {
    await assert.rejects(() => manageUsers({
      method: 'POST', headers: {
        authorization: 'Bearer ' + 'x'.repeat(45), origin: 'https://untrusted.test',
        'content-type': 'application/json',
      }, body: { action: 'delete', uid: 'example-target' },
    }), { status: 403 });
    assert.equal(requests, 2, 'Only token and role verification may run before origin rejection');
  } finally {
    globalThis.fetch = previous;
    for (const [key, value] of Object.entries(old)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test('Users & Roles gracefully rejects a missing or malformed Vercel API response', () => {
  const component = source('src/admin/UserAccountsManager.jsx');
  assert.match(component, /const data = await res\.json\(\)\.catch\(\(\) => null\)/);
  assert.match(component, /Array\.isArray\(data\.users\)/);
  assert.match(component, /Firebase user-management API is unavailable/);
  assert.match(component, /setNotice\(\{ type: 'error', text: error\.message \}\)/);
});
