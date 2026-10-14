# Backend security and delivery

This branch uses Firebase Authentication, Firestore, and Firebase Storage.

## Setup
1. Copy `.env.example` to `.env.local` and populate the six Firebase web app configuration values.
2. Enable email/password sign-in in the Firebase console.
3. Deploy the rules using the Firebase CLI: `firebase deploy --only firestore:rules,storage` against the **intended** project (check your selected project first).
4. Provision admin access using a trusted Firebase administrator: create Firestore document `admins/<firebase-auth-uid>` with field `role` equal to `admin`. Never permit client-side creation of admin records.
5. Run `npm ci`, `npm test`, and `npm run build`.

## Current limitations
- News has Firestore-backed publishing and a management form.
- The current main branch supplies Firestore-backed News, Events, and Pages admin management. Confirm public event/page publishing behavior before production release.
- Do not alter the existing UI to implement these features without explicit permission.
- The automated checks are static configuration assertions plus a Vite build, **not** Firebase emulator authorization tests.
- Verify published/draft access, admin authorization, image upload limits, and deployment configuration in a Firebase emulator or test project before production release.
- Keep `.env.local` and service account credentials out of Git. Firebase web configuration is not a service account secret; Firestore and Storage rules enforce access.

## Branch policy
Keep `main` unchanged while working on `backend-updates`. Review the diff for modifications to styles, layout, animations, and components before merging.

## Code audit — 2026-10-14 (backend-updates)

### Verified
- Public News and Events subscribe to Firestore via `newsService` and `eventsService`; these preserve the existing styled components.
- The admin dashboard uses `ContentManager` to manage News, Events, and Pages. An older `NewsManager.jsx` is **not present** on this branch.
- Firestore and Storage rules require an admin document for writes; unknown paths are denied. Live emulator tests are still required.
- The previous merge-marker incidents were repaired. CI now checks source files for new unresolved markers.
- The inspected `dist/index.html`, `node_modules/.package-lock.json`, `.vercel/project.json`, and old duplicate `NewsManager.jsx` paths are **not tracked/present** in this branch. Build outputs and dependency folders are already ignored.

### Findings not changed because of Rule #1
- `src/index.css` declares font `@import` rules after Tailwind directives. Vite warns that imports must precede rules; moving imports can affect typography. Compare screenshots before fixing.
- `index.html` references `./src/Assets/Logo.png`, but that exact repository path was not found via the source-file lookup. Validate favicon delivery and the intended asset path before changing any branding asset.
- Footer links still include `href="#"` placeholders. Destinations require product/content decisions.
- No unit tests currently exercise React UI behavior, responsive layouts, or Firebase emulator read/write permission boundaries. CI validates the build and static rule invariants only.
- Repository file search was not indexed/available; this is a targeted audit of inspected live files, **not** a verified exhaustive list of every tracked path. Do not delete assets without an import/reference and deployment audit.

### Cleanup decision
No additional tracked source or UI file met the evidence threshold for safe deletion. Preserve application components, assets, Firebase rules, dependency lockfile and CI workflows. Do not delete the older uploaded ZIP's `dist/` or `node_modules/` from Git because they are not verified tracked files in the live branch.

## Four-phase readiness review — 2026-10-14

### Phase 1: Firebase authorization and access control
- Reviewed `src/admin/AdminApp.jsx`, `firestore.rules`, `storage.rules`, and the shared content repository. The admin screen checks `admins/{uid}.role == admin`; Firestore rules enforce admin-only writes and restrict public content reads to published documents.
- Storage allows public read access under `public/` and admin-only writes to supported image MIME types under 10 MiB. MIME declarations alone do not validate file contents.
- Added source-level CMS contract regression tests. These **do not** simulate Firebase rule execution. Before production, verify anonymous/authenticated/admin reads and writes against Firebase Emulator Suite and confirm the deployed rules match the repo. Create a test-only admin account and test: anonymous published reads; draft denial; non-admin write denial; admin CRUD; non-admin storage upload denial; admin image upload and size/content-type limits.
- Review Firebase Auth email enumeration protection, authorized domains, MFA for privileged users, and admin membership provisioning from a trusted console. These account/project settings cannot be confirmed from Git source alone.

### Phase 2: News, Events, Pages CMS
- Source review confirms all three services have published and admin subscriptions, create/update/delete operations, validation and server timestamps. The admin interface connects these services to existing CMS screens.
- Test actual login, create, edit, publish, unpublish, delete, refresh and cross-browser behavior in a staging Firebase project. No test content was written to production.
- Pages CMS stores entries in Firestore; creating a page does not by itself create a new public route. Public News and Events already subscribe to published content through the existing sections.

### Phase 3: Rule #1 UI preservation
- No existing JSX, CSS, fonts, images, or layout files were modified by this phase of work.
- `scripts/verify-no-ui-changes.mjs` blocks modified UI and asset paths for backend PRs; `tests/cms-contracts.test.mjs` adds static CMS contract checks.
- Visual regression **not yet verified**. To finish, capture matching desktop and mobile screenshots of baseline `main` and the new Vercel preview with matching viewport/data and compare hero, menus, News, Events, admin, mobile and animation behavior. Do not approve a visual change automatically.

