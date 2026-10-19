# BCG.LK — Operations and release guide

This document replaces old step-by-step setup drafts, redundant CMS notes, merged-PR audit reports and obsolete branch instructions. It describes the **current React + Firebase + Vercel architecture**. The existing Firebase project is retained.

## 1. Architecture

- Frontend: React 19, Vite, Tailwind CSS, GSAP and Lenis, deployed on Vercel.
- Admin: `/admin`, Firebase Authentication email/password and Firestore `admins/{uid}` role checks.
- Firestore CMS collections: `news`, `events`, `pages`, `societies`, `sports`, `extracurricular` and `leadership`.
- Public queries only request `published == true` documents. Writes are authorized by Firestore rules, not merely by hidden admin buttons.
- `storage.rules` governs Firebase Storage access. Optional Google Drive uploads use `api/drive/*` Vercel functions, not client-held Google tokens.
- Production credentials/environment settings belong to the **existing** Firebase and Vercel projects. The Firebase demo IDs in tests are **local emulators only**.

## 2. Configure local development

Run `npm ci`, copy `.env.example` to `.env.local`, and populate the six `VITE_FIREBASE_*` web application values from the existing Firebase project: API key, auth domain, project ID, storage bucket, messaging sender ID and app ID. Start with `npm run dev`.

The Google Drive server functions, when used, additionally need the server-only values documented in `.env.example`: `FIREBASE_PROJECT_ID`, `FIREBASE_WEB_API_KEY`, `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI` and `DRIVE_COOKIE_ENCRYPTION_KEY`. `GOOGLE_DRIVE_FOLDER_ID` is optional. Never prefix secrets with `VITE_`.

To provision an administrator, enable Firebase Authentication Email/Password, create the user through a trusted console or Admin SDK, then create `admins/<UID>` in Firestore with string field `role: "admin"`. Clients are not permitted to grant themselves the role. Test denied access for signed-out and non-admin accounts. Do not paste tokens or credentials into issues or PRs.

## 3. Tests and checks

```bash
npm ci
npm test
npm run build
node scripts/check-bundle-budget.mjs
```

The last command requires a completed `dist/` build. GitHub Actions performs additional checks:
- **BCG.LK Build:** build and JavaScript size budget.
- **Backend checks:** test suite, UI-preservation guard and Firebase Firestore/Storage emulator tests, including denial of anonymous Storage directory listing.
- **Dependency security audit:** block high/critical advisories in production dependencies, while reporting development advisories.
- **BCG.LK Browser Smoke:** responsive routes, keyboard calendar interactions, and a disposable Auth/Firestore/Storage emulator-backed CMS test.

CI uses Node 24 to match the connected Vercel project's production runtime. Updating Node or workflow action versions requires a new PR check run; do not infer compatibility solely from configuration.

The browser tests use a fixed `demo-bcg-e2e` emulator project and **must not be pointed at live Firebase**. The manual **BCG.LK Visual Regression** workflow requires reviewable baseline and candidate deployment URLs; a passing code test does not replace pixel comparison or accessibility review.

## 4. Git, UI safeguards and release

Use `main` for reviewed, stable changes and short-lived feature/fix branches with pull requests. Do **not** rely on the retired `develop`/`feature/firebase` branching diagram. The `scripts/verify-no-ui-changes.mjs` guard enforces specifically approved public/admin UI file changes. Do not disable it to make unrelated UI edits pass.

Before merging, confirm the **latest** PR SHA passes build, backend, security and browser checks; review Vercel Preview and baseline screenshots where public UI is affected. Do not automatically merge or deploy Firebase rules as part of a normal React release.

GitHub branch protection and mandatory PR reviews must be checked in repository settings by an authorized owner; passing workflows alone do not prove pushes to `main` are blocked.

## 5. Production Firebase data and rules

**Keep the current Firebase project.** Source-controlled `firestore.rules`/`storage.rules` may differ from deployed rules. Merging code or deploying to Vercel does **not** update Firebase security rules.

The current rules validate required fields on writes; old records missing `title`, boolean `published`, or collection-specific required fields can become uneditable until corrected. A page's `slug` must match its Firestore document ID. First back up and audit **all seven** collections, then correct incompatible legacy records through an approved process.

