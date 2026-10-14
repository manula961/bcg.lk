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
