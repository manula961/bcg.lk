# BCG.LK — audit remediation status and safe release checklist

**Date:** 26 October 2026  
**Baseline commit:** `dd1fb46deadb2cf35f6353522d1cd4f5fcc05450`  
**Branch:** `fix/audit-remediation-20261026`  
**Status:** Changes proposed for review only; no production deployment, Firebase write, secrets or GitHub administration performed.

## Completed in this PR (source-level changes, not released)

- [x] Add the existing Website Pages manager to the admin sidebar using existing markup/classes (no CSS or layout redesign).
- [x] Provide visible errors/retry for the public events calendar after a failed Firestore subscription.
- [x] Refresh the calendar's local-day marker when a tab remains open across midnight or returns to foreground.
- [x] Only inject the public post-view tracker at build time when `BCG_ANALYTICS_ENABLED=1`. Disabled tracking no longer adds a request-producing script to static HTML.
- [x] Validate the HMAC key and HTTPS origin when `BCG_ANALYTICS_ENABLED=1` in release preflight.
- [x] Add source/contract regression tests for the changes.

**Release blockers:** Source-level regression tests cannot substitute for the repository's required independent UI approval, emulator test, real browser screenshot comparison, or the owner-level controls below. The protected-UI and Jaliya-preservation guards must remain enabled; do not modify them to bypass review.

## Owner-managed release controls (not solved by a code commit)

- [ ] Enable branch protection / repository ruleset on `main`: latest-head approvals from an independent reviewer, passing required CI, deny force pushes and restrict direct production release.
- [ ] Restore GitHub Actions runner availability. The audited run set did not execute any job steps; investigate GitHub billing, Actions permissions, hosted runner allocation, concurrency and organization policies.
- [ ] Establish safe Preview/staging Firebase Auth, Firestore, Storage, Google OAuth and Resend test accounts. Do **not** copy production credentials into untrusted PR previews.
- [ ] Verify actual deployed Firestore + Storage rules match reviewed source; check every role's allow/deny against emulators and deployed IAM.
- [ ] Inventory live Firestore indexes (and other application-maintained indexes) before adding `cmsJobs(status ASC, runAt ASC)`. Do not replace existing indexes wholesale.
- [ ] Verify Firestore recovery: backups/PITR/retention and a full staging restoration rehearsal, including Firebase Auth identities and Google Drive media.
- [ ] Confirm Firebase project ID, web API key, privileged service account, allowed Auth domains, canonical app Origin, Google OAuth callback and email DNS/provider settings using owner-managed secret/configuration tools. Never paste secrets in issues, PRs or logs.

## Analytics architecture — **decision required before activation**

Current `main` qualified-view analytics writes Firestore `analyticsDedupe` and `analyticsViewsDaily` and reads these via `/api/admin/post-analytics`; Cloudflare environment settings are not used by this implementation.

- [ ] Choose either Firestore qualified views or a reviewed Cloudflare analytics integration with clearly defined measurement semantics. Do not combine incompatible metrics or claim they are unique visitors.
- [ ] Obtain school/privacy approval for visitor measurement, logging/retention and browser preference handling.
- [ ] For Firestore only, configure **server-only** `BCG_ANALYTICS_ENABLED=1`, `BCG_ANALYTICS_HASH_KEY` (strong random 32+ chars) and approved `BCG_ANALYTICS_ORIGIN`. Build and runtime targets must agree; any feature-enable environment change requires a fresh reviewed build.
- [ ] Confirm deployed Firestore denies anonymous analytics records, and apply both TTL policies on `expiresAt` to the correct collections.
- [ ] Add suitable quotas/abuse/cost limits; monitor Firestore writes, reads and Vercel billing. Test accepted published posts, denied drafts, dedup, opt-out and anonymous exposure in staging.
- [ ] If Cloudflare is selected instead, implement and test the backend contract and remove unused Firestore collector safely through an approved PR; do not just add environment keys.
- [ ] Avoid turning on analytics by default on school visitors before authorization.

## Editorial approval / archive / scheduler — **coordinated migration required**

