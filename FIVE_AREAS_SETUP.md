# Five-area remediation and isolated Firebase staging

This branch implements changes in five areas: required CMS fields, full CI coverage on main, authenticated CMS tests, event calendar accessibility, and route-level code splitting. Do **not** deploy revised Firestore rules to production without first checking existing records for missing fields and migrating legacy drafts, because the new rules require fields on **all writes**, including edits to old records.

## CI and production release

The build, dependency audit, Firebase emulator and Playwright smoke workflows now also run on pushes to main. In GitHub Settings > Branches or Rulesets, require all four checks on PRs, require review, and disable direct pushes to main (requires repository administrator access and is not configured by this PR). The Rule #1 UI checker pins authorized visual source to exact Git blob SHAs.

## Local isolated authentication test

The default PR browser workflow starts Auth, Firestore and Storage emulators for the fixed demo project `demo-bcg-e2e`. It creates a disposable email/password admin user and Firestore role record; then a real browser exercises /admin sign-in, create draft, publish, two concurrent editor sessions, conflict rejection and delete. It can also test two events sharing the same calendar date. No production account or database is involved. `VITE_USE_FIREBASE_EMULATORS` connects only for the fixed demo project on localhost/127.0.0.1, never an Internet origin.

## Set up a separate real Firebase staging project

1. Create a **new Firebase project** specifically for staging; enable Firestore and email/password Auth. Do not reuse the production Firebase project or user accounts.
2. Deploy the reviewed `firestore.rules` to **staging** using your Firebase project selection, then provision a dedicated staging admin Auth user and a matching Firestore `admins/<uid>` document with `role: "admin"` using the Firebase Console or approved administrative tooling.
3. Configure a protected GitHub Actions environment named `staging`, with approval rules. Set environment variables `STAGING_FIREBASE_AUTH_DOMAIN`, `STAGING_FIREBASE_PROJECT_ID`, `STAGING_FIREBASE_STORAGE_BUCKET`, `STAGING_FIREBASE_MESSAGING_SENDER_ID`, `STAGING_FIREBASE_APP_ID`, and `PRODUCTION_FIREBASE_PROJECT_ID` (the production ID is used for comparison only).
4. Set GitHub staging-environment secrets `STAGING_FIREBASE_API_KEY`, `STAGING_ADMIN_EMAIL`, and `STAGING_ADMIN_PASSWORD`. The API key is a public Firebase web identifier; the test user's password must remain a secret. Never put production credentials in these fields.
5. Run the **BCG.LK Staging Admin E2E** workflow manually. It fails closed when staging project ID is missing or matches the declared production project, then runs authenticated browser tests against only the isolated staging backend. The test creates uniquely prefixed content, but a failure may require cleaning up leftover test records.
6. After test signoff, review production data compatibility and deploy Firestore rules via approved Firebase release process. This PR alone does not deploy rules or create a cloud Firebase project.

## Event accessibility

Every calendar event is a separate semantic desktop link or mobile button (not a shared clickable date). The mobile dialog has aria-modal labeling, Escape to close, focus restoration and Tab wrapping. The visual pill/dot treatment remains similar; review browser screenshots for approval.

## Performance

Each top-level public/admin route is dynamically imported, with life route metadata extracted to a lightweight shared module; this prevents admin editing code from loading on the homepage. Compare Vite output chunk sizes and browser network waterfalls before merging. Lighthouse and Core Web Vitals are still follow-up measurements, not invented results.
