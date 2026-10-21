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
  assert.ok(bad.failures.some(x => x.toLowerCase().includes('service-account')));
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