- [ ] Decide whether two-person approval is mandatory, which CMS actions require it, and who may archive/restore.
- [ ] Normal `ContentManager` currently writes/publishes/deletes with Firestore SDK. `api/admin/workflow` is a **separate opt-in API**; merely deploying it does not enforce review. Do not tighten Firestore rules first, because doing so breaks existing editors.
- [ ] In a separate approved UI/API/rules migration, replace direct publish and hard-delete actions with the desired workflow, implement review/approval/restore affordances, carry over old records, and verify immutable audits.
- [ ] Configure matching private `CMS_CRON_SECRET` in Vercel Production and GitHub Actions secret storage; verify 32–256 URL-safe chars without revealing them.
- [ ] Ensure the due-job composite index is deployed and ready, GitHub scheduler actually runs, request authentication rejects invalid callers, and scheduled publications remain idempotent. Check retries, stale approvals, missed time, timezone and failure alerts in staging.
- [ ] Do not run live due-job writes during a smoke test; use authorized staging documents.

## Drive/media retention and public content

- [ ] Institutional approval of every uploaded picture/PDF *before* upload (public sharing is immediate). Check third-party licenses, student privacy, EXIF and malicious file content.
- [ ] Define file unsharing/deletion retention policy. CMS unpublish does not revoke Drive public links. Managed Drive deletion already checks current CMS references; it does not scan retired/static content.
- [ ] Verify real OAuth PKCE redirect and cookie lifetime, image/PDF display/download, permissions, revoked grant, and cleanup in staging.
- [ ] Replace generic/unrelated stock imagery only after content rights approval and UI owner signoff.
- [ ] Ensure News, Events, Societies, Sports, Leadership and Papers have valid editorial owners and actual published records; source empty states do not prove production is empty.

## SEO / navigation / accessibility / performance

- [ ] Implement a published-only CMS sitemap strategy and crawler metadata after validating Vercel runtime compatibility and Firestore query cost; current static sitemap intentionally contains only fixed routes.
- [ ] Review public discovery/navigation for custom `/pages/:slug` pages without altering site identity or adding unapproved visuals.
- [ ] Confirm production unknown routes are real HTTP 404 and deep CMS refresh works, rather than assuming local Vite preview matches production.
- [ ] Run read-only public HTTP tests for `/`, `/events`, `/past-papers`, `/admin`, real published details, `robots.txt`, `sitemap.xml`, school anthem `audio/mpeg`, and official email logos.
- [ ] Audit social links, maps, contact forms and external image/PDF URLs for reachability, semantics and appropriate opening context.
- [ ] Run keyboard, screen-reader, reduced-motion and responsive screenshots on real browsers; compare original layout and Jaliya-authored components before release.
- [ ] Measure Lighthouse mobile LCP/INP/CLS and actual Firestore reads. Large shared JS chunk and full-collection subscriptions remain scale/performance investigation items.
- [ ] Stage report-only Content Security Policy restrictions and validate compatibility with Firebase, OAuth, third-party media and school assets before enforcement.

## Recommended pre-merge acceptance steps

1. Install from trusted lockfile: `npm ci`.
2. Run `npm test`, `npm run build`, `node scripts/check-bundle-budget.mjs`, release config preflight and source syntax checks.
3. Run emulator-based Auth/Firestore/Storage tests and authenticated browser smoke on an isolated environment.
4. Obtain explicit independent UI review for the Pages sidebar addition and calendar error message; retain `verify-no-ui-changes.mjs` and `verify-jaliya-preservation.mjs` guards without bypass.
5. Record Vercel Preview deployment state and confirm it is the reviewed SHA; manually test Pages admin, calendar retry, and disabled analytics network behavior.
6. Merge only after current-head CI and owner approvals pass. Deploy via reviewed release process; verify production read-only. Never report blocked items as fixed until proven.

This file is deliberately a **remediation tracker**, not a certification that every audit item is fixed. The prior 78-item audit distinguishes confirmed code defects, noncritical design limits and checks that were unverified, and those classifications must be preserved.
