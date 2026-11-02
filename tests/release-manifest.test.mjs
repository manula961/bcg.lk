import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildReleaseManifest, verifyReleaseManifest } from '../scripts/release-manifest.mjs';
import { generateSeoFiles } from '../scripts/generate-seo-pages.mjs';

const A = 'a'.repeat(40), B = 'b'.repeat(40);
const ORIGIN = 'https://school.example.test';
const release = {schemaVersion:1, commitSha:A, canonicalOrigin:ORIGIN, production:true};
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('local builds are explicitly not certified production and contain no secret values',()=>{
  const manifest=buildReleaseManifest({}, ORIGIN);
  assert.deepEqual(manifest,{schemaVersion:1,commitSha:null,canonicalOrigin:ORIGIN,production:false});
  assert.ok(!JSON.stringify(manifest).includes('token'));
  assert.ok(!JSON.stringify(manifest).includes('private_key'));
  assert.throws(()=>verifyReleaseManifest(manifest,{expectedSha:A,expectedOrigin:ORIGIN}),/does not match/);
});

test('Vercel production manifest requires the approved exact commit',()=>{
  const env={VERCEL_ENV:'production',VERCEL_GIT_COMMIT_SHA:A,BCG_APPROVED_PRODUCTION_SHA:A};
  assert.deepEqual(buildReleaseManifest(env,ORIGIN),release);
  for(const patch of [
    {BCG_APPROVED_PRODUCTION_SHA:B},
    {BCG_APPROVED_PRODUCTION_SHA:undefined},
    {VERCEL_GIT_COMMIT_SHA:undefined},
    {VERCEL_GIT_COMMIT_SHA:'not-a-sha'},
  ]) assert.throws(()=>buildReleaseManifest({...env,...patch},ORIGIN),/SHA|approved commit/);
});

test('Cloudflare production uses its own commit and explicit approval',()=>{
  assert.deepEqual(buildReleaseManifest({
    CF_PAGES:'1',CF_PAGES_BRANCH:'main',CF_PAGES_COMMIT_SHA:A,
    BCG_APPROVED_PRODUCTION_SHA:A
  },ORIGIN), release);
  assert.throws(()=>buildReleaseManifest({
    CF_PAGES:'1',CF_PAGES_BRANCH:'main',CF_PAGES_COMMIT_SHA:A,
    BCG_APPROVED_PRODUCTION_SHA:B
  },ORIGIN),/approved commit/);
});

test('preview, alternate origin and invalid SHA are never accepted as live production',()=>{
  assert.deepEqual(verifyReleaseManifest(release,{expectedSha:A,expectedOrigin:ORIGIN}),
    {commitSha:A,canonicalOrigin:ORIGIN});
  for(const bad of [
    {...release,production:false},
    {...release,commitSha:B},
    {...release,commitSha:null},
    {...release,canonicalOrigin:'https://unapproved.example.test'},
    {...release,schemaVersion:0},
    [],
    null,
  ]) assert.throws(()=>verifyReleaseManifest(bad,{expectedSha:A,expectedOrigin:ORIGIN}),
    /does not match/);
  assert.throws(()=>verifyReleaseManifest(release,{expectedSha:'main',expectedOrigin:ORIGIN}),
    /40-character/);
});

test('build rejects malicious canonical URL without changing visible HTML',()=>{
  for(const bad of ['http://school.example.test','https://school.example.test/',
    'https://user:pass@school.example.test','https://school.example.test/other']) {
    assert.throws(()=>buildReleaseManifest({},bad),/HTTPS origin/);
  }
});

test('SEO build emits public non-secret provenance without changing home HTML',()=>{
  const root=mkdtempSync(join(tmpdir(),'bcg-release-'));
  const template=read('index.html');
  try{
    writeFileSync(join(root,'index.html'),template);
    generateSeoFiles(root);
    const file=JSON.parse(readFileSync(join(root,'release.json'),'utf8'));
    assert.equal(file.schemaVersion,1);
    assert.equal(file.production,false);
    assert.match(file.canonicalOrigin,/^https:\/\//);
    const builtHome = readFileSync(join(root,'index.html'),'utf8');
    assert.ok(builtHome.includes('<div id="root"></div>'));
    assert.ok(builtHome.includes('<script type="module" src="/src/main.jsx"></script>'));
    // Canonical metadata and optional Cloudflare beacon may differ by approved environment.
  } finally { rmSync(root,{recursive:true,force:true}); }
});

test('manual production read-only smoke requires an owner approved SHA and exact HTTPS origin',()=>{
  const workflow=read('.github/workflows/production-readonly-smoke.yml');
  const smoke=read('scripts/check-public-deployment.mjs');
  assert.match(workflow,/expected_sha:/);
  assert.match(workflow,/required: true/);
  assert.match(workflow,/BCG_EXPECTED_DEPLOYED_SHA:/);
  assert.match(smoke,/verifyReleaseManifest/);
  assert.match(smoke,/method: 'GET'/);
  assert.doesNotMatch(smoke,/method: '(?:POST|PATCH|PUT|DELETE)'/);
});
