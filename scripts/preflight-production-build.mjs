/**
 * Prebuild production-only gate: refuse to create a production bundle when
 * repository governance, the real source SHA, or Firebase configuration is not
 * independently validated. Preview/CI remain secret-free and offline.
 *
 * Deliberately read-only: GitHub calls are GET only, never branch/host writes.
 * No token or service-account value may be printed in failure messages.
 */
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {assertProductionReleaseApproved} from './production-release-gate.mjs';
import {validateReleaseConfig} from './check-release-config.mjs';
import {checkLiveGitHubRelease} from './check-github-main-protection.mjs';

const SHA = /^[a-f0-9]{40}$/i;
const PUBLIC_FIREBASE = Object.freeze([
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
]);

export async function preflightProductionBuild(
  env = process.env,
  {checkGitHub = checkLiveGitHubRelease} = {},
) {
  const approved = assertProductionReleaseApproved(env);
  if (!approved.enforced) return {production:false,verified:false};

  if (!env.BCG_CANONICAL_ORIGIN)
    throw new Error('Production build blocked: owner-approved BCG_CANONICAL_ORIGIN is required.');
  const configuration = validateReleaseConfig(env,true);
  if (!configuration.ok)
    throw new Error('Production build blocked: '+configuration.failures.join('; '));
  for (const key of PUBLIC_FIREBASE) {
    if (typeof env[key] !== 'string' || !env[key].trim())
      throw new Error('Production build blocked: missing Firebase browser setting '+key);
  }

  // A partially configured Google Drive OAuth integration would break live
  // redirects or allow weak cookie secrets, even while CMS is otherwise healthy.
  const oauthFields = [
    'GOOGLE_OAUTH_CLIENT_ID','GOOGLE_OAUTH_CLIENT_SECRET',
    'GOOGLE_OAUTH_REDIRECT_URI','DRIVE_COOKIE_ENCRYPTION_KEY',
  ];
  if (oauthFields.some(key=>Boolean(env[key]))) {
    if (oauthFields.some(key=>!env[key]) ||
        env.GOOGLE_OAUTH_REDIRECT_URI !== env.BCG_CANONICAL_ORIGIN+'/api/drive/callback' ||
        !/^[a-f\d]{64}$/i.test(env.DRIVE_COOKIE_ENCRYPTION_KEY || ''))
      throw new Error('Production build blocked: Google Drive OAuth configuration is incomplete or mismatched.');
  }

  const commit=env.CF_PAGES === '1' && env.CF_PAGES_BRANCH === 'main'
    ? env.CF_PAGES_COMMIT_SHA : env.VERCEL_GIT_COMMIT_SHA;
  if (!SHA.test(commit || ''))
    throw new Error('Production build blocked: provider commit SHA cannot be confirmed.');

  // Unlike a manually set APPROVED_PRODUCTION_SHA, this independent call checks
  // GitHub's *real* branch controls and the latest merge's fresh peer review.
  const result=await checkGitHub({token:env.BCG_GITHUB_AUDIT_TOKEN});
  if (!result?.protected || result.latestMainSha?.toLowerCase() !== commit.toLowerCase() ||
      !Number.isSafeInteger(result.pr) || result.pr < 1) {
    throw new Error('Production build blocked: GitHub approved main revision does not match this deployment.');
  }
  return {production:true,verified:true,commitSha:commit.toLowerCase(),pullRequest:result.pr};
}

if (process.argv[1] && fileURLToPath(import.meta.url)===resolve(process.argv[1])) {
  try {
    const result=await preflightProductionBuild();
    if (result.production)
      console.log('PASS reviewed protected production release',result.commitSha,'PR #'+result.pullRequest);
    else console.log('PASS preview/local build: production credentials not requested');
  } catch (error) {
    console.error('FAIL production prebuild gate:',error.message);
    process.exitCode=1;
  }
}
