/**
 * Read-only deployment configuration preflight. Never prints secret values.
 * Usage:
 *   node scripts/check-release-config.mjs
 *   BCG_REQUIRE_FIREBASE_ADMIN=1 node scripts/check-release-config.mjs
 *
 * The strict mode is intended for an authorized staging/production environment,
 * not for pull-request CI (which must not receive production credentials).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export function validateReleaseConfig(env = process.env, strict = false) {
  const failures = [];
  const warnings = [];
  const configuration = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  const rewrites = new Map((configuration.rewrites || []).map(x => [x.source, x.destination]));
  for (const route of ['/about-us', '/events', '/past-papers', '/life/academic-excellence',
    '/life/sports-societies', '/life/leadership']) {
    if (rewrites.get(route) !== route + '/index.html')
      failures.push('Missing route-specific HTML rewrite for ' + route);
  }
  const fallback = configuration.rewrites?.at(-1);
  // Static media must not be sent the React HTML entrypoint.
  try {
    const match = new RegExp('^' + (fallback?.source || '') + '$');
    if (fallback?.destination !== '/index.html' ||
        ['/api/admin/users', '/audio/school-anthem.mp3', '/assets/index.js',
          '/email-assets/school-logo.png'].some(path => match.test(path)) ||
        ['/updates/item', '/events/item', '/pages/college', '/admin']
          .some(path => !match.test(path))) {
      failures.push('SPA fallback must preserve CMS routes and exclude API/static media');
    }
  } catch {
    failures.push('Invalid SPA rewrite expression');
  }
  const origin = env.BCG_CANONICAL_ORIGIN || 'https://bcglk.devoraid.com';
  try {
    const url = new URL(origin);
    if (url.protocol !== 'https:' || url.origin !== origin || url.username || url.password)
      failures.push('BCG_CANONICAL_ORIGIN must be an exact HTTPS origin without a path');
  } catch { failures.push('BCG_CANONICAL_ORIGIN must be a valid HTTPS origin'); }

  if (strict) {
    if (env.BCG_REQUIRE_WORKFLOW_SCHEDULER === '1' &&
        !/^[A-Za-z0-9_-]{32,256}$/.test(env.CMS_CRON_SECRET || ''))
      failures.push('CMS_CRON_SECRET must be 32-256 URL-safe characters when scheduled publishing is enabled');
    const project = env.FIREBASE_PROJECT_ID;
    if (!project || project !== env.VITE_FIREBASE_PROJECT_ID)
      failures.push('FIREBASE_PROJECT_ID must match VITE_FIREBASE_PROJECT_ID');
    if (!env.FIREBASE_WEB_API_KEY || env.FIREBASE_WEB_API_KEY !== env.VITE_FIREBASE_API_KEY)
      failures.push('FIREBASE_WEB_API_KEY must match VITE_FIREBASE_API_KEY');
    if (!env.USER_ADMIN_ORIGIN || env.USER_ADMIN_ORIGIN !== origin)
      failures.push('USER_ADMIN_ORIGIN must match the approved canonical HTTPS origin');
    let serviceAccount;
    try { serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON || ''); }
    catch { failures.push('FIREBASE_SERVICE_ACCOUNT_JSON must be valid server-only JSON'); }
    if (serviceAccount && (serviceAccount.type !== 'service_account' ||
        serviceAccount.project_id !== project ||
        !serviceAccount.client_email?.endsWith('.iam.gserviceaccount.com') ||
        !serviceAccount.private_key?.includes('PRIVATE KEY')))
      failures.push('Service-account JSON must belong to the selected Firebase project');
    if (env.FIREBASE_PROJECT_ID?.startsWith('demo-'))
      failures.push('Strict deployment configuration cannot use a demo emulator project');
  } else {
    warnings.push('Firebase account lifecycle and IAM cannot be verified without an authorized staging deployment');
  }
  return { ok: failures.length === 0, failures, warnings };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const strict = process.env.BCG_REQUIRE_FIREBASE_ADMIN === '1';
  const result = validateReleaseConfig(process.env, strict);
  for (const message of result.failures) console.error('FAIL ' + message);
  for (const message of result.warnings) console.log('NOTE ' + message);
  console.log(result.ok ? 'PASS release configuration preflight' : 'FAIL release configuration preflight');
  if (!result.ok) process.exitCode = 1;
}
