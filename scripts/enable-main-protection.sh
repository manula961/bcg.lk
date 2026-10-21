#!/usr/bin/env bash
# Owner-only, explicit operation. NOT run by CI or from a PR.
set -euo pipefail
repo="manula961/bcg.lk"
if [[ -v BCG_GITHUB_REPOSITORY ]]; then repo="$BCG_GITHUB_REPOSITORY"; fi
if [[ ! -v BCG_CONFIRM_BRANCH_PROTECTION || "$BCG_CONFIRM_BRANCH_PROTECTION" != "YES" ]]; then
  echo "Refusing to change GitHub settings without BCG_CONFIRM_BRANCH_PROTECTION=YES" >&2
  exit 2
fi
if [[ "$repo" != "manula961/bcg.lk" ]]; then
  echo "Refusing to configure unexpected repository: $repo" >&2
  exit 2
fi
command -v gh >/dev/null || { echo "Install GitHub CLI (gh) first" >&2; exit 2; }
gh auth status >/dev/null
# Require all independently named jobs; verify actual check names in GitHub
# Settings > Branches after applying (they are repository-specific).
# No force pushes, deletion, or bypass by repository administrators.
gh api --method PUT "repos/$repo/branches/main/protection" --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "build",
      "verify",
      "firebase-emulator",
      "production-audit",
      "browser-smoke",
      "visual-compare",
      "independent-approval"
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 1,
    "require_last_push_approval": true
  },
  "restrictions": null,
  "required_linear_history": false,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false,
  "required_conversation_resolution": true,
  "lock_branch": false,
  "allow_fork_syncing": false
}
JSON
echo "Main branch protection submitted. Inspect Settings > Branches / Rulesets to verify."
