# BCG.LK — Recoverable CMS archive migration and release gate

**Proposed change:** Replace the existing administrator Delete button with the already implemented server-owned archive/restore workflow. Deny client-SDK hard deletions and writes to archived records in Firestore rules. **Proposed only: not deployed to production.**

## What is changed in this PR

- `src/lib/cmsWorkflowClient.js` uses the signed-in admin's Firebase ID token to call **only same-origin** `/api/admin/workflow`. GET `action=trash` determines whether a record is archived; POST `action=archive` or `action=restore` performs the recoverable transition.
- `ContentManager.jsx` uses the existing danger button style, labeled **Archive / Restore**, and gives explicit confirmation. After an archive, the public record is unpublished, an archived snapshot and audit record exist, and the row remains as a draft. Restores never publish automatically.
- `firestore.rules` denies **all ordinary client SDK hard deletion** across all seven CMS types. It rejects create/update of content while a matching `cmsTrash/{collection}_{recordId}` archive snapshot exists. Server workflow operations use reviewed Firebase service credentials and are not governed by client rules.
- `tests/integration/firebase-emulator.test.mjs` is updated to reject client hard deletion (even for admins) and assert archived records cannot be modified or republished until server restore.
- Existing source-level workflow integration tests already prove archival snapshots, two-person approvals, optimistic update locks and restore-to-draft behavior with mocked Firestore REST calls. Added client-source regression tests to prevent reverting to `config.remove`.

**Protected design**: No CSS/animations/homepage visuals changed. The legacy Delete button text/behavior changes; the layout and classes are reused. Explicit site-owner UI approval and screenshot comparison remain required.

## Critical: deploy code and rules in a coordinated, recoverable sequence

1. **Restore GitHub Actions runner execution** first, then obtain passing latest-head Build, Backend emulator, Browser Smoke, Visual compare, and Dependency audit jobs with independent PR approval.
2. Create a disposable Firebase staging project. Validate `FIREBASE_SERVICE_ACCOUNT_JSON`, `FIREBASE_PROJECT_ID`, `FIREBASE_WEB_API_KEY`, `USER_ADMIN_ORIGIN` on a protected staging Vercel deployment. Do not copy production credentials into untrusted PR previews.
3. Back up staging data. Load representative News, Events, Pages, Past Papers, Sports, Societies and Leadership records. Include older documents without timestamps, previously archived snapshots, slugs, and shared media.
4. **Stage the updated Firestore rules** and run the Firebase emulator suite; verify that all seven CMS record types remain creatable/editable as drafts, that publishing roles are still correct, and that direct client delete and archived updates fail even for Super Admin.
5. Stage the frontend/API changes against the same staging project. Test each collection: Archive -> public visibility stops -> audit/revision+trash snapshot exists -> Restore -> draft is editable -> republishing requires an explicit action. Verify 401/403 for outsiders and admins whose roles were revoked.
6. **Before production** take a verified Firestore backup/export plus record the restoration procedure. Archive must fail without writing when service-account configuration or network access is missing. Test rollback of both code and Firestore rules in staging.
7. For production, deploy the reviewed frontend/API first so admin UI no longer calls `config.remove`; then deploy the reviewed Firestore security rules. Restrict the release window and watch errors. Do **not** deploy rules first, as the old UI may still offer direct Delete and would fail.
8. Test admin archive and restore with an **authorized sacrificial staging record only** before using production. Never test by removing a real college article.
9. If emergency rollback is needed, restore the known-good code and rules together. A Vercel rollback alone does not reverse Firebase rules or CMS snapshots.

## What is intentionally not solved by this PR

- **Mandatory approval for all publications and edits:** The old editor still allows direct create/publish/edit via the Firebase browser SDK. The backend editorial API supports review and approval but the full rule, role and UI migration is a separate high-risk project.
- **Google Drive unsharing:** Archiving removes the Firestore record from public listings, but does **not** revoke already public Google Drive URLs. Staff must audit shares and institutional data/retention policies; the frontend confirmation warns about it.
- **Scheduler:** `CMS_CRON_SECRET` is still needed in Vercel and GitHub Actions. Composite `cmsJobs(status,runAt)` index and due-job retry behaviour require authorized deployment tests. This branch does not enable production scheduled publication.
- **Backup/restore IAM and availability:** Firebase production project privileges, Firestore scheduled backups/PITR, Drive backup and Vercel Preview secrets need owner configuration.
- **Branch protection and CI runner allocation:** These are GitHub repository/account administrative settings, not changes a pull request can grant itself.
- **Analytics:** Cloudflare `CLOUDFLARE_WEB_ANALYTICS_SITE_TAG` was confirmed present in Vercel production during this work; analytics PR #89 remains separately open and needs release checks, verified reporting queries and site-owner review.

## Explicit operator acceptance before closing these tasks

- Archive and restore work for all seven collections, including old content.
- Firestore emulator negative tests **actually run**; do not classify a GitHub runner failure with 0 executed steps as a successful test.
- Vercel Preview `npm test` and build complete, and independent review approves the tiny admin UI label change.
- Media rights and public Drive exposure are reviewed separately.
- GitHub branch protection and recovery controls are verified by the actual repository owner.
