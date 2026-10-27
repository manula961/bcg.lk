# BCG.LK — audit remediation branch, 27 October 2026

Base audited commit: `d26d113068c61e4d223333c7df78c8ea582f1d9a`.
Branch: `audit/remediate-findings-20261027`. These changes are **review-only** and MUST NOT be merged or deployed to production automatically.

## Implemented in this branch

- A03: Restore the existing Pages Firestore service to the admin navigation and shared editor, preserving public Pages URLs.
- A05: Add a role-checked, server-side archive-state listing and let editors distinguish Archived from Draft before editing or publishing; failed verification blocks those actions.
- A07: Confirm before Sign Out when the CMS editor has unsaved changes.
- A08: Pause the Explore auto-rotation on focus, manual selection, and hover. Reduced-motion behavior remains.
- A09: Position event tooltips beside keyboard-focused calendar links rather than leaving the tooltip at the origin.
- A10: Restore failed Past Papers subscriptions through a Retry button.
- A12: List upcoming home events first by event date, then recent past events.
- A14: Disable the obsolete direct Firestore hard-delete function. Archive/Restore is the supported content-removal path.
- A15: Clean up drag state when a drag ends without a valid drop.
- A16: Use the bundled institutional school crest instead of third-party i.ibb.co URLs, subject to visual parity and branding-owner approval.
- A20: Allow hero title wrapping at small CSS viewports/zoom levels. Desktop nowrap is retained.
- A22: Keep mobile calendar modals scrollable in short/zoomed viewports.

A11 is partially mitigated: reordering now stops safely when a collection includes archived items or exceeds 400 records. **Pagination and bounded Firestore collection queries are not implemented**; those require data/UX design and indexing tests.

A17: As observed in the connected Vercel Production variable-name inventory on October 27, all four Cloudflare Analytics variables, including `CLOUDFLARE_WEB_ANALYTICS_SITE_TAG`, are present. Values, live Cloudflare reports, beacon traffic, and token permission were not checked. This is an environment finding, not a source-code change.

## Unresolved / external acceptance gates

| ID | Status | Blocking requirement |
| --- | --- | --- |
| A01 | BLOCKED | `main` was unprotected in GitHub branch metadata. Owner must set effective branch ruleset, required CI, independent review and deny bypass. |
| A02 | BLOCKED | GitHub Actions jobs previously failed before runner assignment (`runner_id: 0`, zero steps). Owner must correct runner/billing/policy availability and obtain latest-head passing jobs. |
| A04 | BLOCKED | Existing browser SDK can still publish directly; server-side two-person review, approved edits and scheduler are optional. To make mandatory, design/stage coordinated rules + frontend + API migration including account roles, legacy publications and rollback. **Do not change production Firestore rules first.** |
| A06 | CONTENT HOLD | School-life and Explore use placeholder/off-topic photography. School media owner must provide approved photographs and copyright/consent clearance; do not silently substitute unrelated photos. |
| A11 | PARTIAL | Full Firestore pagination and scalable atomic ordering above 400 records need separate backend architecture and browser tests. |
| A13 | POLICY HOLD | Google Drive file publication/unsharing needs retention, safeguarding and shared-reference policy. No automatic deletion of already-public or multiply-referenced files is safe without a reviewed policy. |
| A17 | VERIFY | Four env key names are present, but production Cloudflare 7/30/90-day reports and authenticated route still require private live verification. |
| A18 | BLOCKED | `CMS_CRON_SECRET` absent from Vercel Production variable-name inventory; corresponding GitHub secret and Firestore index readiness remain unverified. Configure both sides as an approved rollout, not one-sided. |
| A19 | VERIFY | Deployed Firebase Auth, Firestore/Storage rules, IAM, backups and restoration must be verified by the owner in isolated staging and read-only production inspections. |
| A21 | VERIFY | Browser screenshot parity, responsive alignment, zoom, keyboard and accessibility tests not performed. Source-only findings are not pixel-level evidence. |

## Rule #1: deliberate review hold

This project has a strict `scripts/verify-no-ui-changes.mjs` gate that fails any `src/components`, `src/admin`, or `src/pages` change. This branch intentionally contains minimal **user-requested functional/UI fixes** and therefore conflicts with that preexisting protection policy. Do not weaken the gate in this PR. Before any merge, the project owner must specifically approve the affected UI code/files and independently review the UI-preservation policy in a separate change. The correct immediate outcome for a protected-UI PR is **review hold**, not overriding a failed check.

## Verification / release sequence

1. Restore GitHub Actions runner execution and `main` ruleset. Require independent latest-head review; keep the UI guard effective pending a separately approved policy decision.
2. In a trusted full checkout, run `npm ci`, `npm test`, `npm run build`, Firebase emulators and the existing browser/visual checks.
3. Staging preview: sign in as all five roles. Verify Pages create/edit, published public page, archive/reload/restore, blocked edit/publish for archived, news/events edit/publish, Past Papers retry, date sorting and accessibility.
4. Review Vercel preview build logs and compare screenshot baselines for 320, 360, 390, 768, 1024 and 1440 CSS pixels, short landscape, 200% zoom and reduced-motion.
5. Separately verify production Firebase deployed rules, Cloudflare RUM, authenticated reporting, Drive policy, scheduler credentials/index, and backup restore drill.
6. Only after all approvals, plan coordinated deployment with rollback; **no production write or migration has been executed by this branch**.

Never expose API tokens or Firebase service-account credentials in PR comments or logs.
