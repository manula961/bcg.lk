import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assertProductionReleaseApproved } from '../scripts/production-release-gate.mjs';

const A = 'a'.repeat(40);
const B = 'b'.repeat(40);
const trusted = {
  VERCEL_ENV:'production',
  VERCEL_GIT_PROVIDER:'github',
  VERCEL_GIT_REPO_OWNER:'manula961',
  VERCEL_GIT_REPO_SLUG:'bcg.lk',
  VERCEL_GIT_COMMIT_REF:'main',
};

test('local and Vercel Preview builds remain usable without production credentials', () => {
  for (const env of [{}, {VERCEL_ENV:'development'}, {VERCEL_ENV:'preview',
    VERCEL_GIT_COMMIT_SHA:A,BCG_APPROVED_PRODUCTION_SHA:B}]) {
    assert.deepEqual(assertProductionReleaseApproved(env),{enforced:false});
  }
});

test('production requires a real 40-character Vercel commit SHA', () => {
  for (const bad of [undefined,'','abc','main','0'.repeat(39),'z'.repeat(40)]) {
    assert.throws(()=>assertProductionReleaseApproved({
      ...trusted,VERCEL_GIT_COMMIT_SHA:bad,
      BCG_APPROVED_PRODUCTION_SHA:A,
    }), /Vercel git commit SHA/);
  }
});

test('production rejects absent, malformed and wrong approved commit', () => {
  for(const bad of [undefined,'','true','approve',B,'a'.repeat(39),'g'.repeat(40)]) {
    assert.throws(()=>assertProductionReleaseApproved({
      ...trusted,VERCEL_GIT_COMMIT_SHA:A,
      BCG_APPROVED_PRODUCTION_SHA:bad,
    }),/Production release blocked:/);
  }
});

test('only an exact approved commit can build for production', () => {
  assert.deepEqual(assertProductionReleaseApproved({
    ...trusted,VERCEL_GIT_COMMIT_SHA:A,
    BCG_APPROVED_PRODUCTION_SHA:A,
  }),{enforced:true});
  assert.deepEqual(assertProductionReleaseApproved({
    ...trusted,VERCEL_GIT_COMMIT_SHA:A.toUpperCase(),
    BCG_APPROVED_PRODUCTION_SHA:A,
  }),{enforced:true});
});

test('Vite must check the production approval before emitting any UI bundles', () => {
  const config = readFileSync(new URL('../vite.config.mjs',import.meta.url),'utf8');
  assert.match(config,/from '\.\/scripts\/production-release-gate\.mjs'/);
  assert.match(config,/assertProductionReleaseApproved\(\)/);
  assert.ok(config.indexOf('assertProductionReleaseApproved()') < config.indexOf('export default'));
});

test('production blocks unfamiliar repository owners, providers and release branches', () => {
  const invalid = [
    {VERCEL_GIT_PROVIDER:'gitlab'},
    {VERCEL_GIT_REPO_OWNER:'unknown'},
    {VERCEL_GIT_REPO_SLUG:'other'},
    {VERCEL_GIT_COMMIT_REF:'feature'},
  ];
  for(const patch of invalid) {
    assert.throws(()=>assertProductionReleaseApproved({
      ...trusted,VERCEL_GIT_COMMIT_SHA:A,BCG_APPROVED_PRODUCTION_SHA:A,...patch,
    }),/unverified GitHub repository/);
  }
});

test('VERCEL_TARGET_ENV=production also enforces the gate', () => {
  const env = {...trusted,VERCEL_ENV:'preview',VERCEL_TARGET_ENV:'production',
    VERCEL_GIT_COMMIT_SHA:A};
  assert.throws(()=>assertProductionReleaseApproved(env),/BCG_APPROVED_PRODUCTION_SHA/);
});
