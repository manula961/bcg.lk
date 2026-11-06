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

/**
 * GitHub repository rulesets can protect main even when the legacy branch
 * protection endpoint is unavailable. Accept one complete, enforceable ruleset
 * only; a ruleset that targets another branch or has no checks is not proof.
 */
export function checkMainRulesetProtection(branch, ruleset) {
  const issues = [];
  if (branch?.name !== 'main' || branch?.protected !== true)
    issues.push('GitHub main is not protected.');
  if (ruleset?.target !== 'branch' || ruleset?.enforcement !== 'active' ||
      ruleset?.source_type !== 'Repository' || ruleset?.source !== REPO)
    issues.push('Ruleset is not an active repository branch policy.');
  const names = ruleset?.conditions?.ref_name;
  const includes = Array.isArray(names?.include) ? names.include : [];
  const excludes = Array.isArray(names?.exclude) ? names.exclude : [];
  if (!includes.some(value => ['refs/heads/main', '~DEFAULT_BRANCH'].includes(value)) ||
      excludes.length !== 0)
    issues.push('Ruleset does not unambiguously protect main.');
  if (!Array.isArray(ruleset?.bypass_actors) || ruleset.bypass_actors.length !== 0 ||
      ruleset?.current_user_can_bypass !== 'never')
    issues.push('Ruleset bypass permissions are not demonstrably disabled.');

  const rules = Array.isArray(ruleset?.rules) ? ruleset.rules : [];
  const select = type => rules.find(rule => rule.type === type);
  if (!select('non_fast_forward')) issues.push('Ruleset permits force pushes.');
  if (!select('deletion')) issues.push('Ruleset does not prohibit deleting main.');

  const review = select('pull_request')?.parameters;
  if (!Number.isInteger(review?.required_approving_review_count) ||
      review.required_approving_review_count < 1)
    issues.push('Ruleset does not require a human approval.');
  if (review?.dismiss_stale_reviews_on_push !== true)
    issues.push('Ruleset does not dismiss stale reviews.');
  if (review?.require_last_push_approval !== true)
    issues.push('Ruleset does not require approval after the final push.');
  if (review?.required_review_thread_resolution !== true)
    issues.push('Ruleset does not require resolved conversations.');

  const status = select('required_status_checks')?.parameters;
  if (status?.strict_required_status_checks_policy !== true)
    issues.push('Ruleset status checks are not strict/up-to-date.');
  const contexts = new Set(
    Array.isArray(status?.required_status_checks)
      ? status.required_status_checks.map(entry => entry.context)
      : []
  );
  for (const check of REQUIRED_PR_CHECKS)
    if (!contexts.has(check)) issues.push('Ruleset missing required check: ' + check);
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
  let issues;
  try {
    const settings = await api('/branches/main/protection');
    issues = checkMainProtection(branch, settings);
  } catch (error) {
    // A read-only GitHub App may be unable to read the legacy protection API
    // when enforcement comes from a repository ruleset. Never treat a denied
    // policy read as success: inspect the effective active rulesets instead.
    if (!/GitHub release-control read failed \\(HTTP (403|404)\\)/.test(error.message))
      throw error;
    const summaries = await api('/rulesets?per_page=100&includes_parents=true');
    if (!Array.isArray(summaries) || summaries.length >= 100)
      throw new Error('GitHub ruleset list is incomplete; fail closed.');
    const findings = [];
    for (const summary of summaries) {
      if (summary?.target !== 'branch' || summary.enforcement !== 'active' ||
          !Number.isSafeInteger(summary.id)) continue;
      const full = await api('/rulesets/' + summary.id);
      const candidate = checkMainRulesetProtection(branch, full);
      if (candidate.length === 0) { issues = []; break; }
      findings.push(...candidate);
    }
    if (!issues) issues = findings.length ? findings : ['No complete active main ruleset was found.'];
  }
  if (issues.length) throw new Error('Production release blocked: ' + issues.join(' '));
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
