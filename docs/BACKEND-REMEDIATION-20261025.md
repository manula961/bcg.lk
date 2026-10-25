# BCG.LK — Backend remediation and release gates (2026-10-25)

This branch is an **unreleased candidate**, not a claim of complete backend production readiness. It is applied on main `9da4b9ded2f489cf6788bba39ea3228f4f6b9d83` as PR #78, preserving all later Jaliya-authored UI commits and the production Drive ESM runtime fix. Do not merge or promote until independent review and verification against the then-current main.

## Code fixes introduced

| Finding | Change | Verification |
|---|---|---|
| A01 | Replace obsolete UI guard text assertions with current fail-closed contract; retain behavioral guard test | `tests/pr20-placement.test.mjs`, `tests/strict-rules.test.mjs` |
| A04 | New server schema validates complete privileged CMS REST documents for all seven collections; no required fields may be empty | `api/_lib/cms-schema.mjs`, `tests/cms-schema.test.mjs` |
| A06 | Scheduler selects only due `queued` jobs, ordered by `runAt`; indexed query, 250-job bounded batch, retry counter, failed-job quarantine, backlog signal | `api/_lib/cms-workflow.mjs`, `firestore.indexes.json` |
| A07 | Restore verifies the current content `updateTime` in its atomic Firestore commit, and rejects stale timestamps | `api/_lib/cms-workflow.mjs`, integration tests |
| A08 | The workflow API no longer permits direct edits of published content; use `proposeEdit` -> independent `approve` -> `applyEdit` while live content stays unchanged until approval | `api/_lib/cms-workflow.mjs`, integration tests |
| A10 | Add scheduler credentials to environment template, strict optional preflight, error counters and GitHub runner failure alarms | `.env.example`, `.github/workflows/cms-scheduled-publishing.yml` |
| A13 | Audit and history API return `nextPageToken`, accept validated `pageToken` | `api/_lib/cms-workflow.mjs` |
| A14 | Add mock-Firestore transactional lifecycle tests for approved publishing, immutable revisions, archive/restore, race conditions and malformed scheduler jobs | `tests/cms-workflow-integration.test.mjs` |
| A15 | Add minimal CSP restrictions compatible with existing assets; preserve current frontend markup/styles | `vercel.json` |
| A16 | Sync README Node 24 runtime and add unauthenticated workflow/cron endpoints to production readonly smoke | `README.md`, `scripts/check-public-deployment.mjs` |

## Important operational limitations / pending items

**A02** — Production is on READY deployment `9da4b9d`; PR #78 is preview-only. Its Vercel preview builds and source tests pass, but a READY preview alone is insufficient; production and Firebase operations have not changed.

**A03** — `main` is currently unprotected (confirmed GitHub branch API). GitHub Actions build/backend/browser/dependency jobs on PR #78 also fail without executing any steps: runner ID 0 and an empty steps list. This requires the repository owner to inspect GitHub Actions billing/usage, policies, runner allocation and service status; it is not evidence of failing tests.  Repository owner must configure mandatory up-to-date CI checks, one independent latest-head approval, conversation resolution, no direct/force pushes and no admins bypass. Review Settings → Rules → Rulesets or Settings → Branches; confirm `main.protected == true` using the GitHub API. Do not bypass CI or merge for convenience.

**A05** — The existing `src/admin/ContentManager.jsx` still performs direct Firebase SDK publishing and hard deletes. New server workflow/soft delete/revision guarantees cover **only callers of the new workflow API**. The admin console remains intentionally unchanged to obey the existing UI/Jaliya preservation requirement. Universal enforcement requires a separately reviewed admin-console behavior migration, updated Firestore rules and tests. Making rules server-only without updating the editor would break existing admin publishing.

**A10** — Vercel production environment variable inventory does not currently contain `CMS_CRON_SECRET` (checked by variable *names*, never decrypted values). The scheduler cannot operate until its secret is set on both Vercel and GitHub, the composite index is available, and staging end-to-end tests pass. Do not enable scheduled workflow without those checks.

**A09** — Verify the *deployed* Firestore/Storage rules (which can differ from repo), production Firebase Auth lifecycle, service-account least-privilege IAM, protected credential storage, Firestore/Auth/Storage/Drive backup inventory and a staging restore drill. Code changes alone cannot do this.

**A11** — Google Drive media stays public after content deletion/unpublication; `cmsMediaRefs` is advisory. Do not automatically revoke or delete shared files without a reference inventory and school retention policy. PDFs may contain personal data; review before public uploads.

**A12** — Existing full-collection admin subscriptions and whole-collection reorder remain; aggressive pagination requires coordinating the existing UI. Measure reads, add indexes, migrate behind feature flag and review protected UI controls before enabling.

