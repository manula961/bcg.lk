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
- Events on the public page are currently hardcoded; Events and Pages admin views are placeholders.
- Do not alter the existing UI to implement these features without explicit permission.
- The automated checks are static configuration assertions plus a Vite build, **not** Firebase emulator authorization tests.
- Verify published/draft access, admin authorization, image upload limits, and deployment configuration in a Firebase emulator or test project before production release.
- Keep `.env.local` and service account credentials out of Git. Firebase web configuration is not a service account secret; Firestore and Storage rules enforce access.

## Branch policy
Keep `main` unchanged while working on `backend-updates`. Review the diff for modifications to styles, layout, animations, and components before merging.