### Phase 4: Deployment and operations
- CI runs `npm ci`, Node tests and Vite production build. Backend-only PRs additionally block UI-file diffs. Verify PR checks and Vercel deployments before merging.
- Verify all six `VITE_FIREBASE_*` values exist for appropriate Vercel Preview and Production environments. These are public web-app identifiers, not service-account secrets.
- Confirm authorized domains, safe deployment previews, a tested recovery procedure, Firestore export/restore, audit logging, and administrator offboarding procedures. These require project-owner access and are not proven by GitHub checks.
- Outstanding no-UI-change decisions: CSS font-import warnings, unresolved favicon reference, and placeholder navigation links. Altering their presentation or behavior requires explicit approval under Rule #1.

**Release gate:** Automated tests and Vercel build must pass, then emulator security tests and visual comparison must be completed before treating all four phases as fully production-verified. Do not merge or deploy Firebase rules automatically without reviewed results.

## Executable verification — Firebase Emulators, CMS, visual regression

### Automated Firebase and CMS integration tests
`tests/integration/firebase-emulator.test.mjs` runs real Firestore and Storage rules in Firebase Local Emulator Suite. It tests anonymous, non-admin and admin access; denial of draft reads; published-only queries; CMS create/edit/publish/unpublish/delete; unauthorized writes; deny-by-default paths; storage size, MIME type and restricted uploads.

CI uses Node 22, Java 21, `@firebase/rules-unit-testing@5.0.2` and `firebase-tools@13.35.1` with demo project `demo-bcg-verification`. There are **no production credentials or data writes**. The test dependencies are installed ephemerally without modifying the existing dependency lockfile.

For local execution after `npm ci`:
```bash
npm install --no-save --package-lock=false @firebase/rules-unit-testing@5.0.2
npx --yes firebase-tools@13.35.1 emulators:exec --only firestore,storage --project demo-bcg-verification "node --test tests/integration/*.test.mjs"
```

### Manual visual regression workflow
Run the GitHub Actions workflow **BCG.LK Visual Regression** (workflow_dispatch) with an approved main deployment as `baseline_url` and the candidate preview as `candidate_url`, both publicly reachable from GitHub Actions. The browser loads public `/` and admin `/admin` on desktop (1440x900) and mobile (390x844), saves baseline/candidate/diff PNGs as build artifacts, and fails if more than 0.5% of pixels differ. Matching dynamic content, login/session state, fonts, and access controls is required for meaningful results. It does **not** bypass Vercel deployment protection or auto-approve visual differences.

### Production sign-off
- CI passing verifies emulator rules and documented CMS integration behaviors, but **does not** cover every production Auth/Storage configuration or real admin browser interactions.
- A project owner still needs to perform staging admin login and full CMS flows against configured Firebase and verify user roles and deployment settings.
- The visual workflow must be run with baseline and candidate URLs before Rule #1 can be independently signed off.
- Do not merge into `main` until both automated checks and remaining staging/visual verification pass.

## Societies CMS (2026-10-14)

The existing admin dashboard now includes a Societies section. Admins can add, edit, delete, save drafts, publish, and unpublish a society with the following fields: society name, category, description, HTTPS logo URL, and optional HTTPS external website/social link.

Firestore collection: `societies`. Only records with `published == true` are publicly queried and shown in the existing `/life/societies` page under "College Societies". The admin interface reuses its existing form and list components; no existing CSS was changed. Images are supplied as HTTPS URLs (the admin panel does not upload logo files directly).

Deploy the updated `firestore.rules` **to the correct Firebase project** after review, using `firebase deploy --only firestore:rules`. The new collection is unavailable until the rules are deployed. No production rules have been deployed by this branch.

CI checks admin-only writes, draft confidentiality, public published-only reads, and Societies CRUD in the Firebase emulators. It does not populate production society records. Add profiles through the admin panel once reviewed.

## Sports, extracurricular and senior school administration CMS (2026-10-14)

Three more content sections reuse the existing dark admin dashboard, list and editor components:
- **Sports:** sport/team title, category, description, achievements, HTTPS image URL, draft/published state. Published entries are displayed under `/life/sports-athletics`.
- **Extracurricular:** activity title, category, description, HTTPS image URL, draft/published state. Published activities are displayed on `/life/societies`, beneath the societies directory.
- **Leadership:** verified staff member name, school position, display order 1–20, optional profile and HTTPS portrait URL, draft/published state. Published senior administrative staff are displayed in order on `/life/leadership`. This is a directory for the principal and other verified senior staff, not student prefect ranks; do not publish unverified staff identities.

The role selections are Principal, Deputy Principal, Assistant Principal, Sectional Head and Other Senior Staff. Administrators are responsible for choosing the correct order, confirming appointments and setting publication status. Ranking is controlled by the administrator, not inferred from person names.

Firestore collections are `sports`, `extracurricular`, `leadership`. Public queries require `published == true`; only verified administrators can write. Before enabling production content, deploy the reviewed `firestore.rules` to the *correct* Firebase project. GitHub/Vercel deployment alone does not publish Firestore rules.

All existing homepage components, CSS and shared page design remain untouched. New public directories reuse the same existing scoped life-page card classes, without adding new styles. Run Firebase Emulator tests, browser CRUD checks and visual comparison before merging.
