import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import {
  seal, unseal, oauthStart, checkOAuthState, readImage, requireSameOrigin,
  verifySession, requireMethod, cookieValue, cookies,
} from '../api/_lib/drive.mjs';

test('OAuth cookies are AES-GCM sealed and tampering is rejected', () => {
  const previous=process.env.DRIVE_COOKIE_ENCRYPTION_KEY;
  process.env.DRIVE_COOKIE_ENCRYPTION_KEY='a'.repeat(64);
  try {
    const value=seal({uid:'admin',refresh:'private-token',exp:Date.now()+10000});
    assert.ok(!value.includes('private-token'));
    assert.equal(unseal(value).refresh,'private-token');
    const raw=Buffer.from(value,'base64url');
    raw[raw.length-1]^=1;
    assert.throws(()=>unseal(raw.toString('base64url')));
    assert.throws(()=>unseal('not-a-cookie'));
  } finally {
    if(previous===undefined)delete process.env.DRIVE_COOKIE_ENCRYPTION_KEY;
    else process.env.DRIVE_COOKIE_ENCRYPTION_KEY=previous;
  }
});

test('OAuth uses drive.file, offline consent, state, PKCE and an exact redirect', () => {
  const old={...process.env};
  try {
    process.env.DRIVE_COOKIE_ENCRYPTION_KEY='a'.repeat(64);
    process.env.GOOGLE_OAUTH_CLIENT_ID='oauth-client';
    process.env.GOOGLE_OAUTH_REDIRECT_URI='https://bcglk.devoraid.com/api/drive/callback';
    const flow=oauthStart('verified-admin');
    const url=new URL(flow.url);
    assert.equal(url.origin,'https://accounts.google.com');
    assert.equal(url.searchParams.get('scope'),'https://www.googleapis.com/auth/drive.file');
    assert.equal(url.searchParams.get('access_type'),'offline');
    assert.equal(url.searchParams.get('code_challenge_method'),'S256');
    const req={headers:{cookie:cookies.state+'='+flow.cookie}};
    assert.equal(checkOAuthState(req,flow.state).uid,'verified-admin');
    assert.throws(()=>checkOAuthState(req,'incorrect'));
    assert.equal(cookieValue(req,cookies.state),flow.cookie);
    requireSameOrigin({headers:{origin:'https://bcglk.devoraid.com'}});
    assert.throws(()=>requireSameOrigin({headers:{origin:'https://evil.example'}}));
    assert.throws(()=>verifySession(req,'verified-admin'));
  } finally {
    process.env=old;
  }
});

test('server validates media types and rejects oversized input', async () => {
  const good=Readable.from([Buffer.from([137,80,78,71,13,10,26,10])]);
  good.headers={'content-type':'image/png'};
  const img=await readImage(good);
  assert.equal(img.type,'image/png');
  assert.match(img.name,/^bcg-[a-f0-9-]+\.png$/);
  const forged=Readable.from([Buffer.from('not-a-real-png')]);
  forged.headers={'content-type':'image/png'};
  await assert.rejects(()=>readImage(forged),/does not match/);
  const forbidden=Readable.from([Buffer.from('file')]);
  forbidden.headers={'content-type':'text/html'};
  await assert.rejects(()=>readImage(forbidden));
  const huge=Readable.from([Buffer.alloc(4*1024*1024+1)]);
  huge.headers={'content-type':'image/png'};
  await assert.rejects(()=>readImage(huge),/4 MB/);
});

test('HTTP handlers explicitly reject unsupported verbs', () => {
  let code;let body;
  const res={setHeader(){},status(value){code=value;return this;},json(value){body=value;}};
  assert.equal(requireMethod({method:'GET'},res,'POST'),false);
  assert.equal(code,405);
  assert.equal(body.error,'Method not allowed');
});

