# BCG.LK admin analytics — implementation and safe release (2026-10-25)

## Scope of this feature

A new **Analytics** navigation item appears in the existing authenticated `/admin` console.
It does not replace News, Events, Societies, Sports, Leadership, Past Papers or Users & Roles, and
does not change the public BCG.LK UI or existing style files.

The dashboard displays **real editorial Firestore collection counts**:
- Total documents, published documents and drafts (unpublished) across news, events, pages,
  societies, sports, leadership and pastPapers.
- Records created in the last **7 / 30 / 90 days**, based on their `createdAt` field.
- Publishing proportion by collection, details table and CSV export.
- Loading, retry, unauthorized/failed-query states and a timestamp for the last refresh.

Firestore's server aggregation API (`getCountFromServer`) performs 21 bounded count queries
per refresh and transfers **no complete content documents**, photos, UID lists or student data.
All queries use the logged-in Firebase Auth identity; existing Firestore rules still govern
collection reads. The component never writes data, adds cookies or changes published status.

These are **CMS/editorial analytics**, not website visits, unique visitors, page views, GA4 or
real-user performance measurements. No visitor tracking has been configured or represented
as real. To add website traffic, first obtain approval for an Analytics property, data
processing/privacy plan and server-side read-only reporting integration.

### Important limitations

- Aggregations are sampled at separate moments; document changes during a refresh may make
  totals inconsistent. The dashboard fails closed and offers Refresh rather than fabricating a value.
- Historical documents without a `createdAt` timestamp do not count toward the selected recent period.
- Non-admin users cannot access the console; auditors/editors with a recognized console role can
  view content statistics under the existing `canReview()` Firestore rule.
- This page is **not a replacement for approval workflow enforcement**. The existing
  `ContentManager.jsx` can still directly publish or delete; address that as a separately
  reviewed staging migration with matching Firestore rule and backup strategy.

## Preservation safeguards — owner review is required

The owner explicitly requested an admin analytics panel. This modifies only the existing
`src/admin/AdminDashboard.jsx` navigation to add a new section and conditional display;
every existing content-manager section, role check, sign-out control and existing styling
is retained. It adds new isolated analytics components and CSS. No public `src/components`,
pages, static media or pre-existing CSS files are changed.

**JaliyaMaheshakya0529 contributed to AdminDashboard.jsx historically.** The current
repository's Rule #1 and Rule #2 checks correctly reject modifications to this protected path,
even additive changes. Do not bypass or weaken them to force this PR green. An owner- and
contributor-reviewed **explicit policy amendment** is necessary for the limited navigation
addition before merge. Inspect the full diff and visual screenshots and document that approval
separately. Preservation should remain fail-closed for every unrelated UI file.

## Verification before merge

1. Check `npm ci && npm test && npm run build && node scripts/check-bundle-budget.mjs`.
2. Run Firestore emulator tests under disposable `demo-bcg-verification` and confirm that
   anonymous accounts cannot read drafts or aggregate full content counts, but verified roles
   can. Confirm admin-role removal causes dashboard queries to be denied.
3. Compare existing admin paths to the baseline screenshots on mobile and desktop.
   Check each old admin section, keyboard and focus, responsive widths, and reduced motion.
4. Confirm counts against staged Firestore records, including records without `createdAt`.
5. Require a reviewed exception/policy for the expressly approved admin addition.
6. Require GitHub Actions runners to actually execute all required checks and protect
   `main` with reviews. A Vercel READY preview alone is insufficient.

## Remaining release blockers (not changed by this feature)

- GitHub `main` remains unprotected; repository admin must enable branch rules.
- GitHub Actions jobs continue to fail before any runner executes; diagnose account billing,
  eligible runner allocation, permissions and GitHub Actions configuration in owner settings.
- Production `CMS_CRON_SECRET` is absent from Vercel. Do not enable scheduled CMS publication
  until owner explicitly configures the same secret in Vercel and GitHub, verifies the compound
  index, enables runner execution and completes two-person staging review tests.
- Deployed Firebase rules, backup/restore, Auth IAM lifecycle and Google Drive image-retention
  policy need owner-authorized verification.
- Legacy Firestore CMS direct-publish/delete operations, unbounded subscriptions and dynamic
  published-content sitemap still need planned staged remediation.
- Live site traffic and verified GA4 are not available. Do not show fake metrics.
