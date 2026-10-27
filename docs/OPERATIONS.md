# BCG.LK — Operations and release guide

This document replaces old step-by-step setup drafts, redundant CMS notes, merged-PR audit reports and obsolete branch instructions. It describes the **current React + Firebase + Vercel architecture**. The existing Firebase project is retained.

For the current owner-only release gates, Firebase staging checklist, SEO domain
validation, accessibility/performance evidence and rollback plan, see
[RELEASE-READINESS.md](./RELEASE-READINESS.md). Do not claim a 90+ score or
production readiness solely from repository tests.

## 1. Architecture

- Frontend: React 19, Vite, Tailwind CSS, GSAP and Lenis, deployed on Vercel.
- Admin: `/admin`, Firebase Authentication email/password and Firestore `admins/{uid}` role checks.
- Active Firestore CMS collections: `news`, `events`, `pages`, `societies`, `sports`, `leadership` and `pastPapers`. Extracurricular has been retired from the UI and active collection policies; existing documents are not deleted.
- Public queries only request `published == true` documents. Writes are authorized by Firestore rules, not merely by hidden admin buttons.
- `storage.rules` permits **direct Firebase Storage writes only to administrators**, avoiding emulator create-on-overwrite ambiguities. Publishers and editors retain image uploads through the role-checked Google Drive `api/drive/*` Vercel functions (when Google Drive is configured), never through client-held Google tokens.
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
- **BCG.LK Browser Smoke:** responsive routes, keyboard calendar interactions, and a disposable Auth/Firestore/Storage emulator-backed CMS test. Pull requests also build a fresh `main` baseline and candidate and pixel-compare desktop/mobile screenshots before reporting visual success.

CI uses Node 24 to match the connected Vercel project's production runtime. Updating Node or workflow action versions requires a new PR check run; do not infer compatibility solely from configuration.

The browser tests use a fixed `demo-bcg-e2e` emulator project and **must not be pointed at live Firebase**. The manual **BCG.LK Visual Regression** workflow requires reviewable baseline and candidate deployment URLs; a passing code test does not replace pixel comparison or accessibility review.

## 4. Git, UI safeguards and release

Use `main` for reviewed, stable changes and short-lived feature/fix branches with pull requests. Do **not** rely on the retired `develop`/`feature/firebase` branching diagram. The `scripts/verify-no-ui-changes.mjs` guard enforces specifically approved public/admin UI file changes. Do not disable it to make unrelated UI edits pass.

Before merging, confirm the **latest** PR SHA passes build, backend, security and browser checks; review Vercel Preview and baseline screenshots where public UI is affected. Do not automatically merge or deploy Firebase rules as part of a normal React release.

GitHub branch protection and mandatory PR reviews must be checked in repository settings by an authorized owner; passing workflows alone do not prove pushes to `main` are blocked.

## 5. Production Firebase data and rules

**Keep the current Firebase project.** Source-controlled `firestore.rules`/`storage.rules` may differ from deployed rules. Merging code or deploying to Vercel does **not** update Firebase security rules.

The current rules validate required fields on writes; old records missing `title`, boolean `published`, or collection-specific required fields can become uneditable until corrected. A page's `slug` must match its Firestore document ID. First back up all existing CMS collections (including any retired Extracurricular records), then audit the **seven active** CMS collections and correct incompatible records through an approved process.

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

This archive export intentionally includes the retired `extracurricular` collection to preserve historical records. Do not purge old records as part of a UI removal.

```bash
gcloud config set project YOUR_EXISTING_FIREBASE_PROJECT_ID
gcloud firestore export gs://YOUR_PRIVATE_BACKUP_BUCKET/bcg-backup \
  --collection-ids=news,events,pages,societies,sports,extracurricular,leadership,pastPapers,admins,roleAudit,userAudit
```

A Firestore export containing `admins`, `roleAudit`, and `userAudit` preserves Firestore role records and role/user activity documents, but does **not** back up Firebase Authentication user identities, Firebase Storage objects, Google Drive files or every deployment setting. Include those systems in the recovery inventory. Never run a production import/overwrite based only on this example; obtain approval and practice a restore first. Store the Authentication export with encryption and narrow IAM access; take separate inventories/backups of Firebase Storage and publicly shared Drive images. **Practice a restore in a distinct nonproduction Firebase/GCP project** and record a date, successful record counts, roles retained and tested image links before considering recovery verified.

