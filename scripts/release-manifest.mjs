/** Public, non-secret build provenance. Never contains credentials or user data. */
const SHA = /^[0-9a-f]{40}$/i;
export const RELEASE_MANIFEST_PATH = '/release.json';

export function buildReleaseManifest(env = process.env, canonicalOrigin) {
  const prodVercel = env.VERCEL_ENV === 'production' || env.VERCEL_TARGET_ENV === 'production';
  const prodCloudflare = env.CF_PAGES === '1' && env.CF_PAGES_BRANCH === 'main';
  const production = prodVercel || prodCloudflare;
  const commit = prodCloudflare ? env.CF_PAGES_COMMIT_SHA
    : prodVercel ? env.VERCEL_GIT_COMMIT_SHA
    : (env.VERCEL_GIT_COMMIT_SHA || env.CF_PAGES_COMMIT_SHA || env.GITHUB_SHA);
  if (commit && !SHA.test(commit)) throw new Error('Invalid build commit SHA; cannot publish a false release manifest.');
  if (production) {
    if (!SHA.test(commit || '')) throw new Error('Production build commit SHA is unavailable.');
    if (!SHA.test(env.BCG_APPROVED_PRODUCTION_SHA || '') ||
        commit.toLowerCase() !== env.BCG_APPROVED_PRODUCTION_SHA.toLowerCase()) {
      throw new Error('Production build is not the explicitly approved commit.');
    }
  }
  const origin = new URL(canonicalOrigin);
  if (origin.protocol !== 'https:' || origin.origin !== canonicalOrigin ||
      origin.username || origin.password) throw new Error('Canonical origin must be an exact HTTPS origin.');
  return {
    schemaVersion: 1,
    commitSha: commit?.toLowerCase() || null,
    canonicalOrigin,
    production,
  };
}

/** Compare actual hosted bytes with an owner-approved immutable release identity. */
export function verifyReleaseManifest(data, {expectedSha, expectedOrigin}) {
  if (!SHA.test(expectedSha || '')) throw new Error('Expected release SHA must be a full 40-character commit.');
  if (typeof expectedOrigin !== 'string' || !expectedOrigin)
    throw new Error('Owner-approved origin is required.');
  if (!data || typeof data !== 'object' || Array.isArray(data) ||
      data.schemaVersion !== 1 || data.production !== true ||
      !SHA.test(data.commitSha || '') ||
      data.commitSha.toLowerCase() !== expectedSha.toLowerCase() ||
      data.canonicalOrigin !== expectedOrigin) {
    throw new Error('Hosted release does not match the approved production commit and canonical origin.');
  }
  return {commitSha:data.commitSha.toLowerCase(), canonicalOrigin:data.canonicalOrigin};
}
