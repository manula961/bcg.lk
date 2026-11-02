/**
 * Post-merge release provenance validation. It detects an unreviewed/unchecked
 * merge after it happens; branch protection must still PREVENT such merges.
 * No production credentials or write permissions are needed.
 */
export const REQUIRED_PR_CHECKS = Object.freeze([
  'build',
  'verify',
  'firebase-emulator',
  'production-audit',
  'browser-smoke',
  'visual-compare',
  'independent-approval',
]);

const shaPattern = /^[0-9a-f]{40}$/i;

export function auditMergeProof({targetSha, pullRequests = [], reviews = [], checkRuns = [], requiredChecks = REQUIRED_PR_CHECKS}) {
  const failures = [];
  if (!shaPattern.test(targetSha || '')) failures.push('Invalid target commit SHA');
  const matches = pullRequests.filter(pr =>
    pr?.merged_at && pr.merge_commit_sha === targetSha && pr.base?.ref === 'main');
  if (matches.length !== 1) {
    failures.push(`Expected exactly one merged PR into main for ${targetSha}; found ${matches.length}. Direct pushes and untraceable merges are not approved releases.`);
    return {ok:false, failures, pullRequest: null};
  }
  const pr = matches[0];
  const headSha = pr.head?.sha;
  if (!shaPattern.test(headSha || '')) {
    failures.push('Merged pull request lacks an exact head SHA');
    return {ok:false, failures, pullRequest:pr.number};
  }

  // GitHub reviews are chronological; later dismissal/changes-requested
  // invalidates an earlier approval by that reviewer.
  const latest = new Map();
  for (const review of [...reviews].sort((a, b) =>
    (Date.parse(a.submitted_at || '') || 0) - (Date.parse(b.submitted_at || '') || 0) ||
    (a.id || 0) - (b.id || 0))) {
    const login = review?.user?.login;
    if (!login || login.toLowerCase() === (pr.user?.login || '').toLowerCase() ||
      review.user?.type === 'Bot') continue;
    if (['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(review.state))
      latest.set(login.toLowerCase(), review);
  }
  const approved = [...latest.values()].some(review =>
    review.state === 'APPROVED' && review.commit_id === headSha);
  if (!approved) failures.push(`PR #${pr.number} lacks an independent current-head approval`);

  const newest = new Map();
  for (const run of checkRuns) {
    if (!run?.name || run.head_sha !== headSha) continue;
    const prior = newest.get(run.name);
    const sortKey = value => Date.parse(value?.completed_at || value?.started_at || '') || 0;
    if (!prior || sortKey(run) > sortKey(prior) ||
       (sortKey(run) === sortKey(prior) && (run.id || 0) > (prior.id || 0)))
      newest.set(run.name, run);
  }
  for (const check of requiredChecks) {
    const run = newest.get(check);
    if (run?.status !== 'completed' || run.conclusion !== 'success')
      failures.push(`PR #${pr.number} check '${check}' has no completed successful run on head ${headSha}`);
  }
  return {ok: failures.length === 0, failures, pullRequest:pr.number, headSha};
}
