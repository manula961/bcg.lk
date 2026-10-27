/**
 * Temporary fail-closed release gate while the private repository's GitHub
 * Actions / branch-protection enforcement is unavailable.
 *
 * Build-time only. Prevents accidental promotion of an unapproved git commit,
 * but CANNOT verify GitHub reviews or replace protected branch rules.
 */
const SHA = /^[0-9a-f]{40}$/i;

export function assertProductionReleaseApproved(env = process.env) {
  // Local builds and isolated Vercel previews remain independent of the
  // production attestation. They must NEVER use production Firebase secrets.
  if (env.VERCEL_ENV !== 'production') return { enforced: false };
  const actual = env.VERCEL_GIT_COMMIT_SHA;
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
