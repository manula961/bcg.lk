import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {preflightProductionBuild} from '../scripts/preflight-production-build.mjs';

const SHA='a'.repeat(40), OTHER='b'.repeat(40);
const project='bcg-release-example';
const origin='https://school.example.test';
const env={
  VERCEL_ENV:'production',
  VERCEL_GIT_PROVIDER:'github',
  VERCEL_GIT_REPO_OWNER:'manula961',
  VERCEL_GIT_REPO_SLUG:'bcg.lk',
  VERCEL_GIT_COMMIT_REF:'main',
  VERCEL_GIT_COMMIT_SHA:SHA,
  BCG_APPROVED_PRODUCTION_SHA:SHA,
  BCG_CANONICAL_ORIGIN:origin,
  USER_ADMIN_ORIGIN:origin,
  FIREBASE_PROJECT_ID:project,
  VITE_FIREBASE_PROJECT_ID:project,
  FIREBASE_WEB_API_KEY:'not-a-real-key',
  VITE_FIREBASE_API_KEY:'not-a-real-key',
  VITE_FIREBASE_AUTH_DOMAIN:project+'.firebaseapp.com',
  VITE_FIREBASE_STORAGE_BUCKET:project+'.firebasestorage.app',
  VITE_FIREBASE_MESSAGING_SENDER_ID:'123456789',
  VITE_FIREBASE_APP_ID:'1:123456789:web:abcdef',
  FIREBASE_SERVICE_ACCOUNT_JSON:JSON.stringify({
    type:'service_account',project_id:project,
    client_email:'test@'+project+'.iam.gserviceaccount.com',
    private_key:'-----BEGIN PRIVATE KEY-----\\nFAKE\\n-----END PRIVATE KEY-----',
  }),
  BCG_GITHUB_AUDIT_TOKEN:'fake-secret-for-mock-only',
};
const verified={protected:true,latestMainSha:SHA,pr:112,checks:7};
const audit=async ({token})=>{
  assert.equal(token,env.BCG_GITHUB_AUDIT_TOKEN);
  return verified;
};

test('local and preview builds never request production secrets, Firebase or GitHub',async()=>{
  let called=0;
  const checkGitHub=async()=>{called++;throw Error('Must never call GitHub');};
  for(const patch of [{},{VERCEL_ENV:'preview'},{CF_PAGES:'1',CF_PAGES_BRANCH:'feature'}]){
    const actual=await preflightProductionBuild(patch,{checkGitHub});
    assert.deepEqual(actual,{production:false,verified:false});
  }
  assert.equal(called,0);
});

test('production prebuild succeeds only with complete exact-head reviewed provenance',async()=>{
  assert.deepEqual(await preflightProductionBuild(env,{checkGitHub:audit}),
    {production:true,verified:true,commitSha:SHA,pullRequest:112});
  const cf={...env,VERCEL_ENV:'preview',
    CF_PAGES:'1',CF_PAGES_BRANCH:'main',CF_PAGES_COMMIT_SHA:SHA};
  assert.equal((await preflightProductionBuild(cf,{checkGitHub:audit})).verified,true);
});

test('production config must match browser SDK, service account, origin and HTTPS',async()=>{
  for(const patch of [
    {BCG_CANONICAL_ORIGIN:undefined},
    {VITE_FIREBASE_API_KEY:'wrong-key'},
    {VITE_FIREBASE_STORAGE_BUCKET:undefined},
    {VITE_FIREBASE_APP_ID:''},
    {USER_ADMIN_ORIGIN:'https://wrong.example.test'},
    {FIREBASE_PROJECT_ID:'demo-bcg-test'},
    {FIREBASE_SERVICE_ACCOUNT_JSON:'broken'},
    {BCG_CANONICAL_ORIGIN:origin+'/path'},
  ]){
    await assert.rejects(()=>preflightProductionBuild({...env,...patch},{checkGitHub:audit}),
      /Production build blocked:/);
  }
});

test('partial Google Drive OAuth settings never silently ship to production',async()=>{
  await assert.rejects(()=>preflightProductionBuild({...env,GOOGLE_OAUTH_CLIENT_ID:'configured'},{checkGitHub:audit}),
    /Google Drive OAuth/);
  const oauth={
    GOOGLE_OAUTH_CLIENT_ID:'client',GOOGLE_OAUTH_CLIENT_SECRET:'fake-secret',
    GOOGLE_OAUTH_REDIRECT_URI:origin+'/api/drive/callback',
    DRIVE_COOKIE_ENCRYPTION_KEY:'f'.repeat(64),
  };
  assert.equal((await preflightProductionBuild({...env,...oauth},{checkGitHub:audit})).verified,true);
  await assert.rejects(()=>preflightProductionBuild({...env,...oauth,
    GOOGLE_OAUTH_REDIRECT_URI:'https://attacker.example/api/drive/callback'},{checkGitHub:audit}),
    /Google Drive OAuth/);
});

test('unprotected, unreviewed, stale or unavailable main blocks production',async()=>{
  for(const proof of [
    {...verified,protected:false},{...verified,latestMainSha:OTHER},
    {...verified,pr:0},{...verified,pr:undefined},null,
  ]) await assert.rejects(()=>preflightProductionBuild(env,{checkGitHub:async()=>proof}),
    /GitHub approved main revision/);
  await assert.rejects(()=>preflightProductionBuild(env,{checkGitHub:async()=>{throw Error('403 No approval');}}),
    /403 No approval/);
  await assert.rejects(()=>preflightProductionBuild({...env,BCG_APPROVED_PRODUCTION_SHA:OTHER},
    {checkGitHub:audit}),/not the approved production revision/);
});

test('the normal npm build lifecycle runs the production gate before Vite',()=>{
  const packageJson=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
  const config=readFileSync(new URL('../vite.config.mjs',import.meta.url),'utf8');
  assert.match(packageJson.scripts.prebuild,/node scripts\/preflight-production-build\.mjs/);
  assert.match(config,/assertProductionReleaseApproved\(\)/);
  assert.match(readFileSync(new URL('../scripts/check-github-main-protection.mjs',import.meta.url),'utf8'),/checkLiveGitHubRelease/);
});
