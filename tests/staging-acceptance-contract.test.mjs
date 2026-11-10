import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const script='scripts/check-firebase-staging-auth.mjs';
const run=env=>spawnSync(process.execPath,[script],{
  cwd:new URL('..',import.meta.url),
  encoding:'utf8',
  timeout:7000,
  env:{PATH:process.env.PATH, HOME:process.env.HOME, ...env},
});
test('real staging auth audit requires explicit approved project and refuses production identity',()=>{
  const env={
    BCG_STAGING_PROJECT_ID:'bcg-staging-example',
    BCG_PRODUCTION_PROJECT_ID:'bcg-production-example',
    BCG_STAGING_APPROVED_PROJECT_ID:'bcg-staging-example',
    BCG_STAGING_READONLY_CONFIRMATION:'RUN_READONLY_STAGING_AUTH',
  };
  let result=run({...env,BCG_STAGING_PROJECT_ID:'bcg-production-example'});
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/separate projects/);
  result=run({...env,BCG_STAGING_APPROVED_PROJECT_ID:'different-staging'});
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/match exactly/);
  result=run({...env,BCG_STAGING_READONLY_CONFIRMATION:'NO'});
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/Explicit read-only staging approval/);
  result=run(env);
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/BCG_STAGING_WEB_API_KEY/);
});
test('staging workflow has manual approval environment and no cloud write endpoints',()=>{
  const source=read(script);
  const workflow=read('.github/workflows/firebase-staging-auth-audit.yml');
  assert.match(workflow,/workflow_dispatch:/);
  assert.match(workflow,/environment: staging/);
  assert.match(workflow,/github\.ref == 'refs\/heads\/main'/);
  assert.match(source,/assert\.notEqual\(staging, production/);
  assert.match(source,/RUN_READONLY_STAGING_AUTH/);
  assert.doesNotMatch(source, /\/documents:commit|\/documents:batchWrite|documents:delete/);
  assert.doesNotMatch(source, /method:\s*['"](?:PATCH|PUT|DELETE)['"]/);
});
