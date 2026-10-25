# BCG.LK — strict post-merge repository audit (24 October 2026)

## Scope, rules and verdict

Repository: `manula961/bcg.lk`. The audited baseline is `main` commit `e07cef501f91cc6694e30cf2b842845028169082` (the merge of PR #68). Review used **repository source, Git history and GitHub Actions metadata only**. No third-party research, live website manipulation, Firebase production access, or external testing was used.

**Verdict: NO-GO.** Do not deploy, merge, or claim production certification until the latest-commit checks and independent review are demonstrably green, and a repository owner verifies the required release controls.

- **Rule #1:** All public/admin UI source, styles, animations, responsive behavior and visual/media assets remain byte-for-byte untouched by this proposed remediation.
- **Rule #2:** Every historically Jaliya-authored file must remain unchanged. `package.json` was found to have Jaliya-authored history, so an intermediate exploratory change was reverted and its final blob equals `main` (`4118220e95d51eb25c8c60b4f0c75529e0461fe4`). No existing Jaliya-authored file is in the proposed final diff.
- Changes are only to Vercel middleware, backend-oriented policy/CI scripts, tests and this audit report. No Firebase rules, Firebase Auth account, content record or OAuth grant was modified.

## Findings, severity and evidence

| ID | Severity | Finding | Disposition |
| --- | --- | --- | --- |
| C-01 | CRITICAL | `middleware.js` on `main` contained a dangling `||` with no closing expression in `isKnownRoute`, a parse-time JavaScript syntax error. Existing routing tests import it and cannot execute until parsed. | Fixed on review branch; a dependency-free syntax gate added to both Build and Backend checks. **CI run required.** |
| G-02 | BLOCKER | `main` currently reports `protected: false` with status-check enforcement off. PR #68 was merged while its own release notes said DO NOT MERGE. | Requires repository owner to enable and verify mandatory pull requests, independent latest-SHA approval, required green CI, no force pushes and no direct pushes. This cannot be proven by a workflow file alone. |
| G-03 | BLOCKER | Latest post-merge Build and Backend Actions runs on `e07cef50` failed; the inspected jobs show **zero steps**, completing within approximately two seconds. These runs supply no evidence that npm, emulators or browser checks actually ran. | Investigate GitHub Actions account/runner/billing/quota/permissions. Do not confuse zero-step failure with a verified application test failure or ignore it. |
| S-04 | HIGH | The old Rule #1 script accepted historical exact blob exceptions; a review branch could restore outdated allowlisted UI blobs even if they differed from the current baseline. | Removed prior blob allowlists and special cases; compare all protected paths against current base and reject additions/edits/deletions without owner-approved policy review. New regression tests added. |
| S-05 | HIGH | `package.json` is Jaliya-authored in repository history. A seemingly harmless CI-script addition there would violate Rule #2. | Final branch restores `package.json` exactly; syntax gate is invoked by non-Jaliya CI workflows. |
| S-06 | HIGH | Published Google Drive assets are not automatically reconciled/deleted on CMS unpublish or deletion. Existing explicit cleanup only accepts newly app-marked uploads. | Remains open; data retention and live-media linkage require owner-approved policy, migration/reconciliation and staging tests. |
| R-07 | MEDIUM | Full published Firestore collections are read without approved UI pagination; adding a limit silently would hide valid content. | Deferred: obtain explicit Rule #1 permission before any pagination/UI change. |
| R-08 | MEDIUM | Events calendar error state and midnight rollover would require changes in protected React components. | Deferred under Rule #1 until owner approves exact UI changes. |
| R-09 | MEDIUM | Dynamic CMS articles/events/pages are not included in the static sitemap. Indexing middleware has bounded per-isolate reads but no distributed rate limit. | Remains open for a safe published-only metadata feed, staging and operations sign-off. |
| R-10 | MEDIUM | Deployed Firebase/Storage rules, Auth/IAM least privilege, real backup restores, production runtime and OAuth/Drive endpoints were not verified by this audit. | Infrastructure/owner staging validation required. |
| R-11 | MEDIUM | Dependency advisories, browser accessibility, pixel-level parity, real-world performance and CSP compatibility cannot be certified while Actions fail before job execution. | Requires successful actual CI runs and approved preview inspection. |

## Implemented on review branch

1. Close the incomplete middleware conditional while preserving all existing allowlisted URLs and unknown-file 404 behavior.
2. Add `scripts/check-source-syntax.mjs` to parse-check repository `.js`, `.mjs`, and `.cjs` sources (excluding JSX, which Vite validates) without any new dependency or secrets.
3. Invoke syntax check before `npm ci` in `.github/workflows/build.yml` and the Backend checks `verify` job.
4. Make `scripts/verify-no-ui-changes.mjs` fail closed on any protected UI path changed relative to the current PR target; remove historical SHA exceptions.
5. Update the obsolete audit-test contract and add temporary-Git-repository guard regression tests.
6. Preserve existing `package.json` and every original protected UI asset.

## Evidence and verification levels

- **Directly observed from repository:** The source-level parse blocker; the former blob allowlist; current workflow files; `package.json` authorship; Firebase/Drive architecture; prior remediation and release guidance.
- **Directly observed from GitHub metadata:** Baseline merge SHA and timestamp; `main` unprotected; latest four post-merge workflow runs failed; Build job and Backend verify/emulator jobs had zero executed steps.
- **Diff-inspected:** No protected UI paths or `package.json` in final review branch comparison.
- **Not demonstrated:** Successful fresh `npm ci`, `npm test`, production build, dependency advisory check, emulator rules tests, Playwright smoke, screenshot parity, deployed HTTP checks, independent approval or Firebase live rules verification. A source review is *not* a passing test.

## Mandatory gates — do not bypass

1. Inspect the proposed full base/head diff and run `node scripts/verify-no-ui-changes.mjs` and `node scripts/verify-jaliya-preservation.mjs` with a full checkout and `origin/main`.
2. Resolve zero-step Actions failures and run the new syntax gate, `npm ci`, `npm test`, `npm run build`, and bundle budget check on the **latest head SHA**.
3. Run disposable Firestore and Storage emulator integration tests and browser smoke tests. Attach visual comparison against the approved baseline; no production writes.
4. Require independent `APPROVED` review on that same commit and a protected main branch with all mandatory status contexts enforced.
5. Verify staging/production parity, content compatibility, OAuth/media lifecycle, headers/404s, backup/restore, rollout and rollback with authorized owners. No production database or rules changes until separately approved.
6. Obtain explicit UI permission for any future edits to calendar states, pagination, frontend components, assets or designs.

**Release remains blocked.** The repository's historical audit documentation describes unresolved owner/infrastructure work and is not proof that a merged remediation was approved or successfully tested.
