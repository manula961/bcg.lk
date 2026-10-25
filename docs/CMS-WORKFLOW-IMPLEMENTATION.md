# BCG.LK CMS workflow — backend implementation

## Scope and compatibility

This is an **additive**, opt-in workflow for the existing Firebase Firestore + Vercel CMS. It does not replace the existing published-content contract: public pages still filter documents by `published == true`. Existing admin UI files and Jaliya-authored files remain unchanged. The existing admin console continues to support its original direct Firestore create/edit/publish/delete operations.

**Important limitation:** the new approval requirements apply to the **new workflow API only**. Legacy direct Firebase SDK writes are still authorized according to `firestore.rules` and can bypass editorial approval, revisions, and soft deletion. An enforcement migration and new admin UI controls require a separately approved UI/rules change, complete emulator coverage, and data migration. Do not describe approvals, trash, or history as universal until that integration is complete.

## New endpoints

- `GET /api/admin/workflow?action=status&kind=news&id=DOC_ID`
- `GET /api/admin/workflow?action=history&kind=news&id=DOC_ID`
- `GET /api/admin/workflow?action=trash&kind=news&id=DOC_ID`
- `GET /api/admin/workflow?action=audit` (super_admin or auditor)
- `POST /api/admin/workflow` JSON actions: `submit`, `approve`, `edit`, `proposeEdit`, `applyEdit`, `publish`, `schedule`, `archive`, `restore`, `rollback`.
- `GET /api/cron/publish` authenticated only with `Authorization: Bearer <CMS_CRON_SECRET>`.

All admin API calls need `Authorization: Bearer <Firebase ID token>`; POST additionally needs an exact `Origin: <USER_ADMIN_ORIGIN>`. Use `Content-Type: application/json`. Example POST body:

```json
{"action":"submit","kind":"news","id":"existing-firestore-doc-id"}
```

Publishing requires a **different** administrator to approve the submitted record. Each approval binds to the Firestore document's current `updateTime`; modifying content invalidates that approval. Publishing and scheduling require publisher/admin/super_admin privileges. Archiving and recovery are restricted to admin/super_admin. Editors can submit and edit unpublished records only. Revising an existing record uses:

```json
{"action":"edit","kind":"news","id":"existing-firestore-doc-id","patch":{"title":"Edited headline"}}
```

To schedule publication, first submit, get independent approval, then send:

```json
{"action":"schedule","kind":"news","id":"existing-firestore-doc-id","runAt":"2026-11-01T06:00:00Z"}
```

**Safe live edits:** Existing published content cannot be edited directly through the protected API. Submit `{"action":"proposeEdit","kind":"news","id":"EXISTING_ID","patch":{"title":"Proposed title"}}`. A **different** publisher/admin/super-admin calls `approve`; a publisher then calls `applyEdit`. The original public record remains unchanged until `applyEdit` succeeds against the reviewed source revision. Normal client Firestore writes still bypass this opt-in workflow until the admin UI migration is separately approved.

Schedules must be UTC and between 2 minutes and 90 days ahead. For rollback, supply the history item's immutable `revisionId`. Rollbacks restore a **draft**, not immediate publication. Archiving makes a record unpublished before placing its snapshot in `cmsTrash`. Restores leave the content unpublished. Do not manually delete archived records or overwrite them outside the workflow if you expect automatic restoration.

## Protected metadata collections

- `cmsWorkflow/{collection}_{id}`: current review and approval state.
- `cmsHistory/{collection}_{id}/revisions/{uuid}`: revision snapshots.
- `cmsTrash/{collection}_{id}`: recoverable archive snapshots.
- `cmsAudit/{uuid}`: append-only server audit records.
- `cmsJobs/{uuid}`: scheduled publication queue.
- `cmsMediaRefs/{collection}_{id}`: advisory media URLs for records processed by the workflow.

The source-controlled Firestore rules already have a deny-by-default final match; **these collections are intentionally accessible only via verified server endpoints**. Do not add permissive Firestore client write rules for them. Backend service accounts bypass client security rules, so authn, RBAC, validation and optimistic-concurrency preconditions are implemented server-side.

All workflow commit operations use optimistic concurrency and atomically attach audit records; relevant data mutations also save a pre-change revision. Scheduled jobs are idempotent via Firestore document preconditions and job state. Due-job scanning uses an indexed `status == queued && runAt <= now` query ordered by `runAt`, processes a bounded 250-job batch, retries failed jobs at most five times, and quarantines repeatedly failing jobs. Backlogs produce a diagnostic. The composite index in `firestore.indexes.json` must be deployed and ready before enabling production automation.

## Required production setup (not performed by a PR merge)

0. Review `firestore.indexes.json` and deploy the `cmsJobs(status, runAt)` index in staging first. Index deployment is a separate, authorized Firebase operation.
1. Keep the existing Firebase project. In Vercel production set and verify `FIREBASE_PROJECT_ID`, `FIREBASE_WEB_API_KEY` (or `VITE_FIREBASE_API_KEY`), `FIREBASE_SERVICE_ACCOUNT_JSON`, `USER_ADMIN_ORIGIN=https://bcglk.devoraid.com`.
2. Generate a random 32–256-character URL-safe `CMS_CRON_SECRET`. Configure **the same value** in Vercel production environment secrets and the GitHub repository's Actions secrets. Do **not** put it in `VITE_*`, code, PR comments, or logs.
3. The service account needs narrowly scoped Firestore document read/write rights. Limit credentials to protected Vercel environment scope; rotate any exposed keys and prefer workload identity where feasible.
4. Merge the scheduler workflow after independent review. GitHub Actions cron may be delayed, so publishing is **eventually scheduled**, not guaranteed at the exact minute. Alerts must monitor the workflow.
5. Confirm `api/cron/publish` returns 401 without the secret and the admin endpoint returns 401 without a valid Firebase ID token. Verify an editor cannot approve or archive, and self-approval is denied.
6. Test a disposable Firebase staging project with the seven existing CMS types; verify published public content and media links before attempting production usage.
7. Backup Firestore and existing Drive media before enabling any production automated writes. Verify a staging restore and recovery procedure. The repo does **not** configure cloud backup policies or manage Drive permissions automatically.

## Remaining production blockers

- GitHub's failing CI checks must be diagnosed and green; a Vercel `READY` build alone is insufficient.
- Rule #1 explicitly protects existing admin UI; no admin-screen workflow buttons were added. Request a narrowly scoped approval + baseline screenshots before integrating these endpoints into the existing admin interface.
- Server audit and history cover workflow API calls, **not** legacy direct Firestore writes.
- `cmsMediaRefs` is an advisory index; it does not revoke public Google Drive shares or delete remote media automatically.
- No email notification transport or managed Firestore backup was provisioned; those require infrastructure/secret configuration and service-owner approval. Explicit Drive file deletion now checks active CMS records for references and fails closed when the content scan fails; static or retired references still require manual review.
- Protect `main` with mandatory tests and independent review. Run staging emulators, production readonly checks and a rollback rehearsal before declaring backend finalized.