test('admin client never receives or saves refresh tokens', async () => {
  const {readFileSync}=await import('node:fs');
  const source=readFileSync(new URL('../src/lib/googleDriveUpload.js',import.meta.url),'utf8');
  const manager=readFileSync(new URL('../src/admin/ContentManager.jsx',import.meta.url),'utf8');
  assert.match(source,/user\.getIdToken\(\)/);
  assert.match(source,/\/api\/drive\/upload/);
  assert.match(source,/\/api\/drive\/connect/);
  assert.doesNotMatch(source,/refresh_token|client_secret|googleapis\.com/);
  assert.match(manager,/Connect Google Drive/);
  assert.match(manager,/Upload to Google Drive/);
});

test('Drive session expiry, identity and refresh token validation rejects malformed payloads', () => {
  const previous = process.env.DRIVE_COOKIE_ENCRYPTION_KEY;
  process.env.DRIVE_COOKIE_ENCRYPTION_KEY = 'a'.repeat(64);
  try {
    const request = payload => ({ headers: { cookie: cookies.session + '=' + seal(payload) } });
    const valid = { uid: 'verified-admin', refresh: 'private-token', exp: Date.now() + 60000 };
    assert.equal(verifySession(request(valid), valid.uid).uid, valid.uid);
    assert.throws(() => verifySession(request(valid), 'other-admin'), { status: 401 });
    for (const payload of [
      null, [], 'string', { ...valid, uid: null }, { ...valid, refresh: '' },
      { ...valid, refresh: {} }, { ...valid, refresh: 42 },
      { ...valid, exp: Date.now() - 1000 },
      { ...valid, exp: Date.now() + 31 * 86400000 },
      { ...valid, exp: 'tomorrow' }, { ...valid, exp: Infinity },
    ]) assert.throws(() => verifySession(request(payload), valid.uid), { status: 401 });
  } finally {
    if (previous === undefined) delete process.env.DRIVE_COOKIE_ENCRYPTION_KEY;
    else process.env.DRIVE_COOKIE_ENCRYPTION_KEY = previous;
  }
});

test('OAuth state rejects expired, future, malformed and mismatched values', () => {
  const previous = {
    key: process.env.DRIVE_COOKIE_ENCRYPTION_KEY,
    redirect: process.env.GOOGLE_OAUTH_REDIRECT_URI,
    client: process.env.GOOGLE_OAUTH_CLIENT_ID,
  };
  process.env.DRIVE_COOKIE_ENCRYPTION_KEY = 'a'.repeat(64);
  process.env.GOOGLE_OAUTH_REDIRECT_URI = 'https://bcg.example/api/drive/callback';
  process.env.GOOGLE_OAUTH_CLIENT_ID = 'test-client';
  try {
    const flow = oauthStart('verified-admin');
    const valid = unseal(flow.cookie);
    const request = payload => ({ headers: { cookie: cookies.state + '=' + seal(payload) } });
    assert.equal(checkOAuthState(request(valid), flow.state).uid, 'verified-admin');
    for (const payload of [
      null, [], 'text', { ...valid, exp: Date.now() - 1000 },
      { ...valid, exp: Date.now() + 700000 }, { ...valid, exp: 'later' },
      { ...valid, uid: '' }, { ...valid, uid: {} },
      { ...valid, nonce: '' }, { ...valid, nonce: 'short' },
      { ...valid, nonce: {} }, { ...valid, nonce: '!' + valid.nonce.slice(1) },
      { ...valid, verifier: '' }, { ...valid, verifier: 'short' },
      { ...valid, verifier: {} }, { ...valid, verifier: '!' + valid.verifier.slice(1) },
    ]) assert.throws(() => checkOAuthState(request(payload), flow.state));
    for (const state of ['', 'wrong', null, {}, '!' + flow.state.slice(1), 'a'.repeat(32)]) {
      assert.throws(() => checkOAuthState(request(valid), state));
    }
  } finally {
    for (const [name, value] of [
      ['DRIVE_COOKIE_ENCRYPTION_KEY', previous.key],
      ['GOOGLE_OAUTH_REDIRECT_URI', previous.redirect],
      ['GOOGLE_OAUTH_CLIENT_ID', previous.client],
    ]) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});
