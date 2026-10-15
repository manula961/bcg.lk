# BCG.LK — Audit remediation record

Date: 2026-10-15. Branch: `backend-updates` only. Release rule: do **not** merge to `main` without passing verification and explicit visual review. Rule #1: preserve existing UI 100%.

## Code fixes implemented

| Finding | Status | Change and verification |
| --- | --- | --- |
| A01 Branch divergence/conflicts | Fixed in branch | Merged the latest `main` commit `bfb1021` into `backend-updates`, preserving existing component files and all CSS. GitHub reports PR #19 mergeable. |
| A02 Google Drive OAuth authorization testing | Strengthened | Mocked HTTP endpoint tests cover Firebase Auth lookup, admin role, invalid Origin, anonymous caller, mismatched role, expired encrypted sessions, OAuth PKCE callback and public-upload permissions. Real-world integration still pending. |
| A03 Drive thumbnail hosting reliability | External release blocker | Browser/CDN reliability cannot be proven by unit tests. Do not release before testing anonymous desktop/mobile image loading and repeat requests, or substitute a supported CDN after explicit authorization. |
| A04 Google Drive session lifecycle | Fixed in code | Disconnect attempts Google refresh-token revocation before clearing the encrypted session cookie. Invalid/expired session returns HTTP 401 and reconnect guidance; secrets stay server-side. Google OAuth consent/revocation must also be tested against a real account. |
| A05 Firestore CMS tests | Fixed | Firebase Emulator CRUD loop expanded to News, Events, Pages, Societies, Sports, Extracurricular and Leadership, with draft/publish checks. |
| A06 Pages CMS routes | Fixed | New `/pages/<slug>` React route renders published Firestore Pages using existing MenuBar/Footer and life-page styles; drafts are not displayed. No existing public route markup replaced. |
| A07 Editorial tag labels | Requires content/design authorization | Existing Life detail data/labels are left byte-for-byte unchanged to obey Rule #1. Adding visible labels would change currently rendered UI; request explicit approval if intended. |
| A08 External original imagery | Requires content/assets authorization | Original campus imagery and URLs remain untouched. Rehosting or changing fallback appearance can alter the approved UI and requires an asset-rights review. |
| A09 Dependency vulnerabilities | Production fixed; dev work pending | `@grpc/grpc-js` pinned to patched 1.14.6 via npm overrides and an integrity-pinned lockfile, retaining Firebase 12. `npm audit --omit=dev --audit-level=high` reports zero vulnerabilities. Full audit still shows 14 dev-tool advisories (10 high, 3 moderate, 1 low) associated with Vite/Tailwind/PostCSS/build tools. Some recommended fixes require major upgrades. Avoid forced Vite/Tailwind upgrades without visual regression testing and separate approval. |
| A10 Visual parity | Source verified; visual/manual pending | UI guard compares current admin editor with the exact approved additive Drive controls, and compares `src/main.jsx` with the approved route addition. All pre-existing UI component/CSS files are excluded from the diff. Automated image/pixel comparison and manual browser testing remain outstanding. |

## Branch-only changes

- `api/_lib/drive.mjs` and `api/drive/*`: Firebase-admin-authorized Google OAuth, token encryption, upload validation and grant revocation.
- `src/admin/ContentManager.jsx`: approved conditional Google Drive controls within the original admin editor (no CSS change).
- `src/lib/googleDriveUpload.js`: authenticated same-origin client to the server endpoints.
- `src/pages/PublishedContentPage.jsx` and `src/main.jsx`: published Pages route and safe text rendering.
- `tests/*`, `scripts/verify-no-ui-changes.mjs`, `.github/workflows/dependency-security.yml`: additional guards.
- `package.json`, `package-lock.json`: security-patched `@grpc/grpc-js` dependency and prebuild testing.
- Unsigned Cloudinary proposal was **not** included in the reconciled final file tree.

## CI and release checks

CI requires a Node build/test workflow, Firebase/Storage emulator tests and a high-severity production dependency audit. Vercel runs unit tests before each build. Check the latest commit SHA and CI conclusions in PR #19, not earlier commits.

### Outstanding release gates

1. Configure **Preview-only** Google OAuth redirects and server-side environment variables for the correct preview origin, using a test Firebase admin.
2. Perform actual consent, upload, revoked-token/expired-token, disconnect, non-admin denial and cross-origin denial tests against Preview. Avoid submitting production or private school images as samples.
3. Confirm the Google Drive public thumbnail loads reliably for anonymous desktop/mobile visitors. Google Drive is not a guaranteed CDN, and images become public on upload even before publishing a CMS record.
4. Perform manual desktop and mobile side-by-side baseline vs Preview comparison before approving any frontend change.
5. Plan separate dependency maintenance for Vite/Tailwind developer tooling with visual regression coverage; do not force incompatible majors merely to silence audit.
6. Inspect Firebase deployed rules, Vercel secret scoping, and production domain settings in the real consoles. Source review cannot prove deployed settings.
7. **Do not merge** PR #19 into `main` until these gates and the latest CI are complete.
