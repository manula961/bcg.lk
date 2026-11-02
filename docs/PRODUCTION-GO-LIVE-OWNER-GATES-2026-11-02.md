# BCG.LK Production closure — owner handoff and hard release gates
Date: 2026-11-02
Baseline audited `main`: `4314f0afe10037fd0dbaa6cc25b0a33ba3548aa0`

**Current status: NO-GO.** This change introduces an exact-commit deployed-build proof. It does not grant branch protection, change live Firebase rules or data, or certify backups, privacy, WCAG, Lighthouse or SEO. Treat unverified controls as open, not successful.

## Fixed in proposed code
- Every Vite build already passes the existing release gate. The SEO postprocessor now creates a small, public `/release.json` with `schemaVersion`, full `commitSha`, `canonicalOrigin`, and `production` status. No credentials or Firebase data are exposed.
- Production manifest creation fails unless the full Vercel/Cloudflare commit SHA exactly matches `BCG_APPROVED_PRODUCTION_SHA` (which **must** have independent owner approval).
- The manual GET-only production HTTP smoke must be supplied with the owner-approved 40-character `expected_sha` and exact `public_origin`. It checks that the deployed manifest is from a production build with matching commit and canonical origin. Wrong revision, preview, missing asset, SPA HTML fallback and wrong host fail closed.
- All public React components, media, CSS, Firebase rules, deployed data and backups remain unchanged.

## P0: branch protection and independent review — owner must perform
The connected GitHub API reports private `manula961/bcg.lk` `main` unprotected and rulesets unavailable on the present plan. GitHub PR #108 and #109 were both merged without an independent recorded approval. The post-merge integrity workflows correctly failed and the violations remain in the audit record.

1. Keep the repository private. Obtain the plan/organization settings needed for branch protection, or transfer to an authorized workspace with equivalent rules.
2. Review `scripts/enable-main-protection.sh` and run it as a repository owner only after `BCG_CONFIRM_BRANCH_PROTECTION=YES`. Do not weaken the existing UI/Jaliya-contribution preservation policies.
3. Require fresh independent approval after each PR push, resolved conversations, checks `build`, `verify`, `firebase-emulator`, `production-audit`, `browser-smoke`, `visual-compare`, and `independent-approval`. Block admin bypass, force pushes, deletions and direct pushes.
4. Demonstrate a test PR **cannot** merge with missing approval or failed check. Preserve failed historical integrity runs; they cannot be retroactively made green.

## P0: verify actual deployed domain and Firebase permissions — authorized owner only
- Identify the approved canonical HTTPS domain and hosting account; **neither `bcg.lk` nor `bcglk.devoraid.com` is presumed to host the audited React commit**.
- Confirm host deployment's Git commit SHA, `BCG_APPROVED_PRODUCTION_SHA`, `BCG_CANONICAL_ORIGIN`, and server-side Firebase project identity. Do not allow unreviewed PR commits to auto-promote.
- After a legitimately approved production deployment, set GitHub repository variable `BCG_APPROVED_PUBLIC_ORIGIN` to the exact HTTPS origin with no trailing slash. Open Actions → `BCG.LK Production Read-Only Smoke`, enter that same `public_origin` and the complete approved 40-character `expected_sha`. Require a successful run **on the live host**, not localhost or Vite preview.
- With separate read-only Firebase permissions, execute `BCG_READONLY_AUDIT=YES FIREBASE_PROJECT_ID=... FIREBASE_STORAGE_BUCKET=... FIREBASE_AUDIT_ACCESS_TOKEN=... node scripts/audit-firestore-readonly.mjs`. This checks seven content collections and compares **deployed** Firestore/Storage rules with source; do not paste tokens in logs, chats, or issues. A successful local emulator test is not equivalent.
- Verify roles, disabled Firebase Auth accounts, API authorization, OAuth redirects, email delivery and editorial two-person publication flow using disposable staging users. Never run live production write tests without separate approval.

## P0: recovery demonstration — owner must provide evidence
- Inventory encrypted and access-controlled backups for Firebase Auth, Firestore (including `admins`, `roleAudit`, `userAudit`, CMS jobs/revisions/trash), Storage, Drive-managed files and deployment configuration.
- **Restore into a distinct isolated test project**, never into production. Verify record counts, selected role/authorization behaviors, image/PDF links and a rollback plan. Record timestamp, person approving, retention, RPO/RTO and result. Backups that have not been restored are *not verified*.
- Keep destructive Google Drive cleanup opt-in disabled until retention and reference policy is approved.

## P1: editorial scheduler and student/staff privacy
- Leave `BCG_SCHEDULER_ENABLED` unset/false until the approved endpoint, matching random server-only `CMS_CRON_SECRET`, safe index migration and two-person staging schedule test are proven. A skipped job is *not* a successful publication run.
- Leave `BCG_ALLOW_PUBLIC_DRIVE_UPLOADS` unset until school policy/consent has approved making each Drive file anyone-with-link readable before CMS publication. Existing public links are **not** revoked by the flag. Review a private-first Drive workflow before re-enabling high-risk uploads.

## P1/P2: mobile accessibility, performance, SEO, CSP
- Capture dated Lighthouse mobile/desktop results for all main public pages; measure real field Core Web Vitals where possible. Check keyboard, focus, screen-reader labels, alt text, contrast, reduced motion, media MIME and approved viewport screenshots.
- Inspect live sitemap and robots; require canonical, Open Graph and route-specific metadata to use the **approved host**, with draft CMS content absent. Inspect dynamic crawler metadata using published-only content.
- Current CSP includes broad `connect-src https: wss:`, `img-src https:` and `frame-src https:`. Before restricting any host, inventory **actual** Firebase Auth/Firestore/Storage, analytics, Drive/media and embedded third-party traffic on the approved deployment; ship a reviewed allowlist and browser regression evidence. Do not break login or school media merely to remove a wildcard.

## Release score / acceptance
All exact-head GitHub CI must be green, the PR must have a fresh independent approval, the GitHub branch must enforce it, the deployed exact SHA and origin must match, and P0 deployed Firebase and restore evidence must be attached before declaring a production GO or a credible score above 90.

**No automatic merge, deployment, rules migration, host switch, backup restoration, secret changes, or media policy opt-in is authorized by this document.**
