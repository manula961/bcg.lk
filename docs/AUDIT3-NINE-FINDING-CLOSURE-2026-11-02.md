# BCG.LK — Overall Audit #3: nine-finding closure ledger

**Date:** 2026-11-02  
**Audited main SHA:** `af26509bc1aa70c662108018fccf0483a4cb23b1`  
**Source audit:** `BCG-LK-Overall-Production-Audit-3-2026-11-02.md` (separately delivered in conversation)  
**Last defensible production score:** 65/100; **release decision: NO-GO**.

This document records evidence requirements, not imaginary signoffs. **The nine findings below remain open until the independently checkable acceptance criteria actually pass.** Preventive code in PR #111 does not close an owner-controlled production finding.

| ID | Severity | Remediation implemented in code or documented | Missing, independently verified closure evidence |
| --- | --- | --- | --- |
| P0-01 | Critical | `scripts/check-github-main-protection.mjs` checks real API branch settings; `scripts/enable-main-protection.sh` remains owner-only | `main.protected=true`; full required reviews/checks/admin enforcement; rejected unreviewed test PR; private plan supports protections |
| P0-02 | Critical | Last-merged-PR provenance check rejects missing fresh review; post-merge integrity preserves historical failures | Independent human reviewer approval on a **new** latest head, full green checks and enforced merge restrictions. PRs #108–#110 remain incidents |
| P0-03 | Critical | Release manifest + manual GET-only smoke now checks exact live SHA, canonical, robots, sitemap, pages; Firebase source audit script already exists | Verified hosting account/domain; authenticated production config and deployed rules parity from existing Firebase project; staging role tests |
| P0-04 | Critical | Restore procedure documented in `docs/OPERATIONS.md` and `docs/RELEASE-RECOVERY.md` | Dated isolated actual restore of Firebase Auth, Firestore (roles, CMS, audit), Storage, Drive and configuration; approved RPO/RTO, media links and record counts |
| P1-05 | High | Scheduled job default disabled; strong server-only secret and approved HTTPS URL required before opt-in | Configured validated real endpoint and `cmsJobs` composite index; successful staging two-person queue → publish, failed/deferred handling, logs |
| P1-06 | High | Server-side `BCG_ALLOW_PUBLIC_DRIVE_UPLOADS` blocks new public-on-upload by default | School's signed consent/retention/privacy decision, existing link review and approved private-first behavior or explicit launch exclusion |
| P1-07 | High | Browser smoke checks viewport, keyboard and some semantic behavior; bundle budget enforced | Dated actual React live-host Lighthouse mobile/desktop, WCAG keyboard/screen reader/contrast, available real-user CWV evidence |
| P1-08 | High | Verified build metadata; new read-only live canonical/OG/robots/sitemap checks | School owner confirms canonical host; successful exact-SHA live smoke; Search Console ownership, dynamic published-only SEO and redirects checked |
| P2-09 | Hardening | Read-only CSP warnings and optional `BCG_REQUIRE_TIGHT_CSP=1` certification switch | Reviewed Firebase/Google/Cloudflare/Drive/media/embed traffic inventory; deployed least-privilege `connect-src`/`frame-src` and regression evidence |

## Exact owner-only actions

1. **Stop unauthorized merges:** Keep this private repository private. GitHub reports `main.protected=false`, and rulesets return 403 demanding a supported plan. An owner must secure supported private-repository branch protection and independent reviewers. Review `scripts/enable-main-protection.sh` before running it. **Never edit CI to call a skipped or failed review successful.** The manual production smoke now refuses unsafe GitHub release governance.
2. **Provide read-only GitHub audit access:** Create a restricted fine-grained repository token with Administration: read, Checks: read, and Pull requests: read; store as GitHub Actions secret `BCG_GITHUB_AUDIT_TOKEN`, not in committed files, user-visible logs or screenshots. When branch protection is enforced and new merge provenance is approved, `node scripts/check-github-main-protection.mjs` must pass.
3. **Choose the deployed target:** Verify which hosting project actually serves the React application. Do **not** assume `bcg.lk` or `bcglk.devoraid.com` without the owner's confirmation. Approve `BCG_CANONICAL_ORIGIN`, `BCG_APPROVED_PRODUCTION_SHA` and GitHub variable `BCG_APPROVED_PUBLIC_ORIGIN`. After actual deployment, manually dispatch `BCG.LK Production Read-Only Smoke` with exactly that public origin and approved 40-character SHA. This intentionally fails if GitHub governance or exact hosted revision is not approved.
4. **Audit the real Firebase project read-only:** With a scoped read-only Google OAuth token **outside the chat**, set `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_AUDIT_ACCESS_TOKEN`, `BCG_READONLY_AUDIT=YES` and run `node scripts/audit-firestore-readonly.mjs` locally. Verify deployed Firestore and Storage rules, collection compatibility and least-privilege IAM; don't deploy rules/indexes before authorized backup and staging review.
5. **Prove restoration:** Encrypted Firestore export does **not** include Auth identities, Storage or Drive. Restore copies into a **different nonproduction** Firebase/GCP project; validate account-role revocation, news/events/pages, media and audit history; record time, record counts, operator, RPO/RTO and rollback outcome. Never import into production as a verification shortcut.
6. **Finish editorial privacy and scheduler:** Obtain school approval for public Drive sharing before setting `BCG_ALLOW_PUBLIC_DRIVE_UPLOADS=1` (otherwise keep it disabled). Only after staging and index review, configure `CMS_CRON_SECRET` securely on both GitHub Actions and production hosting, configure approved host, then set `BCG_SCHEDULER_ENABLED=true`. A skipped publisher job is **disabled**, not green.
7. **Prove public quality:** Capture Lighthouse and accessible keyboard/screen-reader checks from the verified live site; confirm responsive designs, dynamic SEO, Search Console and sitemap. Review network logs before tightening `connect-src https:` and `frame-src https:`, to avoid breaking Firebase sessions, Drive media and embeds. Set `BCG_REQUIRE_TIGHT_CSP=1` during final external smoke only after CSP is reviewed.

## Release GO contract

**Do not deploy or merge a PR simply because it compiles.** All latest-head CI jobs, independent approval, branch protection, exact hosted SHA, actual Firebase policy parity, restorable backups, privacy review and accessible/performance/SEO smoke evidence are required for release GO and a defensible score above 90. Retain the failed post-merge integrity jobs for #108–#110 for auditing; they are historical records, not future work items to erase.

**No changes in this branch to React UI, public assets, live Firebase records, secrets, domain configuration, GitHub protection settings or production deployments.**
