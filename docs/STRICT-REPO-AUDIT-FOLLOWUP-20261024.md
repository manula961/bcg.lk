# BCG.LK — strict repository-only follow-up audit
Date: 2026-10-24
Base: `main` at `e07cef501f91cc6694e30cf2b842845028169082`
Scope: source-controlled React/Vite routing, server-side Firebase user administration, Drive OAuth/upload/delete, Firestore/Storage permissions, CI, tests, repository release controls.

## Non-negotiable rules

1. **Rule #1 — preserve the existing UI exactly.** No React UI components, CSS, animations, layout, fonts, public assets, or navigation source were modified by this follow-up.
2. **Rule #2 — preserve JaliyaMaheshakya0529-authored work.** No Jaliya-authored paths were intentionally changed. This follow-up touches only `middleware.js`, `tests/security-hardening.test.mjs`, `.github/workflows/backend-checks.yml` and this new report. Full-history verification in `scripts/verify-jaliya-preservation.mjs` remains a required CI gate; the branch is not considered approved until it passes from a full Git checkout.

## Findings and severity

| ID | Severity | Finding | State / action |
| --- | --- | --- | --- |
| BCG-101 | **BLOCKER** | `main` middleware contains a dangling `||` immediately before a second `if`, causing a JavaScript syntax error. This breaks direct module imports used in the test suite and may break the Vercel runtime. | **Fixed in review branch only.** Separate API/static route predicate from the shipped-root-asset predicate; retain all existing routes, UI, and 404 markup. Add explicit ESM parser regression test and pre-install CI source parsing. |
| BCG-102 | **BLOCKER** | At audit time the latest `main` commit has failed Build, Backend, Browser Smoke and Dependency Actions, plus a failed Vercel status. The Actions jobs provide no recorded steps; their failure root cause is unverified. | **Open.** Owner must repair CI/deployment execution and obtain successful jobs on the new PR's latest head. Do not represent runner startup failures as passing tests or as proven application bugs. |
| BCG-103 | **BLOCKER** | GitHub branch metadata reports `main` as `protected: false`. PR #68, despite the existing NO-GO audit report, was merged with no submitted reviews returned by the GitHub Reviews API. | **Open, owner-only.** Enforce mandatory status contexts, newest-head independent approval, and disabled direct/force pushes via branch protection/rulesets. Verify effective controls before another merge. |
| BCG-104 | **HIGH** | Firebase roles and CMS permissions are defined in source, but the actual deployed Firestore/Storage rule versions, Auth protections, staging IAM, account lifecycle, and backup/restore readiness cannot be inferred from Git. | **Open verification gate.** Use a separately authorized staging project; compare deployed rules read-only and execute full emulator + account lifecycle suites. No live Firebase writes were made. |
| BCG-105 | **HIGH** | Drive uploads are public and Drive media is not automatically unshared or deleted when CMS content is unpublished/deleted. The deletion API handles only explicitly selected, app-marked files. | **Open lifecycle/design decision.** Require an owner-approved media reference and retention policy before automatic deletion; do not silently delete assets still referenced by other records. |
| BCG-106 | **MEDIUM** | Public and admin Firestore lists subscribe to whole collections; reordering re-reads collections. Unbounded growth will increase reads and client work. | **Open under Rule #1.** Safe pagination or batching needs an approved non-regressing UX design and accurate data migration. |
| BCG-107 | **MEDIUM** | Event calendar subscription error display and midnight rollover remain incomplete in the existing UI. | **Open under Rule #1.** No protected UI was modified without explicit owner approval. |
| BCG-108 | **MEDIUM** | Static sitemap generation excludes published dynamic CMS documents. Crawler metadata enrichment is per-request, with per-instance concurrent limits rather than distributed throttling. | **Open.** Needs a publication-aware trusted feed, rate-control review, and deployment validation. |
| BCG-109 | **MEDIUM** | Source/unit assertions are not substitutes for dependency advisory scans, emulator permission checks, browser screenshot parity, live MIME/404/header testing, and a backup restore rehearsal. | **Open QA evidence.** Run the existing repository gates in trusted CI and approved staging; obtain dated results. |

## Review of critical security paths

- **Admin user management:** `api/_lib/user-admin.mjs` verifies the Firebase ID token, Auth disabled state and the live `super_admin` role; write requests check origin and request content type. Account mutations and role commits are not atomically cross-service: retain the existing fail-closed reconciliation process.
- **Drive media:** `api/_lib/drive.mjs` validates bearer identity and current Firestore media permissions; destructive deletion is admin/super-admin only, requires same-origin POST and a marked generated file; OAuth state cookies, encrypted session cookies, upload byte limits and outbound deadlines exist. These controls still require approved runtime testing.
- **Firestore/Storage:** `firestore.rules` separates readers, publishers, draft editors and administrators, and `storage.rules` separates anonymous public GET from admin-only listing/writes. Client-side checks are *not* a security boundary; only deployed and emulator-tested rules establish effective protection.
- **Routing/SEO:** `middleware.js` and `vercel.json` are the non-UI 404/SPA boundaries. Unknown dotted root assets should not become HTTP 200 HTML. Verify deployment behavior rather than assuming source rules execute at the edge.
- **Governance:** Repo-level approval settings are an operational control independent of workflows in `.github/workflows/`.

## Patch verification evidence

- Locally reproduced the malformed middleware parser error with Node 22 on a representative minimized program.
- Checked the repaired middleware's JavaScript source with Node 22's explicit ESM stdin parse mode; parser returned success. This is **not** a full compiled Vercel deployment test.
- Parsed the newly added CI shell preflight with `bash -n`; no shell syntax errors.
- Added a regression test that parses the exact checked-out `middleware.js` as ESM via `node --check --input-type=module`. Added a regression assertion for bodyless 404 `HEAD` and preserved API pass-through.
- Did not run `npm ci`, full `npm test`, `npm run build`, Firebase emulators, deployed HTTP smoke, or screenshot comparison because a private full checkout, dependencies and runner execution were not available in this audit context.
- Did not alter production Firebase, Vercel configuration, GitHub main protection, or the protected public/admin UI.

## Release decision

**NO-GO.** The source correction belongs in a reviewed pull request, not an immediate merge or production deployment. Before approval:

1. Require a completely green latest-SHA Build, Backend (including emulator), Dependency and Browser Smoke CI; investigate null/empty job steps at the Actions/runner level.
2. Obtain an independent approval on the newest PR head and verify that branch protection/rulesets actually prohibit unreviewed, red, direct and force-push changes.
3. Execute `node scripts/verify-no-ui-changes.mjs` and `node scripts/verify-jaliya-preservation.mjs` from a full checkout.
4. Execute `npm ci && npm test && npm run build && node scripts/check-bundle-budget.mjs`; complete the pinned Firebase emulator suites.
5. Validate approved Vercel preview route, header/MIME, 404, image, audio, OAuth and Firebase behaviors. Compare protected UI snapshots and capture accessibility/performance evidence.
6. Independently check deployed rules, backup/restore and least-privilege staging Firebase IAM. Explicitly authorize any later UI-sensitive backlog items before modifying them.

This report is repository-only evidence, not a live penetration test, deployed security certification, or assurance that every remaining defect is fixed.
