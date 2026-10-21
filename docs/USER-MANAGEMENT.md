# Firebase User Management — BCG.LK

## Overview

The existing **/admin → Users & Roles** section includes a Firebase Authentication
account-management panel in the original admin styling. Only a verified Firestore
super_admin can call the Vercel endpoint /api/admin/users. Admin, Publisher,
Editor and Auditor cannot view or change accounts through this endpoint.

Available actions:
- **Add User:** Create an Auth account without setting or revealing a password, assign one of admin/publisher/editor/auditor roles, enable the account, and request Firebase's password setup email.
- **Edit User:** Update email and display name.
- **Disable:** Revoke the Firestore console role first, then disable Firebase Authentication. This denies access immediately even if an old ID token remains valid.
- **Enable:** Enable the Auth account only. The Super Admin must separately reassign an appropriate role; access is *not* silently restored.
- **Reset Password:** Request Firebase Authentication to email a password reset link. The link/password is never returned to the admin or logged.
- **Delete:** Revoke the role and delete the Auth login after the Super Admin types the exact email. CMS content previously authored by this UID is retained.
- **Roles:** The existing UI still edits audited role assignments through Firestore transactions and verifies the target Auth UID through the new API.

Self-service modification of the signed-in account and modification of *any*
existing super_admin account are prohibited. The first super_admin and all
super_admin recovery/transfer operations remain trusted Firebase-owner tasks.

## Deployment setup

1. **Back up** Firebase Authentication users and Firestore role records first.
   Confirm the current Firebase Project ID and intended Vercel project.
2. Use the **existing Firebase project**, not the demo emulator project.
   Create a narrowly scoped service account using Google Cloud IAM; it needs
   Firebase Authentication user administration (including send-email capability)
   and Firestore read/write privileges. For example, review the minimal IAM
   permissions represented by Firebase Authentication Admin and Cloud Datastore
   User, then restrict the account to this project.
3. In **Vercel → Project Settings → Environment Variables**, configure:
   - FIREBASE_PROJECT_ID — existing Firebase project ID.
   - FIREBASE_WEB_API_KEY — existing project's Firebase web API key.
   - FIREBASE_SERVICE_ACCOUNT_JSON — the full, valid JSON for that service account
     including the private key. **Never prefix with VITE_ or commit it to GitHub.**
   - USER_ADMIN_ORIGIN — the exact HTTPS origin of the admin deployment,
     e.g. https://bcglk.devoraid.com. This is checked on every modifying call.
4. Ensure the existing Firestore security rules are deployed and a trusted owner
   has assigned the first super_admin via Firebase Console or Admin SDK.
   See docs/RBAC.md for trusted initial provision instructions.
5. Deploy the preview, sign in at /admin as super_admin and open Users & Roles.
   Test with a *dedicated nonproduction Firebase project first*. Do not use a
   live student or employee account for the smoke test.
6. Configure Firebase Authentication's password-reset email template and
   authorized domains. Request a reset for a disposable test user.
7. Verify add, role assignment, edit, disable, attempted login denial,
   enable (with no role restored), role reassignment, password reset, and
   deletion. Recheck all tests and logs before enabling in production.

The browser runs normal Firebase client SDK auth with **no service-account
privileges**. Vercel performs all privileged Auth changes server-side, using
Google OAuth2 service account credentials. Every API request verifies the current
Firebase ID token with Identity Toolkit and the current super_admin Firestore role.
POST also requires a precise HTTPS Origin and JSON content. API responses are
uncacheable and never contain password hashes, passwords, OAuth credentials or
password reset codes.

Account actions are recorded in the **server-only** Firestore userAudit
collection as requested/completed/failed attempts. Role grants/revocations are
recorded in the existing roleAudit collection. The Firestore rules deny client
access to userAudit, so inspect it through a trusted Firebase administrator.

## Recovery and limitations

Firebase Authentication, Firestore and outbound email are separate services;
they cannot participate in a single atomic transaction. If account creation
is interrupted, the backend attempts to leave the new Auth record **disabled**.
Review disabled accounts in Firebase Console and reconcile before retrying.
If a disable/delete fails after role revocation, the account has **no CMS
role** even if its Auth state was not yet changed. This is fail-closed;
reconcile manually rather than automatically restoring privileges.

Do not delete the only super_admin through any mechanism. Onboard a second
trusted owner through a separate, approved Firebase-owner process.

On new account creation, Firebase email delivery might fail after the account
has been created. The UI will show a warning; use Reset Password to retry.

Role changes via Firestore are protected by the existing security rules. Account
changes use a separate service account with permission to bypass Firestore rules
but are reachable only after server-side Super Admin authorization. Restrict IAM
permissions and rotate credentials according to your organization's policies.

**Local Vite by itself does not host Vercel API functions.** For local functional
testing use Vercel dev or a deployed preview configured against *only a staging*
Firebase project. Unit tests mock the API and never write production accounts.

References:
- https://cloud.google.com/identity-platform/docs/reference/rest/v1/projects.accounts
- https://firebase.google.com/docs/auth/admin/manage-users
