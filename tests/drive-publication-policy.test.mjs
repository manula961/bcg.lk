import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { readFileSync } from 'node:fs';
import { assertPublicDriveUploadApproved } from '../api/_lib/drive-publication-policy.mjs';
import { seal, cookies } from '../api/_lib/drive.mjs';
import imageUpload from '../api/drive/upload.js';
import paperUpload from '../api/drive/papers-upload.js';

const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const envKeys = [
  'GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET',
  'GOOGLE_OAUTH_REDIRECT_URI', 'DRIVE_COOKIE_ENCRYPTION_KEY',
  'FIREBASE_PROJECT_ID', 'FIREBASE_WEB_API_KEY',
  'BCG_ALLOW_PUBLIC_DRIVE_UPLOADS',
];
const pdf = Buffer.from(
  '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n' +
  'xref\n0 1\n0000000000 65535 f \ntrailer\n<< /Root 1 0 R >>\n' +
  'startxref\n9\n%%EOF\n', 'ascii'
);
const png = Buffer.from([137,80,78,71,13,10,26,10,0,1,2]);

function setup() {
  const old = Object.fromEntries(envKeys.map(key => [key,process.env[key]]));
  Object.assign(process.env, {
    GOOGLE_OAUTH_CLIENT_ID: 'test-client',
    GOOGLE_OAUTH_CLIENT_SECRET: 'test-secret',
    GOOGLE_OAUTH_REDIRECT_URI: 'https://bcglk.devoraid.com/api/drive/callback',
    DRIVE_COOKIE_ENCRYPTION_KEY: 'c'.repeat(64),
    FIREBASE_PROJECT_ID: 'demo-bcg-verification',
    FIREBASE_WEB_API_KEY: 'test-firebase-key',
  });
  delete process.env.BCG_ALLOW_PUBLIC_DRIVE_UPLOADS;
  return () => {
    for (const key of envKeys) {
      if (old[key] === undefined) delete process.env[key];
      else process.env[key] = old[key];
    }
  };
}

function request(bytes, type) {
  const session = seal({
    uid: 'verified-admin',
    refresh: 'test-refresh',
    exp: Date.now() + 3600000,
  });
  return Object.assign(Readable.from([bytes]), {
    method: 'POST',
    headers: {
      origin: 'https://bcglk.devoraid.com',
      authorization: 'Bearer mock.firebase.token',
      cookie: cookies.session + '=' + session,
      'content-type': type,
    },
  });
}

function reply() {
  return {
    statusCode: 200, body: null, headers: {},
    setHeader(key, value) { this.headers[key] = value; return this; },
    status(value) { this.statusCode = value; return this; },
    json(value) { this.body = value; return this; },
  };
}

function response(json, status = 200) {
  return new Response(JSON.stringify(json), {
    status, headers: { 'content-type': 'application/json' },
  });
}

test('policy is denied by default and only exact string 1 enables immediate-public uploads', () => {
  for(const env of [{}, {BCG_ALLOW_PUBLIC_DRIVE_UPLOADS:'yes'},
    {BCG_ALLOW_PUBLIC_DRIVE_UPLOADS:'true'}, {BCG_ALLOW_PUBLIC_DRIVE_UPLOADS:'0'}]) {
    assert.throws(() => assertPublicDriveUploadApproved(env), {status:403});
  }
  assert.doesNotThrow(() => assertPublicDriveUploadApproved({BCG_ALLOW_PUBLIC_DRIVE_UPLOADS:'1'}));
});

test('image and PDF handlers check identity, session and policy before reading and sharing files', () => {
  for(const path of ['api/drive/upload.js','api/drive/papers-upload.js']) {
    const s=source(path);
    const auth=s.indexOf('requireAdmin(req');
    const session=s.indexOf('verifySession(req,uid)');
    const guard=s.indexOf('assertPublicDriveUploadApproved()');
    const read=s.indexOf(path.includes('papers-')?'readPdf(req)':'readImage(req)');
    const oauth=s.indexOf('accessToken(session.refresh)');
    assert.ok(auth>=0 && session>auth && guard>session && read>guard && oauth>read, path);
  }
});

test('authorized sessions still cannot upload public images or PDFs without owner approval', async () => {
  const reset=setup(), originalFetch=globalThis.fetch, originalError=console.error;
  const calls=[];
  try {
    console.error=()=>{};
    globalThis.fetch=async url=>{
      const address=String(url);calls.push(address);
      if(address.includes('identitytoolkit.googleapis.com'))
        return response({users:[{localId:'verified-admin'}]});
      if(address.includes('firestore.googleapis.com'))
        return response({fields:{role:{stringValue:'admin'}}});
      throw Error('Upload must not contact Google Drive or token API until approved');
    };
    for (const [handler,bytes,type] of [
      [imageUpload,png,'image/png'],[paperUpload,pdf,'application/pdf']
    ]) {
      calls.length=0;
      const res=reply();
      await handler(request(bytes,type),res);
      assert.equal(res.statusCode,403);
      assert.match(res.body?.error||'',/public-sharing policy/);
      assert.equal(calls.length,2,'Only Firebase identity and role checks may run');
    }
  } finally {
    reset();globalThis.fetch=originalFetch;console.error=originalError;
  }
});

test('explicit server-only owner approval retains the existing authenticated Drive image upload contract',async()=>{
  const reset=setup(), before=globalThis.fetch;
  const calls=[];
  try {
    process.env.BCG_ALLOW_PUBLIC_DRIVE_UPLOADS='1';
    globalThis.fetch=async(url,init)=>{
      const u=String(url);calls.push({url:u,method:init?.method});
      if(u.includes('identitytoolkit.googleapis.com'))
        return response({users:[{localId:'verified-admin'}]});
      if(u.includes('firestore.googleapis.com'))
        return response({fields:{role:{stringValue:'admin'}}});
      if(u.includes('oauth2.googleapis.com/token'))
        return response({access_token:'test-access-token'});
      if(u.includes('uploadType=multipart'))
        return response({id:'managedFile123456789'});
      if(u.endsWith('/permissions'))
        return response({id:'public-reader'});
      throw Error('Unexpected external endpoint: '+u);
    };
    const res=reply();
    await imageUpload(request(png,'image/png'),res);
    assert.equal(res.statusCode,200);
    assert.equal(res.body.imageUrl,
      'https://drive.google.com/thumbnail?id=managedFile123456789&sz=w1200');
    assert.equal(calls.length,5);
    assert.equal(calls.at(-1).method,'POST');
  } finally {
    reset();globalThis.fetch=before;
  }
});
