# BCG.LK Firebase Role-Based Access Control (RBAC)

## Scope

RBAC protects the existing seven Firestore CMS collections, Firebase Storage uploads, and Google Drive upload APIs. The **existing public website is unchanged**. Role controls in React improve UX, while **Firestore/Storage rules and server API validation enforce privileges**.

| Role | Read drafts | Create/edit | Publish/unpublish | Reorder | Delete CMS | Upload media | Manage roles |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `super_admin` | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| `admin` (legacy) | Yes | Yes | Yes | Yes | Yes | Yes | No |
| `publisher` | Yes | Yes | Yes | Yes | No | Yes | No |
| `editor` | Yes | **Drafts only** | No | No | No | Yes | No |
| `auditor` | Yes | No | No | No | No | No | No |
| No role / signed out | Published only | No | No | No | No | No | No |

Editors cannot change published documents or set `published=true`, `publishedAt`, or `rank` from the client. The backend enforces this even if a user bypasses the interface. Existing `admin` role assignments continue to have full editorial privileges.

## How to enable on the existing Firebase project

**Do not deploy blindly.** Back up existing Firestore role records and CMS data; confirm the active Firebase project and Storage bucket. Use the existing Firebase project (not the emulator project).

1. Review the `firestore.rules` and `storage.rules` diffs, including any outstanding Storage-privacy PR, and run all GitHub tests with the emulator suites. Confirm existing admin record compatibility using the read-only audit documented in [OPERATIONS.md](OPERATIONS.md).
2. An authorized Firebase owner must manually assign the first `super_admin`: find the owner's **existing Firebase Authentication UID** in Firebase Console → Authentication, then in Firestore create or update `admins/<EXACT_UID>` with **string** field `role` set to `super_admin`. Do not expose a client-side Super Admin registration flow.
3. Deploy the reviewed Firestore and Storage rules to the **correct existing Firebase project** with an approved rollback plan. Coordinate rule deployment with the website release; until the rules are deployed, the new roles and management page cannot operate reliably. Typical authorized CLI command: `firebase deploy --only firestore:rules,storage --project <EXISTING_PROJECT_ID>`.
4. After confirming the owner login to `/admin`, open **Users & Roles**. Enter the exact UID of an **already-created Firebase Auth account**, select `admin`, `publisher`, `editor`, or `auditor`, and confirm. The interface does **not** create an email/password account. Verify the UID carefully against the Authentication console before granting rights.
5. Test one account for each role in a nonproduction environment first, including revocation of an active session, blocked draft publication by editors, blocked deletion by publishers, and read-only auditor access. Only then deploy to production and verify with authorized accounts.

## Safety invariants

- An authenticated user cannot create or modify their own role record through the frontend.
- No browser client can grant `super_admin` or edit/delete **any** `super_admin` role record. Only a trusted Firebase console/Admin SDK operator can promote, demote, or recover super-admin accounts.
- Only a `super_admin` may list, assign, edit, or revoke other non-super-admin role records.
- Every role assignment has `updatedAt` and `updatedBy`; newly created assignments also include `createdAt` and `createdBy`. These attributes are enforced for client-issued changes, but do not replace a centralized immutable audit-log service.
- Firebase Authentication accounts remain separate from role records. **Revoke** removes console access but does **not** delete the Firebase user. Assigned UIDs must be verified against Auth by an authorized operator.
- Authenticated console access is rechecked on entry and monitored via Firestore snapshots for revocation/downgrades. Security rules remain authoritative if a browser has stale role state.
- The role-management screen should not be treated as an Auth-user directory; it lists role assignments only.
- This PR changes Firebase rules **in source control only**. Merging the PR or deploying the Vercel frontend does not update deployed Firebase rules.

## Coordination with Storage-privacy PR #44

PR #44 proposes splitting anonymous `get` and `list` permissions in Storage. This RBAC change updates the media-uploader role check. Review/rebase the two proposals together **before deploying Firebase Storage rules**, preserving both the anonymous-directory-listing restriction and the expanded uploader role list. Deploying an older Storage rule after the newer one can accidentally reverse the privacy policy.

## Rollback

Restore the previous Vercel deployment and the approved previous Firebase rules release only after checking active role assignments and user access. A Vercel rollback alone cannot revert Firestore/Storage rules. Avoid removing the only `super_admin`; manage recovery through the trusted console or Admin SDK. Record test evidence, the deployment date, approver and rule release identifiers in the release log.
