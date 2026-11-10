# Firebase staging acceptance — BCG.LK

This runbook establishes **real**, non-production Firebase authentication evidence. It does **not** use disposable Firebase emulators or production credentials. The audit performs Firebase Auth sign-in and Firestore GET only; it never writes data, creates accounts, changes roles, or deploys rules.

## Required owner setup

1. Create a separate Firebase project (staging) under a controlled account. Record its project ID and the distinct production Firebase project ID privately. Deploy the repository's current `firestore.rules`, `storage.rules` and `firestore.indexes.json` to **staging only** after reviewing compatibility. Never deploy these files to production as part of this test.
2. Configure the staging Auth provider and create four disposable test-only identities with distinct email addresses: `editor`, `publisher`, `admin`, and `super_admin`. Provision matching `admins/{uid}` role documents using a **trusted staging-only administrator**, not a browser SDK. Do not re-use real school accounts or personal credentials.
3. In GitHub repository settings, create an environment called `staging` with environment protection/reviewer approval. Add these **environment secrets** (not repository-wide PR secrets):

   - `BCG_STAGING_PROJECT_ID` — exact staging Firebase ID
   - `BCG_PRODUCTION_PROJECT_ID` — actual production Firebase ID, used only for a distinct-ID assertion
   - `BCG_STAGING_WEB_API_KEY` — staging Firebase Web API key
   - `BCG_STAGING_EDITOR_EMAIL`, `BCG_STAGING_EDITOR_PASSWORD`
   - `BCG_STAGING_PUBLISHER_EMAIL`, `BCG_STAGING_PUBLISHER_PASSWORD`
   - `BCG_STAGING_ADMIN_EMAIL`, `BCG_STAGING_ADMIN_PASSWORD`
   - `BCG_STAGING_SUPER_ADMIN_EMAIL`, `BCG_STAGING_SUPER_ADMIN_PASSWORD`

4. After independent review and merge, go to **Actions → BCG.LK Firebase Staging Authentication Audit → Run workflow** on `main`. Set `staging_project_id` to the approved staging ID and type `RUN_READONLY_STAGING_AUTH` exactly.
5. Confirm logs show `PASS staging Firebase sign-in and own role` for all four accounts, plus `PASS anonymous, cross-role and admin-list restrictions`. Record the successful run URL in the acceptance issue. Logs never print passwords, tokens or emails.
6. Run authenticated CMS publication, scheduling, archive/restore and administrator-recovery tests **separately**, against disposable staging records. This read-only audit does not claim those workflows pass.

## Important constraints

- `BCG_STAGING_PROJECT_ID` must match the manually approved input, differ from `BCG_PRODUCTION_PROJECT_ID`, and not be the emulator ID `demo-bcg-e2e`.
- Missing secrets, wrong roles, incomplete Auth users, permissive Firestore rules, invalid passwords and network failures must make the workflow **fail**, never be counted as a pass.
- The standard Vercel Preview currently contains no production Firebase credentials by design. To test CMS endpoints in Preview, use **separate staging-only** Firebase configuration and least-privilege server credentials; do not broaden production secret scopes.
- To diagnose the older Preview `/api/admin/workflow` 503: verify staging configuration is actually present before testing an authenticated request. Anonymous CMS calls should return 401 independently of whether the backing environment is configured.
- UI accessibility, serverless CMS API health, GTM/CSP runtime, and live primary-domain SEO are separate launch acceptance conditions.
