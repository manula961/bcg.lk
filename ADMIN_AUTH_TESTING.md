# BCG.LK — Admin authentication and security (Step 1)

## Setup and deployment

1. Confirm Firebase Authentication > Sign-in method > Email/Password is enabled.
2. Create an admin account in Authentication. Copy its UID (not its email).
3. Create `admins/<UID>` in Firestore with a string field `role` set to `admin`. Do this in the Firebase Console or trusted Admin SDK, not client-side code.
4. Verify the six `VITE_FIREBASE_*` web configuration variables in Vercel Production and Preview environments; redeploy after changes. Never use service-account secrets in `VITE_` variables.
5. Deploy both rule sets to the correct Firebase project using `firebase use <project-id>` and `firebase deploy --only firestore:rules,storage`.
6. Deploy the branch to Vercel Preview and test `/admin` there before merging into `main`.

## Manual verification matrix

- Signed out: `/admin` shows the login form.
- Valid Firebase account + `admins/<UID>` with `role: 'admin'`: dashboard appears.
- Valid account without an admin document: explicit Access denied screen; no dashboard.
- Valid account with role other than `admin`: explicit Access denied screen.
- Firestore permissions/network failure: explicit error screen with Retry and Sign out.
- Refresh with an authorized account: dashboard reappears after verification.
- Sign out: login form appears; dashboard is no longer visible.
- Unauthenticated or non-admin user cannot create, update, or delete news, events, pages, or Storage objects.
- Non-admin account with an `admins/<UID>` document but a non-admin role cannot upload files.
- Public visitors can only read documents where `published == true` in news/events/pages.

## Notes

AdminApp uses a single auth observer and server-side Firestore role verification. The 12-second verification timeout shows a retryable error rather than leaving the page on a spinner. It does not cancel an in-flight Firestore request; stale results are ignored. Public Storage reads remain allowed by design, so do not put private files under `public/`.

**Important:** GitHub commits do not deploy Firebase rules. Rules must be published separately. A successful Vite build does not prove authentication or rule behavior; perform the manual checks above on the deployed preview.
