# Audit remediation — October 18, 2026

Draft PR #32 addresses repository-level audit findings. Changes must be reviewed and CI green before merging. No production Firebase or Vercel settings are modified by this PR.

## Implemented in the branch

- Additional Firestore constraints for HTTPS media links, page slug patterns, basic event date format, hex colors, and allowed news/leadership enumerations, with emulator regression tests.
- Conflict-aware CMS transactions to prevent overwriting or deleting content updated since an editor opened it.
- Safe ordering that cannot reorder only a filtered subset; keyboard up/down controls and a batch size limit.
- Generic administrator errors (avoid exposing raw provider exception details).
- Reduced-motion hero behavior, small-screen heading sizing, title-independent news and event URLs, and a dedicated unknown-route page.
- A precise Git blob allowlist for these specific authorized public/admin UI changes, preserving Rule #1 protection for any other UI changes.
- Browser smoke tests at 320, 390 and 1440 pixel widths, plus existing screenshot comparison workflow requiring explicit baseline/candidate URLs.

## Requires operational verification / not implemented automatically

1. In Firebase Console, confirm the target production project and deploy the reviewed Firestore rules through an approved deployment. This PR cannot prove what rules are running in production.
2. Compare production and preview Vercel environment variables, domain restrictions, OAuth redirect URIs, and Firebase authorized domains without exposing secrets.
3. Run real authenticated admin/browser tests on a preview (create, edit, conflict, publish, delete, reorder, upload and disconnect). CI Firestore emulator tests cannot prove third-party OAuth connectivity.
4. Verify public Google Drive thumbnails across devices; Drive public links are not a guaranteed image CDN.
5. Run visual baseline workflow for each intentionally changed public component; browser-smoke snapshots provide visual evidence but are not an approved pixel baseline.
6. Content history/undo, an SEO server-rendering architecture, and replacing an external image host are separate product/hosting projects. This patch does not claim those features.
7. Check dev-only dependency advisories separately before a major Vite/Tailwind upgrade; production advisory gating remains in CI.

## Content URL compatibility

New news and event links use stable Firestore document IDs. Legacy title-derived URLs still resolve while the relevant published document retains its title; they are not permanent redirects. Existing articles require no migration.

## Firestore date validation limitation

Firestore rules validate basic YYYY-MM-DD shape and numeric month/day bounds; impossible calendar dates such as February 31 are rejected by the CMS client but cannot be fully ruled out by this rule alone. Admins must use the CMS UI; malformed-record regression tests cover basic rule constraints.