Use `scripts/audit-firestore-readonly.mjs` to check the **existing** Firebase project and compare deployed Firestore rules with the repo source. It can also compare deployed Storage rules when `FIREBASE_STORAGE_BUCKET` is supplied. Use authorized *read-only* Google Cloud access:

```bash
export FIREBASE_PROJECT_ID="YOUR_EXISTING_FIREBASE_PROJECT_ID"
export FIREBASE_STORAGE_BUCKET="YOUR_EXISTING_STORAGE_BUCKET_HOSTNAME"
export FIREBASE_AUDIT_ACCESS_TOKEN="$(gcloud auth print-access-token)"
BCG_READONLY_AUDIT=YES node scripts/audit-firestore-readonly.mjs
unset FIREBASE_AUDIT_ACCESS_TOKEN
```

The script makes GET requests and reports counts and incompatibilities, not document contents. An unset Storage bucket skips that comparison; inaccessible or mismatched releases produce a nonzero exit code. **A GitHub merge does not deploy the updated Storage rules.** In this remediation, the repository rules keep image GETs public but restrict Storage `list` to administrators. Only deploy after an authorized reviewer checks expected bucket behavior, the correct Firebase project, backups, and a rollback plan. If deployed rules cannot be read or differ, do not assume production matches source. Review backup integrity, affected documents and a rollback procedure before an authorized `firebase deploy --only firestore:rules,storage` directed to the **intended existing project**. Never trigger that deployment automatically from documentation-only work.

## 6. Backup and recovery

Arrange periodic Firestore exports or a suitable managed backup/point-in-time recovery plan **within the current Firebase/GCP project**. Restrict access to the backup bucket, choose retention and a suitable location, and test restoring selected data in a controlled environment.

For an **authorized manual** Firestore export, verify the active project and destination first:

```bash
gcloud config set project YOUR_EXISTING_FIREBASE_PROJECT_ID
gcloud firestore export gs://YOUR_PRIVATE_BACKUP_BUCKET/bcg-backup \
  --collection-ids=news,events,pages,societies,sports,extracurricular,leadership
```

A Firestore export does **not** back up Auth users, the administrators' permissions, Firebase Storage objects, Google Drive files or every deployment setting. Include those systems in the recovery inventory. Never run a production import/overwrite based only on this example; obtain approval and practice a restore first.

## 7. Google Drive image uploads

Server functions validate Firebase authorization, OAuth state/PKCE, encrypted session cookies, upload file types and size. Ensure the exact `GOOGLE_OAUTH_REDIRECT_URI` matches the approved website origin (currently configured examples use `https://bcglk.devoraid.com/api/drive/callback`). Verify actual values in Vercel and Google Cloud before testing; never assume an example means a redirect is live.

Only an authorized site administrator should connect the intended Google account and test consent, image upload, anonymous thumbnail visibility, disconnect and revocation. Images uploaded through the public-image flow are made publicly readable even when a CMS record is still a draft. Never upload private or unapproved staff/student photos. Google Drive thumbnails are not a guaranteed image CDN.

## 8. Public site health, SEO and dependencies

`public/robots.txt` and `public/sitemap.xml` describe the known static public pages. Dynamic Firestore-backed pages may need further server-side metadata/sitemap improvements. Validate the canonical hostname before editing SEO tags. Unknown static routes should return HTTP 404 from Vercel middleware; unknown dynamic CMS IDs may still require separate handling.

After an approved deployment, perform read-only HTTP checks:

```bash
BCG_PUBLIC_ORIGIN="https://YOUR_APPROVED_PUBLIC_DOMAIN" node scripts/check-public-deployment.mjs
```

This does not authenticate as an admin or verify Google Drive OAuth. Measure actual Core Web Vitals/Lighthouse and image loading on the live public domain; build chunk limits are not page-speed scores.

Dependabot proposes regular dependency updates. Review and test its PRs, especially major Vite/Tailwind upgrades that may affect the public design. A successful production-only npm security audit does not mean all development-tool advisories are fixed.

## 9. Verification boundaries

Documentation and GitHub CI cannot prove live Firebase rules, backup availability, Vercel environment values, Google OAuth consent or visual parity. Confirm those through the respective owner-authorized accounts and record the results in the release process. Existing production Firebase users, content, security rules and credentials must not be modified without explicit approval.
