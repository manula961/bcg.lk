# BCG.LK production release closure — evidence and owner gates
**Date:** 2026-11-02
**Base:** `main` at `a92692ef588934ccd7fc632ff6702c97ecf01407`.

## Scope and honesty
This branch corrects tested code/workflow failures while preserving all existing React public/admin UI, CSS and assets. **It does not make the number of production readiness findings zero.** No source-only commit can prove branch protection, deployed Firebase rules, domain ownership, private backup restoration, or site accessibility measurements.

## Automated issue remediation
- Browser E2E must match the currently rendered role manager: the visible heading is `Manage Users (n)` in the `Firebase Authentication users` region; account rows display email and display name, not UID. Keep the role-downgrade and revocation assertions.
- The CMS scheduler has been firing every 15 minutes despite an absent `CMS_CRON_SECRET`. The schedule now runs its publishing job **only when** repository variable `BCG_SCHEDULER_ENABLED` is exactly `true`. Until then the feature is *disabled*, not verified to work.
- When explicitly enabled, scheduler requests require a matching strong `CMS_CRON_SECRET` stored in GitHub Actions secrets and in the backend deployment's server-only configuration. The GitHub variable `BCG_APPROVED_PUBLIC_ORIGIN` must be an exact publicly reachable HTTPS origin. It is checked before a request; the scheduler does not assume `bcglk.devoraid.com` or `bcg.lk`.
- A successful scheduler integration must separately prove the `cmsJobs(status ASC, runAt ASC)` index exists in the actual existing production Firebase project, after a staging test and index-safety inventory.

### Do not enable scheduled publishing until all of the following
1. A designated school owner confirms the canonical production domain, hosting owner and immutable deployed release SHA.
2. Staging-only two-person submit/approve/publish/unpublish and archive/restore drills pass, and the deployment's Firebase service account is scoped correctly.
3. A random secret of 32–256 URL-safe characters is stored in both the GitHub Actions secret and server environment. Do not put it in `VITE_*` values or logs.
4. GitHub repository variable `BCG_APPROVED_PUBLIC_ORIGIN` is set to the approved HTTPS origin without a trailing slash. Confirm `GET /api/cron/publish` returns 401 without authentication.
5. Review `cmsJobs` indexes before deployment; prove scheduler accepts approved due jobs, refuses unauthenticated requests and reports no failed/deferred items.
6. Set GitHub repository variable `BCG_SCHEDULER_ENABLED=true` only after formal approval, then dispatch the workflow manually and inspect logs.

## Outstanding P0 controls that cannot be fixed by code alone
- GitHub reports `main` is **unprotected**. The private repository's rulesets API returns an upgrade/public-repository entitlement error. Keep it private. An owner must enable a suitable GitHub plan, configure required checks, disable direct pushes/bypass, require an independent approving review, and demonstrate that a noncompliant PR cannot merge.
- PR #108 merged without a recorded approving review, and the post-merge integrity workflow failed. That is a **historical release violation** and must remain in the audit trail. A fresh reviewed PR cannot erase it.
- Browser E2E, full CI and visual comparison must pass on the exact proposed SHA. Source regression tests are not substitutes.
- Only a read-only owner-authorized comparison can prove that deployed Firestore and Storage rules match the source and that server credentials and OAuth domains are correct.
- Backup availability is not recovery proof: restore Firebase Auth, Firestore, Storage, Drive assets and essential configuration to an isolated nonproduction environment and record evidence.
- Capture Lighthouse mobile/desktop, screen-reader/keyboard/contrast checks, approved-device responsive screenshots, Core Web Vitals if available, and review static/dynamic SEO/canonical behavior on the actual approved host.
- Public Google Drive uploads remain default-denied until immediate-public-sharing risk is explicitly approved; never turn the opt-in on to make an audit pass.

## GO criteria
Require zero **open P0 defects**, green latest-commit tests, independent owner signoff, verified hosting/Firebase operations and documented recovery. A numerical score above 90 is **earned from observed evidence**, never achieved by clearing flags or hiding failing tests.

**Current production status until these owner gates are met: NO-GO.**
