# BCG.LK audit remediation — 24 October 2026

Scope: repository `manula961/bcg.lk`, base commit `467f158e7b592ce65e08eae355a972a71aa4aa4a`. This is a **proposal for review**, not production certification.

## Rules #1 and #2

- No changes to `src/components/`, `src/pages/`, `src/admin/`, `src/navigation/`, styling, public media, or the UI visual assets.
- No Jaliya-authored files intentionally changed. The full Git-history preservation check must run on the PR and fail closed if it cannot verify authorship.
- Nothing in this branch deploys Firebase security rules or changes live authentication/content.

## Changes and why

1. Exact-match static route handling rejects unknown root-level filenames instead of SPA HTML; fallback excludes root assets. Added HSTS for HTTPS deployment (without includeSubDomains).
2. Past Papers subscription setup errors are forwarded to the existing error callback; the Jaliya-contributed shared content repository is not modified.
3. Firebase/Drive external calls have a 12-second abort deadline and redirect rejection.
4. Newly uploaded Drive files carry app-specific metadata. An explicit authenticated `POST /api/drive/delete` endpoint accepts `{ "fileId": "..." }` and refuses unmarked/unknown files. This is an **operator-triggered cleanup API only**, not automatic on Firestore record deletion.
5. Concurrent bot metadata reads for identical documents are deduplicated, with an upper bound on concurrent reads per function instance. No stale published metadata is retained in this guard.
6. Firestore rules reject forged create timestamps and changed timestamps that do not correspond to request time, while allowing unchanged legacy system fields.

## Remaining release blockers and limits

- **Unresolved, owner-only:** Require independent latest-SHA PR approval and mandatory green checks in GitHub main-branch protection. The source-level workflow does not enforce merge settings. The predecessor merged without submitted review and CI is failing before usable job logs were available.
- **Unresolved, infrastructure:** Verify Actions runner availability, billing, quotas and permissions; rerun complete suites and emulator tests. An early Actions failure is **not** proof of a code defect.
- **Unresolved, live Firebase:** Compare deployed Firestore/Storage rules with repository revisions using the read-only script, verify data compatibility and IAM, stage changes and backups. Production deployments remain prohibited until approved.
- **Unresolved, content lifecycle:** The media deletion endpoint only supports future app-marked Drive files, and does not automatically purge media on CMS removal. Existing public files need an owner-approved cleanup/reconciliation process, and related files can remain accessible after unpublishing.
- **Unresolved, UI-only:** The public Events calendar does not yet surface subscription failures or auto-roll midnight; Rule #1 forbids modifying existing React UI without separate permission.
- **Unresolved, UX/pagination:** Existing components still display full published collections. Adding enforced limits without pagination UI would hide valid content; preserve existing display and obtain UI approval for pagination.
- **Unresolved, SEO:** CMS articles/events/pages are still absent from generated static sitemap. A published-only feed and a safe indexing/invalidation design need staging/operational approval.
- **Unresolved, hardening:** Crawler pressure guard is per-isolate and is not a substitute for edge rate limiting; CSP should be staged in report-only mode and visually tested before enforcement.

## Required review gates

- Review exact base/head diff; verify the changed file list against Rules 1 and 2.
- `npm ci && npm test && npm run build && node scripts/check-bundle-budget.mjs`.
- `npx --yes firebase-tools@13.35.1 emulators:exec --only firestore,storage --project demo-bcg-verification "node --test tests/integration/*.test.mjs"` with the same pinned test setup as CI.
- Run authenticated disposable emulator CMS tests and Playwright smoke/visual comparison (no production writes).
- Independently verify `GET /robots.txt`, `/sitemap.xml`, nonexistent dotted assets, HSTS, and on-approved-preview OAuth/Drive API behavior.
- Never merge on red or unavailable checks; never infer production safety from green Vercel deployment status.
