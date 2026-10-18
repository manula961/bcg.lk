# BCG.LK — current Firebase configuration

**Keep the existing Firebase cloud project.** BCG.LK's production React application and admin CMS continue using the existing Firebase Authentication, Firestore, and Storage settings in Vercel. Do not create a second Firebase cloud project or copy production credentials to a test project.

## Test isolation

GitHub Actions runs authenticated CMS browser tests with local Firebase Auth, Firestore and Storage emulators. The fixed disposable emulator project ID is `demo-bcg-e2e`, and the script refuses any live Firebase test mode. Test accounts, articles and events remain within the CI runner. The optional cloud-staging workflow from PR #33 has been removed.

The existing `src/lib/firebase.js` keeps its production configuration unchanged and connects to the emulators only with `VITE_USE_FIREBASE_EMULATORS=true`, the fixed demo project ID, and a localhost origin.

## When updating rules on the existing Firebase project

The stricter `firestore.rules` source code from PR #33 may reject edits to legacy records whose required content is missing. Before deploying these rules to the **existing** Firebase project:

1. Back up and review records in `news`, `events`, `pages`, `societies`, `sports`, `extracurricular`, and `leadership`.
2. Validate each record's required `title`, boolean `published`, and collection-specific fields. For pages, `slug` must match the document ID. Correct incompatible records before applying rules.
3. Check that the currently deployed rules match the intended version and obtain approval for deploying any changes. Keep a tested rollback procedure.
4. Verify administrator login and published content with the existing Firebase configuration, but do not run destructive automated browser tests against real data.

**This cleanup does not deploy rules, modify the production database, reset admin accounts, or change any Vercel credentials.**

## Five audit improvements remain

- Firestore integrity validation and local emulator regression tests
- Build, backend, security, and browser checks on pull requests and pushes to `main`
- Authenticated CMS tests against local Firebase emulators
- Accessible multi-event calendar controls and keyboard-supporting dialog
- Route-based code splitting with a 300 KiB initial JavaScript entry budget

Repository administrators should require CI checks and review on `main`. The Rule #1 UI protection remains in place; this cleanup makes no public UI changes.