**A14** — The mock transaction tests do not replace **real Firebase Auth, Firestore, and Storage emulator tests** for the new server-side REST flow. Provision an isolated staging Firebase project and test all roles and lifecycle actions. Existing emulator suite verifies Firestore rules for legacy CMS operations, not this new service-account API.

**A15** — CSP directives cover `object-src`, `base-uri`, `frame-ancestors`, and HTTPS upgrade; this is a conservative partial CSP, not a fully verified strict script/style policy. Review real browser traffic before further restrictions. Legacy client writes are not included in server `cmsAudit`; monitor audit gaps.

**A16** — Dynamic Firestore documents are still excluded from static build-time sitemap. Set an SEO policy (daily dynamic sitemap generation or a protected realtime index) before adding crawler-facing enumeration.

## New endpoint usage

**Protected admin**: `Authorization: Bearer <Firebase ID token>`; POST also `Origin: <USER_ADMIN_ORIGIN>` and `Content-Type: application/json`.

- `POST /api/admin/workflow` body `{"action":"proposeEdit","kind":"news","id":"FIRESTORE_ID","patch":{"title":"Revised headline"}}`. Only published content; **does not update the live record**.
- Another `publisher`/`admin`/`super_admin` calls `{"action":"approve","kind":"news","id":"FIRESTORE_ID"}`.
- Authorized publisher calls `{"action":"applyEdit","kind":"news","id":"FIRESTORE_ID"}`. The commit verifies the approved content revision is unchanged.
- Drafts: `submit` -> independent `approve` -> `publish` or `schedule`. `edit` is draft-only.
- `archive` and `restore` are admin-only; restoration remains unpublished. `rollback` creates an unpublished draft at a prior revision.
- `GET /api/admin/workflow?action=audit&pageToken=<cursor>` and `action=history&kind=news&id=FIRESTORE_ID&pageToken=<cursor>` expose `nextPageToken`.

**Cron**: `GET /api/cron/publish`, `Authorization: Bearer <CMS_CRON_SECRET>`, returns counts `published`, `stale`, `failed`, `deferred`, `scanned` and `truncated`. Missing/incorrect secret denies access.

## Required Firebase configuration (manual, reviewed, not executed here)

1. Keep existing Firebase project. Test `firestore.indexes.json` in a **staging** project; its compound `cmsJobs(status ASC, runAt ASC)` index must finish building before scheduled jobs run in production.
2. **Do not blindly deploy `firestore.indexes.json`: it currently lists only the new `cmsJobs` composite index.** First export or inventory all existing production Firestore composite indexes and field overrides, reconcile the checked-in file with the existing index policy, and verify that the planned deployment would not remove previously provisioned indexes. An authorized Firebase owner may add this single index in the Firebase console, or deploy a reconciled full index file to *staging first*. Production index deployment must be a separately approved operation after backup and query verification.
3. Configure `FIREBASE_PROJECT_ID`, web API key, `FIREBASE_SERVICE_ACCOUNT_JSON` (server-only), `USER_ADMIN_ORIGIN`, and `CMS_CRON_SECRET` on the approved Vercel environment. Configure the **matching** `CMS_CRON_SECRET` GitHub Actions secret. Generate a random URL-safe key; never commit it or share it via chat.
4. `BCG_REQUIRE_FIREBASE_ADMIN=1 BCG_REQUIRE_WORKFLOW_SCHEDULER=1 node scripts/check-release-config.mjs` confirms env syntax and project alignment, *not* real IAM or external access.
5. Test 401/403 for all unauthorized routes; test two different publisher accounts on a staging record; test scheduler negative/positive cases; inspect logs and audit retention.

## Release gate commands

```bash
npm ci
node scripts/check-source-syntax.mjs
npm test
npm run build
node scripts/check-bundle-budget.mjs
# Disposable Firebase rules emulator, never production:
npx firebase-tools@13.35.1 emulators:exec --only firestore,storage --project demo-bcg-verification "node --test tests/integration/*.test.mjs"
# After staging preview is deployed:
BCG_PUBLIC_ORIGIN=https://APPROVED-ORIGIN.example node scripts/check-public-deployment.mjs
```

**No production deployment, Firebase rules/index push, credential rotation or destructive data change should occur as an automatic side effect of merging this branch.**

## Evidence / audit references

- Baseline: `docs/STRICT-REPO-AUDIT-FOLLOWUP-20261024.md`
- Workflow architecture: `docs/CMS-WORKFLOW-IMPLEMENTATION.md`
- Production configuration and manual disaster recovery: `docs/RELEASE-READINESS.md`, `docs/OPERATIONS.md`
