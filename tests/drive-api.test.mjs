import test from 'node:test';
import assert from 'node:assert/strict';
import upload from '../api/drive/upload.js';
import connect from '../api/drive/connect.js';
import status from '../api/drive/status.js';
import disconnect from '../api/drive/disconnect.js';

const keys = [
  'GOOGLE_OAUTH_CLIENT_ID','GOOGLE_OAUTH_CLIENT_SECRET',
  'GOOGLE_OAUTH_REDIRECT_URI','DRIVE_COOKIE_ENCRYPTION_KEY',
  'FIREBASE_PROJECT_ID','FIREBASE_WEB_API_KEY',
];
function setup() {
  const original = Object.fromEntries(keys.map(key => [key,process.env[key]]));
  const values = {
    GOOGLE_OAUTH_CLIENT_ID:'mock-client',
    GOOGLE_OAUTH_CLIENT_SECRET:'mock-secret',
    GOOGLE_OAUTH_REDIRECT_URI:'https://bcglk.devoraid.com/api/drive/callback',
    DRIVE_COOKIE_ENCRYPTION_KEY:'b'.repeat(64),
    FIREBASE_PROJECT_ID:'demo-bcg-verification',
    FIREBASE_WEB_API_KEY:'mock-firebase-key',
  };
  Object.assign(process.env,values);
  return () => keys.forEach(key => original[key] === undefined ? delete process.env[key] : process.env[key] = original[key]);
}
function res() {
  return {
    code: 200, body: null, headers: {},
    setHeader(name,value) { this.headers[name]=value; return this; },
    status(value) { this.code=value; return this; },
    json(value) { this.body=value; return this; },
  };
}

test('Drive endpoints reject incorrect HTTP methods without executing external requests', async () => {
  const before=globalThis.fetch;
  globalThis.fetch=()=>{ throw Error('No remote calls expected'); };
  try {
    for(const handler of [upload,connect,status,disconnect]) {
      const reply=res();
      await handler({method:handler===status?'POST':'GET',headers:{}},reply);
      assert.equal(reply.code,405);
    }
  } finally { globalThis.fetch=before; }
});

test('Upload denies invalid Origin, anonymous users, and read-only Firebase accounts', async () => {
  const cleanup=setup();
  const originalFetch=globalThis.fetch;
  const originalError=console.error;
  console.error=()=>{};
  try {
    let called=0;
    globalThis.fetch=()=>{ called++; throw Error('Unauthorized request must not fetch'); };
    let reply=res();
    await upload({method:'POST',headers:{origin:'https://attacker.invalid',authorization:'Bearer valid.token'}},reply);
    assert.equal(reply.code,403);
    assert.equal(called,0);

    reply=res();
    await upload({method:'POST',headers:{origin:'https://bcglk.devoraid.com'}},reply);
    assert.equal(reply.code,401);
    assert.equal(called,0);

    globalThis.fetch=async url=>{
      called++;
      if(String(url).includes('identitytoolkit.googleapis.com'))
        return {ok:true,json:async()=>({users:[{localId:'auditor-account'}]})};
      if(String(url).includes('firestore.googleapis.com'))
        return {ok:true,json:async()=>({fields:{role:{stringValue:'auditor'}}})};
      throw Error('Unexpected endpoint');
    };
    reply=res();
    await upload({method:'POST',headers:{origin:'https://bcglk.devoraid.com',authorization:'Bearer valid.token'}},reply);
    assert.equal(reply.code,403);
    assert.equal(called,2);
  } finally {
    cleanup();
    globalThis.fetch=originalFetch;
    console.error=originalError;
  }
});

test('Expired or missing encrypted Drive sessions return a reconnect response', async () => {
  const cleanup=setup();
  const fetchBefore=globalThis.fetch;
  const errorBefore=console.error;
  console.error=()=>{};
  globalThis.fetch=async url=>String(url).includes('identitytoolkit')
    ? {ok:true,json:async()=>({users:[{localId:'admin-uid'}]})}
    : {ok:true,json:async()=>({fields:{role:{stringValue:'admin'}}})};
  try {
    const reply=res();
    await upload({
      method:'POST',
      headers:{origin:'https://bcglk.devoraid.com',authorization:'Bearer valid.token'},
    },reply);
    assert.equal(reply.code,401);
    assert.match(reply.body.error,/Connect Google Drive again/);
  } finally {
    cleanup();
    globalThis.fetch=fetchBefore;
    console.error=errorBefore;
  }
});
