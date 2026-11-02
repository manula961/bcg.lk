/**
 * Read-only GitHub release-governance verifier. Source workflows do not
 * prevent bypasses while main is unprotected. The audit must fail closed.
 * Run with an owner-configured fine-grained token with Administration: read
 * and Checks/Pull Requests: read. Do not expose token values in logs.
 */
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {REQUIRED_PR_CHECKS, auditMergeProof} from './merge-integrity.mjs';

const REPO = 'manula961/bcg.lk';
const ROOT = 'https://api.github.com/repos/' + REPO;

export function checkMainProtection(branch, settings) {
  const issues = [];
  if (branch?.name !== 'main' || branch?.protected !== true)
    issues.push('GitHub main is not protected.');
  if (!settings || typeof settings !== 'object') {
    issues.push('Required protected-branch policy could not be independently read.');
    return issues;
  }
  const status = settings.required_status_checks;
  if (status?.strict !== true) issues.push('Required status checks are not strict/up-to-date.');
  const contexts = new Set([
    ...(Array.isArray(status?.contexts) ? status.contexts : []),
    ...(Array.isArray(status?.checks) ? status.checks.map(x => x.context) : []),
  ]);
  for (const context of REQUIRED_PR_CHECKS)
    if (!contexts.has(context)) issues.push('Missing required status check: ' + context);
  const reviews = settings.required_pull_request_reviews;
  if (!Number.isInteger(reviews?.required_approving_review_count) ||
      reviews.required_approving_review_count < 1)
    issues.push('Main does not require an independent approval.');
  if (reviews?.dismiss_stale_reviews !== true)
    issues.push('Main does not dismiss approvals after code changes.');
  if (reviews?.require_last_push_approval !== true)
    issues.push('Last-push approval is not enforced.');
  if (settings.enforce_admins?.enabled !== true)
    issues.push('Branch protection does not apply to administrators.');
  if (settings.allow_force_pushes?.enabled !== false)
    issues.push('Force pushes are not explicitly forbidden.');
  if (settings.allow_deletions?.enabled !== false)
    issues.push('Deleting main is not explicitly forbidden.');
  if (settings.required_conversation_resolution?.enabled !== true)
    issues.push('Resolving review conversations is not required.');
  return issues;
}

export async function checkLiveGitHubRelease({token, fetcher=fetch} = {}) {
  if (!token || typeof token !== 'string')
    throw new Error('BCG_GITHUB_AUDIT_TOKEN is missing: cannot certify protected main.');
  async function api(path) {
    const response = await fetcher(ROOT + path, {
      method:'GET', redirect:'error', signal:AbortSignal.timeout(12000),
      headers:{
        Authorization:'Bearer ' + token,
        Accept:'application/vnd.github+json',
        'X-GitHub-Api-Version':'2022-11-28',
      },
    });
    if (!response.ok) throw new Error('GitHub release-control read failed (HTTP '+response.status+'). Check read-only audit permission or plan entitlement.');
    return response.json();
  }
  const branch = await api('/branches/main');
  if (branch.protected !== true)
    throw new Error('Production release blocked: main is unprotected.');
  const settings = await api('/branches/main/protection');
  const issues = checkMainProtection(branch,settings);
  if (issues.length) throw new Error('Production release blocked: '+issues.join(' '));
  const sha=branch.commit?.sha;
  if (!/^[a-f0-9]{40}$/i.test(sha || ''))
    throw new Error('GitHub latest main commit cannot be verified.');
  async function allPages(path) {
    const items = [];
    for (let page = 1; page <= 20; page++) {
      const batch = await api(path+'?per_page=100&page='+page);
      if (!Array.isArray(batch)) throw new Error('Invalid GitHub pagination response; fail closed.');
      items.push(...batch);
      if (batch.length < 100) return items;
    }
    throw new Error('GitHub pagination exceeds audit limit; fail closed.');
  }
  const pulls=await allPages('/commits/'+encodeURIComponent(sha)+'/pulls');
  const associated=pulls.filter(p=>p.merged_at && p.merge_commit_sha===sha && p.base?.ref==='main');
  if (associated.length!==1)
    throw new Error('Latest main has no unique approved merged PR provenance.');
  const pr=associated[0];
  const reviews=await allPages('/pulls/'+pr.number+'/reviews');
  const checks=await api('/commits/'+encodeURIComponent(pr.head.sha)+'/check-runs?per_page=100');
  if (!Array.isArray(checks.check_runs) || checks.total_count > checks.check_runs.length)
    throw new Error('GitHub check-runs pagination is incomplete; fail closed.');
  const proof=auditMergeProof({targetSha:sha,pullRequests:pulls,reviews,checkRuns:checks.check_runs});
  if (!proof.ok)
    throw new Error('Latest main release provenance failed: '+proof.failures.join(' '));
  return {protected:true, latestMainSha:sha,pr:pr.number,checks:REQUIRED_PR_CHECKS.length};
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    const result=await checkLiveGitHubRelease({token:process.env.BCG_GITHUB_AUDIT_TOKEN});
    console.log('PASS actual protected main and fresh independently reviewed latest SHA',result.latestMainSha,'PR #'+result.pr);
  } catch(error) {
    console.error('FAIL production governance:',error.message);
    process.exitCode=1;
  }
}
