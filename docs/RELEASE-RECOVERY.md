# BCG.LK release recovery checklist

## CI failures that have no job steps or logs
GitHub Actions may fail before starting a runner. This is **not** evidence that npm tests failed.
In GitHub Actions, open the failed workflow run and check the run banner / annotations for account billing, spending limit, disabled Actions, policy restrictions, or runner availability. Review Settings → Actions → General and account/organization Billing and licensing → Actions. Re-run after resolving the account-level cause. **Do not remove checks or bypass protection just to merge.**

## Protect main
In Settings → Rules → Rulesets create an active branch ruleset for main. Require pull requests (at least one approval if supported), prohibit deletion/force pushes and require successful `build`, `verify`, `firebase-emulator`, `browser-smoke`, and `production-audit` checks *only after they can actually execute*. Configure administrators' bypasses sparingly. Check GitHub plan/support for required status checks on private repositories.

## Rollout order
1. Restore healthy Actions runners and green CI.
2. Confirm Firebase emulator tests, role-change audit rules, browser smoke, and SEO tests pass.
3. Verify both email assets return HTTP 200 and actual PNG content (read-only production smoke now checks this).
4. **Before merging**, enable real protected-branch enforcement with current-head independent review, all required checks, and no administrator bypass. If the private repository plan cannot support this, keep production on hold; do not weaken rules or make the repository public.
5. Verify build-time governance and Firebase preflight, approve/merge a newly reviewed PR, and promote only the reviewed immutable commit to the owner-approved host. Earlier unreviewed merge failures remain historical incidents.
6. Test disposable staging accounts and Resend delivery through controlled staging; do not send real password links to unrelated users or log links.

## Current security state and remaining verification
The current repository's `RoleManager.jsx` sends role changes through the server-owned `/api/admin/users` route; `firestore.rules` denies client writes to `admins` and `roleAudit`. That source-level enforcement and atomic role auditing have unit/emulator coverage. **Deployed Firebase rules, IAM and Auth lifecycle still require an authorized read-only check against the actual production project.** No source test or successful Vite build proves the deployed rules match. Production backup restoration and external account/email checks remain open until verified.