## 7. Google Drive image uploads

Server functions validate Firebase authorization, OAuth state/PKCE, encrypted session cookies, upload file types and size. Ensure the exact `GOOGLE_OAUTH_REDIRECT_URI` matches the approved website origin (currently configured examples use `https://bcglk.devoraid.com/api/drive/callback`). Verify actual values in Vercel and Google Cloud before testing; never assume an example means a redirect is live.

Only an authorized site administrator should connect the intended Google account and test consent, image upload, anonymous thumbnail visibility, disconnect and revocation. Images uploaded through the public-image flow are made publicly readable even when a CMS record is still a draft. Never upload private or unapproved staff/student photos. Google Drive thumbnails are not a guaranteed image CDN.

## 8. Public site health, SEO and dependencies

The Vite build now generates unique static-page HTML metadata for `/events`, `/about-us`, and `/life/*`, plus a sitemap of known static pages. Do not confuse these with **dynamic** Firestore-backed articles/events/pages: their server-rendered metadata and published-content sitemap entries still require a trusted server-side content feed. Validate the canonical hostname before editing SEO tags. Unknown static routes should return HTTP 404 from Vercel middleware; unknown dynamic CMS IDs may still require separate handling.

After an approved deployment, perform read-only HTTP checks:

```bash
BCG_PUBLIC_ORIGIN="https://YOUR_APPROVED_PUBLIC_DOMAIN" node scripts/check-public-deployment.mjs
```

This does not authenticate as an admin or verify Google Drive OAuth. Measure actual Core Web Vitals/Lighthouse and image loading on the live public domain; build chunk limits are not page-speed scores.

Dependabot proposes regular dependency updates. Review and test its PRs, especially major Vite/Tailwind upgrades that may affect the public design. A successful production-only npm security audit does not mean all development-tool advisories are fixed.

## 9. Verification boundaries

Documentation and GitHub CI cannot prove live Firebase rules, backup availability, Vercel environment values, Google OAuth consent or visual parity. Confirm those through the respective owner-authorized accounts and record the results in the release process. Existing production Firebase users, content, security rules and credentials must not be modified without explicit approval.

## CMS workflow scheduling and media safety (new backend candidate)

The new workflow API is an **opt-in, separate** editorial route; the existing admin screen continues direct Firestore publishing until a separately approved UI migration is completed. Do not advertise approvals or soft deletion as universal enforcement.

The scheduler requires the `cmsJobs(status ASC, runAt ASC)` composite index declared in `firestore.indexes.json`; an authorized owner must deploy the index to the intended Firebase project after staging/backup review. Configure `CMS_CRON_SECRET` as the same URL-safe random secret in Vercel and the GitHub Actions environment. Enable `BCG_REQUIRE_WORKFLOW_SCHEDULER=1` only for strict release preflight. The GitHub scheduled workflow reports failed jobs, deferred retries, and backlog signals as failed runs for operators to inspect.

The explicit managed Drive delete endpoint now enumerates active CMS records and refuses deletion when the file ID is referenced, permission checks fail, or pagination cannot complete. It does not inspect retired collections or static media assets, and it is not an automatic garbage collector. Perform manual reference, privacy and retention review before any irreversible Google Drive deletion.

See `docs/BACKEND-REMEDIATION-20261025.md` for phase-specific testing and outstanding production gates.


## October 25, 2026: staged CMS workflow hardening (PR #78)

The hardened server workflow is an **opt-in backend** until the existing admin CMS editor and Firestore rules are migrated together. Legacy Firestore SDK create/publish/delete operations remain accessible to the existing authorized roles, bypassing workflow audit and soft delete. Do **not** claim universally enforced approvals or durable trash recovery.

The candidate adds a Firestore `cmsJobs(status ASC, runAt ASC)` index definition. **Never apply this single-index config to production without first inventorying and reconciling all existing indexes;** deploying a partial managed index configuration may remove other indexes. Test staging first.

