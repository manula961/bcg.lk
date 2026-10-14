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
