# BCG.LK — production audit remediation evidence

**Date:** 2026-11-02  
**Baseline:** `main` at `3750ccc4285c6d4a893ce947e06bb95abc66fba7`  
**Baseline readiness:** 60/100, **NO-GO**. This file tracks remediation; it is not a certificate.

## Delivered on the remediation branch

1. `scripts/merge-integrity.mjs` and `.github/workflows/post-merge-integrity.yml`: fail a **post-merge audit** if a main-branch commit lacks a traceable merged PR, fresh independent approval and seven successful checks on the PR head. Detects violations after the merge, not a substitute for branch protection.
2. `scripts/public-smoke-origin.mjs` and `scripts/check-public-deployment.mjs`: require a public HTTPS origin and optionally pin it to the approved domain. The manual GitHub workflow now requires repository variable `BCG_APPROVED_PUBLIC_ORIGIN` to exactly match its input. Blocks accidental probes of other domains and IP/localhost targets.
3. Two new Node test files cover review bypass, failed check runs, stale approvals and domain validation. Source tests passed locally using Node 22, but the full repository's Node 24 CI suite, Firebase emulators and deployed-site checks **have not been run successfully**.

## Mandatory owner-only gates before a >90 score or a production GO

- **GitHub access and branch policy (P0):** Current private repository reports that GitHub rulesets require a plan upgrade or a public repository. Keep the repository private; select a plan that supports mandatory protected branches. Configure the existing `scripts/enable-main-protection.sh` with authorized owner access, verify `main` requires latest-SHA independent reviewer approval, all seven checks, resolved conversations, and blocks admin bypass/direct pushes. Record a rejected test merge.
- **CI runner health (P0):** Resolve jobs that fail without steps/logs. Run `npm ci`, `npm test`, `npm run build`, JS size budget, dependency audit, emulator integration, visual comparison and smoke on the latest candidate SHA. Do not treat failures, skips or zero-step results as green.
- **Domain/host (P0/P1):** Confirm the approved HTTPS canonical domain and hosting platform/account. `bcg.lk` currently points to a different public website in the available evidence; `bcglk.devoraid.com` could not be verified externally. Configure GitHub repository variable `BCG_APPROVED_PUBLIC_ORIGIN` to the confirmed exact origin; preserve existing URL until school owner approves a change. Check deployed SHA and HTTP checks.
- **Firebase (P0):** With owner access, compare deployed Firestore and Storage rule releases to source using `scripts/audit-firestore-readonly.mjs`. Verify staging Firebase project isolation, representative published/draft content, direct SDK read/write denials, role revocation and all server CMS workflow actions. Do not deploy rules automatically or use production identities during tests.
- **Privacy/media (P1):** Public Drive uploads are already disabled unless server-only `BCG_ALLOW_PUBLIC_DRIVE_UPLOADS=1` is set. Do not enable without student/staff media policy, consent, moderation and approval. Confidential assets must not be uploaded to the public-on-upload flow.
- **Recovery (P0):** Inventory Auth, Firestore, Storage, Drive and server config backups; restore to a distinct staging project, verify roles, sample content and media links, document RPO/RTO and responsible staff.
- **UX performance/SEO (P1):** Produce audited Lighthouse mobile/desktop, WCAG-oriented keyboard/contrast/screen reader evidence, CWV where available, responsive snapshots, verified canonical/robots/sitemap metadata and published-only crawler behavior. Compare public UI pixel screenshots against approved main baseline; no uncontrolled visual edits.

## Scoring policy

Continue reporting **60/100 for the unmodified main release** until an approved and validated deployment exists. The remediation branch provides code-level safeguards but cannot by itself satisfy external production acceptance. A score above **90** requires verified release controls, actual green tests, Firebase parity, privacy/recovery proof, performance/accessibility evidence and a correct live domain. Do not substitute projected or self-reported numbers for independent test evidence.

**Production status: NO-GO until every P0 is closed with evidence.**