Scheduled publication is **not configured in production** until a long random `CMS_CRON_SECRET` is configured in both Vercel (server-only) and GitHub Actions, the index is confirmed ready, GitHub Actions runners execute successfully, and a staging two-person publish/restore drill is completed. Do not add the secret to any `VITE_*` variable.

The GitHub repository is private and `main` is currently unprotected. Failed GitHub Actions jobs expose no runner steps/logs; investigate repository Actions eligibility, billing, runner allocation and available branch-rule entitlements in GitHub Settings. Do not substitute Vercel build success for independent reviews, Firebase emulator tests, or an actual approved release.


## Managed Google Drive deletion — disabled by default

The `POST /api/drive/delete` endpoint is a destructive maintenance operation,
**not** the normal CMS Archive/Restore action. It now requires
`BCG_ALLOW_MANAGED_DRIVE_DELETE=1` as a production server-side opt-in in
addition to an authenticated, current administrator, a valid encrypted Drive
session, the verified app-managed file marker and a fail-closed Firestore
reference scan. **Do not enable this setting during routine deployment.**

Before an owner authorizes any hard deletion, inventory all active CMS documents,
drafts, `cmsTrash` archives, `cmsMediaRefs`, retired `extracurricular`
records, nested historical revisions, static page data, and separately
published links. Confirm a restorable backup and written retention approval.
The automatic scan covers the first five categories, **not static assets or
nested historical revisions**. The opt-in is therefore a manual governance
decision, never a claim that automated coverage is complete.

The reference scan uses the Firebase end-user ID token for active CMS
collections and the already-configured server service account for protected
archive, reference and retired collections. A missing service token, denied
read, pagination problem or matching reference blocks deletion. Leave the
opt-in unset in Vercel unless a reviewed deletion procedure explicitly needs
it; remove the setting again after approved maintenance. Do not copy it into
client-visible `VITE_*` variables.

To test without touching production, use `node --test
tests/drive-reference-safety.test.mjs tests/drive-delete-policy.test.mjs`
and the full existing `npm test` suite. Live deletion requires a separate,
reviewed operational decision and is not part of CI.


## Public Google Drive upload approval gate — new uploads default to denied

**This is an intentional compatibility change:** uploaded images and Past Papers
PDFs currently receive `type:anyone, role:reader` from Google Drive **before**
a CMS entry is published. A draft image or PDF can therefore be reached by
anyone possessing its URL. The server now refuses both
`POST /api/drive/upload` and `POST /api/drive/papers-upload` unless the
school owner explicitly enables a server-only production setting:

    BCG_ALLOW_PUBLIC_DRIVE_UPLOADS=1

Leave this **unset** until a designated school content/data owner has approved
the public-sharing policy and confirmed that student/staff images and PDFs are
appropriate for immediate public release. Do not use a `VITE_*` variable,
set this in Preview, or treat it as a per-user consent checkbox. A privileged
administrator, same-origin request, valid Firebase session/role and Google
Drive OAuth session remain required independently of the flag. No file bytes,
Google token exchange or Drive permission requests occur when the opt-in is
absent, even for an otherwise authorized administrator.

- With the setting **absent** (recommended): existing CMS entries and Drive
  links are unchanged; **new image/PDF uploads will return HTTP 403** and the
  existing admin UI will display the server's explanatory error.
- With the setting exactly **`1`**: existing Drive upload functionality is
  restored, including the **immediate public access** behavior. It does *not*
  make Drive files private, ensure two-person content review, or make previously
  uploaded public files private.
- To stop issuing new publicly shared files, delete/unset the setting and
  redeploy/restart the production functions as appropriate. This does not
  revoke already granted Google Drive permissions.
- Private-first upload, reviewer-mediated permission promotion, draft image
  previews and revocation on unpublish are a **separate coordinated backend,
  CMS and owner-approved UI migration**, not part of this safeguard.

Stage and run `node --test tests/drive-publication-policy.test.mjs` followed
by `npm test` before requesting a reviewed release. Verify both uploaded
image and PDF workflows in isolated Firebase/Google Drive staging, including
the deliberately blocked state. Never put production OAuth or Firebase
service-account credentials in pull-request CI.
