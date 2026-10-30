/**
 * Temporary fail-closed release gate while the private repository's GitHub
 * Actions / branch-protection enforcement is unavailable.
 *
 * Build-time only. Prevents accidental promotion of an unapproved git commit,
 * but CANNOT verify GitHub reviews or replace protected branch rules.
 */
const SHA = /^[0-9a-f]{40}$/i;

export function assertProductionReleaseApproved(env = process.env) {
  // Preview builds must use their own staging Firebase project. Do not share
  // privileged production bindings with untrusted preview branches.
  const cloudflareProduction = env.CF_PAGES === '1' && env.CF_PAGES_BRANCH === 'main';
  const vercelProduction = env.VERCEL_ENV === 'production' ||
    env.VERCEL_TARGET_ENV === 'production';
  if (!cloudflareProduction && !vercelProduction) return { enforced: false };
  if (cloudflareProduction) {
    if (!SHA.test(env.CF_PAGES_COMMIT_SHA || '') ||
        (env.CF_PAGES_URL && !/^https:\/\/[^/]+\.pages\.dev\/?$/.test(env.CF_PAGES_URL)))
      throw new Error('Production release blocked: Cloudflare Pages commit identity is unavailable or invalid.');
  } else if (env.VERCEL_GIT_PROVIDER !== 'github' ||
      env.VERCEL_GIT_REPO_OWNER !== 'manula961' ||
      env.VERCEL_GIT_REPO_SLUG !== 'bcg.lk' ||
      env.VERCEL_GIT_COMMIT_REF !== 'main') {
    throw new Error('Production release blocked: unverified GitHub repository or non-main branch.');
  }
  const actual = cloudflareProduction ? env.CF_PAGES_COMMIT_SHA : env.VERCEL_GIT_COMMIT_SHA;
  const approved = env.BCG_APPROVED_PRODUCTION_SHA;
  if (typeof actual !== 'string' || !SHA.test(actual)) {
    throw new Error('Production release blocked: Vercel git commit SHA is unavailable or invalid.');
  }
  if (typeof approved !== 'string' || !SHA.test(approved)) {
    throw new Error('Production release blocked: set BCG_APPROVED_PRODUCTION_SHA to the independently reviewed 40-character commit SHA.');
  }
  if (actual.toLowerCase() !== approved.toLowerCase()) {
    throw new Error('Production release blocked: this commit is not the approved production revision.');
  }
  // Do not weaken this check with a boolean skip flag, secret printed to logs,
  // or a fallback to the last deploy's SHA.
  return { enforced: true };
}
