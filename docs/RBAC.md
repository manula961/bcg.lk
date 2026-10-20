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

**Media provider distinction:** The `media.upload` permission authorizes the role-checked **Google Drive upload API** for Admins, Publishers and Editors. For the separate Firebase Storage bucket, direct client writes are restricted to Admin and Super Admin, because Firebase Storage emulator tests cannot reliably distinguish an overwrite from a create. This prevents draft editors from changing published file paths. Public Storage image GET remains available and anonymous listing remains denied. The UI currently uploads through Google Drive; don't treat the two storage services as interchangeable.

Editors cannot change published documents or set `published=true`, `publishedAt`, or `rank` from the client. The backend enforces this even if a user bypasses the interface. Existing `admin` role assignments continue to have full editorial privileges.

## How to enable on the existing Firebase project

**Do not deploy blindly.** Back up existing Firestore role records and CMS data; confirm the active Firebase project and Storage bucket. Use the existing Firebase project (not the emulator project).

1. Review the `firestore.rules` and `storage.rules` diffs, including any outstanding Storage-privacy PR, and run all GitHub tests with the emulator suites. Back up existing role records, verify legacy administrators continue to work, and confirm the correct existing Firebase project.
2. In a **nonproduction** Firebase project, deploy the reviewed rules and test each role. For production, deploy the reviewed rules to the correct existing Firebase project under an approved change window and rollback plan. The current `admin` role remains fully supported, so existing admins retain access during the transition. Typical authorized command: `firebase deploy --only firestore:rules,storage --project <EXISTING_PROJECT_ID>`.
3. **After new rules are deployed**, an authorized Firebase owner manually assigns the first `super_admin`: find an existing trusted Firebase Authentication UID in Firebase Console → Authentication, then create or update `admins/<EXACT_UID>` in Firestore with the **string** field `role` set to `super_admin`. If promoting the only legacy admin, always deploy/verify the new rules first to avoid a temporary loss of access; alternatively provision a distinct trusted owner account. No client-side Super Admin registration exists.
4. Confirm the owner can log in to `/admin` and open **Users & Roles**. Assign `admin`, `publisher`, `editor`, or `auditor` to the exact UID of an already-created Firebase Auth account. The UI does **not** create the login. Verify UIDs in Firebase Authentication before granting rights.
5. Validate revocation of an active session, blocked publication by editors, blocked deletion by publishers, and read-only auditor access. Monitor the initial release and retain previous approved rulesets for rollback.

## Safety invariants

- An authenticated user cannot create or modify their own role record through the frontend.
- No browser client can grant `super_admin` or edit/delete **any** `super_admin` role record. Only a trusted Firebase console/Admin SDK operator can promote, demote, or recover super-admin accounts.
- Only a `super_admin` may list, assign, edit, or revoke other non-super-admin role records.
- The super-admin console now appends an immutable-to-clients `roleAudit` record in the same Firestore transaction as a role grant, change, or revocation. The history shows the 25 newest records. Deploy reviewed Firestore rules **before** deploying the upgraded role UI, or role changes will be rejected.
- Firestore clients cannot delete or overwrite those role history documents. This is **not a tamper-proof centralized audit**: privileged Admin SDK users bypass Firestore rules, and a trusted super-admin using a direct SDK could still modify a role without logging through the console. Use Cloud Audit Logs / a privileged server workflow for independently complete compliance-grade audits.
- Every role assignment has `updatedAt` and `updatedBy`; newly created assignments also include `createdAt` and `createdBy`. These attributes are enforced for client-issued changes, but do not replace a centralized immutable audit-log service.
- Firebase Authentication accounts remain separate from role records. **Revoke** removes console access but does **not** delete the Firebase user. Assigned UIDs must be verified against Auth by an authorized operator.
- Authenticated console access is rechecked on entry and monitored via Firestore snapshots for revocation/downgrades. Security rules remain authoritative if a browser has stale role state.
- The role-management screen should not be treated as an Auth-user directory; it lists role assignments only.
- This PR changes Firebase rules **in source control only**. Merging the PR or deploying the Vercel frontend does not update deployed Firebase rules.

## Coordination with Storage-privacy PR #44

PR #44 proposes splitting anonymous `get` and `list` permissions in Storage. This RBAC change updates the media-uploader role check. Review/rebase the two proposals together **before deploying Firebase Storage rules**, preserving both the anonymous-directory-listing restriction and the expanded uploader role list. Deploying an older Storage rule after the newer one can accidentally reverse the privacy policy.

## Rollback

Restore the previous Vercel deployment and the approved previous Firebase rules release only after checking active role assignments and user access. A Vercel rollback alone cannot revert Firestore/Storage rules. Avoid removing the only `super_admin`; manage recovery through the trusted console or Admin SDK. Record test evidence, the deployment date, approver and rule release identifiers in the release log.
