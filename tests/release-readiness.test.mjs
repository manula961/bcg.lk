import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { validateReleaseConfig } from '../scripts/check-release-config.mjs';

const read = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8');

test('release preflight checks route rewrites and preserves current canonical default', () => {
  const result = validateReleaseConfig({}, false);
  assert.equal(result.ok, true, result.failures.join('; '));
  assert.ok(result.warnings.length > 0, 'non-strict checks must not claim Firebase is verified');
});

test('SPA fallback excludes media paths and keeps dynamic content paths', () => {
  const fallback = JSON.parse(read('vercel.json')).rewrites.at(-1);
  const match = new RegExp('^' + fallback.source + '$');
  for (const path of ['/audio/school-anthem.mp3', '/assets/index.js',
    '/email-assets/school-logo.png', '/api/admin/users']) {
    assert.equal(match.test(path), false, path);
  }
  assert.equal(match.test('/updates/story'), true);
});

test('reject invalid canonical origins and demo Firebase production credentials', () => {
  for (const origin of ['http://example.test', 'https://example.test/path',
    'https://example.test/', 'https://user:pass@example.test', 'not-a-url']) {
    assert.equal(validateReleaseConfig({ BCG_CANONICAL_ORIGIN: origin }, false).ok, false, origin);
  }
  const bad = validateReleaseConfig({
    BCG_CANONICAL_ORIGIN: 'https://bcglk.devoraid.com',
    FIREBASE_PROJECT_ID: 'demo-bcg-verification',
    VITE_FIREBASE_PROJECT_ID: 'demo-bcg-verification',
    FIREBASE_WEB_API_KEY: 'test',
    VITE_FIREBASE_API_KEY: 'test',
    USER_ADMIN_ORIGIN: 'https://bcglk.devoraid.com',
  }, true);
  assert.equal(bad.ok, false);
  assert.ok(bad.failures.some(x => x.includes('FIREBASE_SERVICE_ACCOUNT_JSON') || x.toLowerCase().includes('service-account')));
  assert.ok(bad.failures.some(x => x.includes('demo emulator')));
});

test('matching staging Firebase values and service account shape pass non-network preflight', () => {
  const origin = 'https://staging.example.test';
  const project = 'bcg-staging-example';
  const result = validateReleaseConfig({
    BCG_CANONICAL_ORIGIN: origin,
    FIREBASE_PROJECT_ID: project, VITE_FIREBASE_PROJECT_ID: project,
    FIREBASE_WEB_API_KEY: 'test-key', VITE_FIREBASE_API_KEY: 'test-key',
    USER_ADMIN_ORIGIN: origin,
    FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify({
      type: 'service_account', project_id: project,
      client_email: 'staging@bcg-staging-example.iam.gserviceaccount.com',
      private_key: '-----BEGIN PRIVATE KEY-----\nTEST\n-----END PRIVATE KEY-----',
    }),
  }, true);
  assert.equal(result.ok, true, result.failures.join('; '));
});

test('SEO generator accepts approved HTTPS canonical override without changing page UI', () => {
  const result = spawnSync(process.execPath, ['--input-type=module', '-e',
    "import { ORIGIN, staticSitemap } from './scripts/generate-seo-pages.mjs'; console.log(ORIGIN); console.log(staticSitemap());"], {
    cwd: new URL('..', import.meta.url), encoding: 'utf8',
    env: { ...process.env, BCG_CANONICAL_ORIGIN: 'https://staging.example.test' },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /https:\/\/staging\.example\.test\/past-papers/);
  assert.doesNotMatch(result.stdout, /bcglk\.devoraid\.com/);
});

test('read-only production verification covers SEO, security headers and admin authentication', () => {
  const script = read('scripts/check-public-deployment.mjs');
  for (const value of ['/past-papers', '/admin', '/api/admin/users',
    'x-content-type-options', 'x-frame-options', 'x-robots-tag'])
    assert.ok(script.includes(value), value);
  assert.match(script, /method: 'GET'/);
  assert.doesNotMatch(script, /method: '(POST|PATCH|PUT|DELETE)'/);
});

test('independent approval remains required on the latest PR commit', () => {
  const review = read('.github/workflows/independent-review.yml');
  assert.match(review, /review\.commit_id === pr\.head\.sha/);
  assert.match(review, /review\.state === 'APPROVED'/);
});

test('browser quality smoke asserts language, title, viewport and main landmark', () => {
  const code = read('tests/visual/smoke.mjs');
  assert.match(code, /semantics\.lang/);
  assert.match(code, /semantics\.title/);
  assert.match(code, /semantics\.viewport/);
  assert.match(code, /semantics\.mainCount/);
  assert.match(code, /navigation=/);
});

test('Vercel CommonJS handler loads ESM Firebase account backend without require()', () => {
  const handler = read('api/admin/users.js');
  assert.match(handler, /await import\('\.\.\/_lib\/user-admin\.mjs'\)/);
  assert.doesNotMatch(handler, /^import \{ manageUsers \}/m);
});

test('new CMS scheduler has indexed due-time lookup, denial checks and explicit secret validation',()=>{
  const firebase=JSON.parse(read('firebase.json'));
  const indexes=JSON.parse(read('firestore.indexes.json'));
  assert.equal(firebase.firestore.indexes,'firestore.indexes.json');
  const job=indexes.indexes.find(x=>x.collectionGroup==='cmsJobs');
  assert.deepEqual(job.fields.map(x=>[x.fieldPath,x.order]),[
    ['status','ASCENDING'],['runAt','ASCENDING']
  ]);
  const smoke=read('scripts/check-public-deployment.mjs');
  assert.match(smoke,/\/api\/cron\/publish/);
  assert.match(smoke,/\/api\/admin\/workflow/);
  const without=validateReleaseConfig({BCG_REQUIRE_WORKFLOW_SCHEDULER:'1'},true);
  assert.equal(without.ok,false);
  assert.ok(without.failures.some(x=>x.includes('CMS_CRON_SECRET')));
  const secret='s'.repeat(48);
  const withSecret=validateReleaseConfig({
    BCG_REQUIRE_WORKFLOW_SCHEDULER:'1', CMS_CRON_SECRET:secret
  },true);
  assert.equal(withSecret.failures.some(x=>x.includes('CMS_CRON_SECRET')),false);
});

test('analytics activation fails release preflight without a secure HMAC key and HTTPS origin', () => {
  const missing = validateReleaseConfig({ BCG_ANALYTICS_ENABLED: '1' }, false);
  assert.equal(missing.ok, false);
  assert.ok(missing.failures.some(message => message.includes('BCG_ANALYTICS_HASH_KEY')));
  const invalid = validateReleaseConfig({
    BCG_ANALYTICS_ENABLED: '1',
    BCG_ANALYTICS_HASH_KEY: 'a'.repeat(48),
    BCG_ANALYTICS_ORIGIN: 'http://unsafe.example.test',
  }, false);
  assert.equal(invalid.ok, false);
  const valid = validateReleaseConfig({
    BCG_ANALYTICS_ENABLED: '1',
    BCG_ANALYTICS_HASH_KEY: 'a'.repeat(48),
    BCG_ANALYTICS_ORIGIN: 'https://school.example.test',
  }, false);
  assert.equal(valid.ok, true, valid.failures.join('; '));
});
