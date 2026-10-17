import test from 'node:test';
import assert from 'node:assert/strict';
import {
  requireAdmin, revokeGoogleAccess, driveUpload, oauthStart, unseal,
  cookies, errorReply,
} from '../api/_lib/drive.mjs';
import callback from '../api/drive/callback.js';

const json = (data, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => data });

function withEnv(keys, values) {
  const before = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  Object.assign(process.env, values);
  return () => {
    for (const key of keys) {
      if (before[key] === undefined) delete process.env[key];
      else process.env[key] = before[key];
    }
  };
}

function response() {
  return {
    headers: {}, code: 200, payload: null, redirectTo: null,
    setHeader(key, value) { this.headers[key] = value; return this; },
    status(code) { this.code = code; return this; },
    json(payload) { this.payload = payload; return this; },
    redirect(code, url) { this.code = code; this.redirectTo = url; return this; },
  };
}

test('Firebase Auth token is checked and admin role must match the exact UID', async () => {
  const restoreEnv = withEnv(['FIREBASE_WEB_API_KEY', 'FIREBASE_PROJECT_ID'], {
    FIREBASE_WEB_API_KEY: 'test-web-api-key', FIREBASE_PROJECT_ID: 'demo-bcg-verification',
  });
  const originalFetch = globalThis.fetch;
  const requests = [];
  try {
    globalThis.fetch = async (url, options = {}) => {
      requests.push({ url: String(url), options });
      if (String(url).includes('identitytoolkit.googleapis.com'))
        return json({ users: [{ localId: 'verified-admin' }] });
      if (String(url).includes('firestore.googleapis.com'))
        return json({ fields: { role: { stringValue: 'admin' } } });
      throw Error('Unexpected API endpoint');
    };
    assert.equal(await requireAdmin({ headers: { authorization: 'Bearer valid.firebase.token' } }), 'verified-admin');
    assert.equal(requests.length, 2);
    assert.ok(requests[1].url.includes('/documents/admins/verified-admin'));
    assert.equal(requests[1].options.headers.Authorization, 'Bearer valid.firebase.token');

    globalThis.fetch = async url => String(url).includes('identitytoolkit.googleapis.com')
      ? json({ users: [{ localId: 'verified-admin' }] })
      : json({ fields: { role: { stringValue: 'editor' } } });
    await assert.rejects(() => requireAdmin({ headers: { authorization: 'Bearer valid.firebase.token' } }), { status: 403 });

    globalThis.fetch = async () => json({}, 401);
    await assert.rejects(() => requireAdmin({ headers: { authorization: 'Bearer invalid' } }), { status: 401 });
    await assert.rejects(() => requireAdmin({ headers: {} }), { status: 401 });
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test('Drive permissions must succeed before a public thumbnail URL is returned', async () => {
  const previous = globalThis.fetch;
  const requests = [];
  const image = { name: 'test.png', type: 'image/png', bytes: Buffer.from([137,80,78,71,13,10,26,10]) };
  try {
    globalThis.fetch = async (url, init) => {
      requests.push({ url: String(url), init });
      if (String(url).includes('uploadType=multipart')) return json({ id: 'theFileId123456' });
      if (String(url).endsWith('/permissions')) return json({ id: 'public-reader' });
      throw Error('Unexpected call');
    };
    const done = await driveUpload('mock-access-token', image);
    assert.equal(done.imageUrl, 'https://drive.google.com/thumbnail?id=theFileId123456&sz=w1200');
    assert.equal(requests.length, 2);
    assert.match(requests[1].init.body, /"type":"anyone","role":"reader"/);

    requests.length = 0;
    globalThis.fetch = async (url, init) => {
      requests.push({ url: String(url), init });
      if (String(url).includes('uploadType=multipart')) return json({ id: 'theFileId123456' });
      if (String(url).endsWith('/permissions')) return json({}, 403);
      if (init?.method === 'DELETE') return json({});
      throw Error('Unexpected call');
    };
    await assert.rejects(() => driveUpload('mock-access-token', image), /permission was rejected/);
    assert.equal(requests.at(-1).init.method, 'DELETE');
  } finally {
    globalThis.fetch = previous;
  }
});

test('Disconnect revokes Google grant with server-side token, not query parameters', async () => {
  const previous = globalThis.fetch;
  try {
    let called;
    globalThis.fetch = async (url, options) => {
      called = { url: String(url), options };
      return { ok: true, status: 200 };
    };
    await revokeGoogleAccess('hidden-refresh-token');
    assert.equal(called.url, 'https://oauth2.googleapis.com/revoke');
    assert.equal(called.options.method, 'POST');
    assert.equal(new URLSearchParams(called.options.body).get('token'), 'hidden-refresh-token');
    assert.ok(!called.url.includes('hidden-refresh-token'));
    globalThis.fetch = async () => ({ ok: false, status: 503 });
    await assert.rejects(() => revokeGoogleAccess('token'), /revocation request failed/);
    await assert.rejects(() => revokeGoogleAccess(''), { status: 400 });
  } finally {
    globalThis.fetch = previous;
  }
});

test('OAuth callback trades code with PKCE then sets an encrypted HttpOnly cookie', async () => {
  const previous = globalThis.fetch;
  const values = {
    DRIVE_COOKIE_ENCRYPTION_KEY: 'b'.repeat(64),
    GOOGLE_OAUTH_CLIENT_ID: 'client-test',
    GOOGLE_OAUTH_CLIENT_SECRET: 'secret-test',
    GOOGLE_OAUTH_REDIRECT_URI: 'https://bcglk.devoraid.com/api/drive/callback',
    FIREBASE_PROJECT_ID: 'test-firebase',
    FIREBASE_WEB_API_KEY: 'test-firebase-key',
  };
  const reset = withEnv(Object.keys(values), values);
  try {
    const flow = oauthStart('verified-admin');
    let tokenForm;
    globalThis.fetch = async (_, init) => {
      tokenForm = new URLSearchParams(init.body);
      return json({ refresh_token: 'secret-refresh-token', access_token: 'unused-access' });
    };
    const req = {
      method: 'GET', query: { code: 'one-time-code', state: flow.state },
      headers: { cookie: cookies.state+'='+flow.cookie },
    };
    const res = response();
    await callback(req, res);
    assert.equal(res.code, 303);
    assert.equal(res.redirectTo, 'https://bcglk.devoraid.com/admin?drive=connected');
    assert.equal(tokenForm.get('grant_type'), 'authorization_code');
    assert.ok(tokenForm.get('code_verifier'));
    assert.equal(tokenForm.get('redirect_uri'), values.GOOGLE_OAUTH_REDIRECT_URI);
    const sessionCookie = res.headers['Set-Cookie'].find(x => x.startsWith(cookies.session+'='));
    assert.ok(sessionCookie.includes('HttpOnly; Secure; SameSite=Lax'));
    const encrypted = sessionCookie.split(';')[0].split('=')[1];
    const payload = unseal(encrypted);
    assert.equal(payload.uid, 'verified-admin');
    assert.equal(payload.refresh, 'secret-refresh-token');

    const invalid = response();
    await callback({ ...req, query: { code:'another-code', state:'bad-state' } }, invalid);
    assert.equal(invalid.redirectTo, 'https://bcglk.devoraid.com/admin?drive=error');
  } finally {
    globalThis.fetch = previous;
    reset();
  }
});

test('internal errors are redacted from API responses', () => {
  const res = response();
  const savedError = console.error;
  console.error = () => {};
  try {
    errorReply(res, new Error('secret-google-token-was-rejected'));
    assert.equal(res.code, 500);
    assert.ok(!JSON.stringify(res.payload).includes('secret-google-token'));
  } finally { console.error = savedError; }
});

test('admin boundary rejects malformed Firebase account identities and roles', async () => {
  const restore = withEnv(['FIREBASE_WEB_API_KEY', 'FIREBASE_PROJECT_ID'], {
    FIREBASE_WEB_API_KEY: 'test-web-api-key', FIREBASE_PROJECT_ID: 'demo-bcg-verification',
  });
  const original = globalThis.fetch;
  const req = { headers: { authorization: 'Bearer valid.firebase.token' } };
  try {
    for (const users of [
      undefined, null, [], [{ localId: '' }], [{ localId: '../other' }],
      [{ localId: 42 }], [{ localId: 'admin', disabled: true }],
      [{ localId: 'admin' }, { localId: 'other' }],
    ]) {
      let calls = 0;
      globalThis.fetch = async () => { calls++; return json({ users }); };
      await assert.rejects(() => requireAdmin(req), { status: 401 });
      assert.equal(calls, 1, 'invalid identity must not reach Firestore');
    }
    for (const role of ['auditor', 'editor', '', undefined]) {
      globalThis.fetch = async url => String(url).includes('identitytoolkit.googleapis.com')
        ? json({ users: [{ localId: 'admin' }] })
        : json(role === undefined ? {} : { fields: { role: { stringValue: role } } });
      await assert.rejects(() => requireAdmin(req), { status: 403 });
    }
    globalThis.fetch = async url => String(url).includes('identitytoolkit.googleapis.com')
      ? json({ users: [{ localId: 'admin' }] })
      : json({}, 403);
    await assert.rejects(() => requireAdmin(req), { status: 403 });
  } finally {
    globalThis.fetch = original;
    restore();
  }
});

test('session cookie parsing rejects ambiguous duplicate and oversized headers', async () => {
  const { cookieValue, verifySession, seal } = await import('../api/_lib/drive.mjs');
  const previous = process.env.DRIVE_COOKIE_ENCRYPTION_KEY;
  process.env.DRIVE_COOKIE_ENCRYPTION_KEY = 'a'.repeat(64);
  try {
    const payload = seal({ uid: 'admin', refresh: 'token', exp: Date.now() + 60000 });
    const name = cookies.session;
    assert.equal(cookieValue({ headers: { cookie: name + '=' + payload } }, name), payload);
    const duplicated = { headers: { cookie: name + '=' + payload + '; ' + name + '=malicious' } };
    assert.equal(cookieValue(duplicated, name), null);
    assert.throws(() => verifySession(duplicated, 'admin'), { status: 401 });
    assert.equal(cookieValue({ headers: { cookie: name + '=' + 'x'.repeat(8200) } }, name), null);
    assert.equal(cookieValue({ headers: {} }, name), null);
  } finally {
    if (previous === undefined) delete process.env.DRIVE_COOKIE_ENCRYPTION_KEY;
    else process.env.DRIVE_COOKIE_ENCRYPTION_KEY = previous;
  }
});
