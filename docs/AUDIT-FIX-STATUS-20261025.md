# BCG.LK — safe audit fixes (25 October 2026)

This is a **backend/build-only**, review-required change. It intentionally does not change the React components, CSS, styling, media assets, layout, or Jaliya-authored UI work.

## Implemented in this branch
- **Canonical-domain SEO consistency:** `scripts/generate-seo-pages.mjs` now regenerates `dist/robots.txt` using the approved `BCG_CANONICAL_ORIGIN`, keeping its Sitemap line aligned with the generated `dist/sitemap.xml`. The existing robots directives are preserved and a missing/duplicate Sitemap declaration fails the build.
- **Drive PDF structural sanity:** `readPdf` now rejects unsupported PDF versions, files without a cross-reference marker, and files without an end-of-file marker near the end before any Google Drive upload. The existing 10 MB cap and content-type gate remain. This is **not** malware scanning or an assurance that uploaded PDFs contain no personal information.
- **Regression tests:** SEO canonical override and fallback behavior; acceptable/invalid PDFs; existing size and MIME gate.

## Existing fixes verified in source, not duplicated
- Direct Drive-file deletion checks references across active CMS records and fails closed if it cannot scan safely.
- Scheduled CMS API contains queued-job indexes, bounded batches, revision checks and workflow audit objects.
- Admin role checks and client Firestore validation exist; production rule deployment still requires independent verification.

## Release blockers NOT fixed by this branch
1. GitHub `main` currently reports `protected: false`; owner must enable branch rules and required latest-head independent review.
2. Latest GitHub Actions jobs failed with `runner_id: 0` and no executed steps. Owner must inspect Actions billing/usage, policies, eligibility and runner availability; code commits cannot establish a passing test when no runner starts.
3. Production Vercel variable names do **not** include `CMS_CRON_SECRET`; scheduled publishing must remain off until a matching secret is set in both Vercel and GitHub Actions, the required index exists, and staging tests pass.
4. Legacy `src/admin/ContentManager.jsx` directly uses Firebase CMS writes (including publishing and hard deletion). Switching it to mandatory review/soft-delete requires an explicitly reviewed behavior migration and corresponding Firestore rule changes; changing rules alone would break existing functionality. No protected UI file is changed here.
5. Deployed Firestore and Storage rules, Auth lifecycle, IAM, backups/restore, Google Drive media retention, and production accessibility/performance remain unverified.
6. Dynamic CMS entries are not enumerated in the static sitemap. Safe enumeration requires a trusted publication feed, rate controls, and editorial policy; this branch only repairs the existing sitemap/robots domain consistency.
7. Full-collection subscriptions and reordering remain. Changing them requires pagination/UX coordination and visual parity testing.

## Review and testing
- `npm ci && npm test && npm run build && node scripts/check-bundle-budget.mjs`
- `node scripts/verify-no-ui-changes.mjs` and `node scripts/verify-jaliya-preservation.mjs` against a full checkout with `origin/main`.
- Execute Firebase emulator and browser/visual smoke suites on functional CI runners.
- Validate an approved Vercel preview's `/robots.txt`, `/sitemap.xml`, MIME/header behavior and approved canonical domain.
- Verify permissions and PDF uploads in disposable staging Firebase/Google Drive accounts. Never use production files to test hostile or malformed PDFs.

**Deployment:** Do not auto-merge, change production secrets/rules/indexes, or publish the branch without review and all release gates satisfied.
