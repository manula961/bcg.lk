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
4. Approve and merge fixes; promote one approved Vercel deployment only after CI passes.
5. Test a disposable account and Resend delivery through a controlled staging environment. Do not send real password links to unrelated users or log links.
6. Enable/enforce branch protection and restrict production promotions.

## Outstanding security item
`RoleManager.jsx` still uses client Firestore role writes. To guarantee auditing, design and test a trusted account-role endpoint that atomically writes a role update and its audit event, then restrict direct client role writes in `firestore.rules`. Do not deploy a deny-all rule ahead of a working replacement UI.
