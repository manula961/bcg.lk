# Audit remediation and release verification (2026-10-19)

This checklist supplements [OPERATIONS.md](OPERATIONS.md). Do not treat any item below as complete until evidence is recorded. Keep the existing public UI unchanged.

## Automated changes in this branch
- [x] Browser smoke fails rather than warns when a tested viewport has horizontal overflow.
- [x] Visual comparison now includes desktop/mobile Events and Sports/Societies plus mobile Leadership and About Us, alongside homepage/admin.
- [ ] Confirm the latest PR commit passes all build, backend, emulator, security and browser checks.
- [ ] Manually dispatch the visual regression workflow with **approved, accessible** baseline and candidate URLs. Review the screenshot artifacts and any differences; never auto-approve changes.

## Repository-owner actions (not automatable with current connector permissions)
- [ ] In GitHub Settings → Branches / Rulesets, require a pull request before merging into `main`, at least one independent approval, dismissal of stale approvals, and passing required checks (build, verify, firebase-emulator, browser-smoke, production-audit). Confirm enforcement for administrators as appropriate.
- [x] PR #42 (Lenis 1.3.27) was merged on 2026-10-19; the resulting main commit passed GitHub CI. Manual production scroll/reduced-motion verification is still outstanding.
- [ ] Run `scripts/audit-firestore-readonly.mjs` against the **existing** production Firebase project with authorized read-only access, setting `FIREBASE_STORAGE_BUCKET` to also compare deployed Storage rules. Do not confuse source changes with deployed rules.
- [ ] After reviewing Storage emulator tests, decide whether the existing project's production Storage rules should restrict anonymous public-directory listing. Preserve public image downloads. A Storage rules deployment is a distinct, authorized production operation.
- [ ] Require current-commit checks and independent PR approvals. The latest merged PRs had no recorded submitted reviews; do not infer protection is configured.
- [ ] Confirm a tested Firestore restore procedure, backup retention, access controls, and recovery inventory for Auth users, Storage, Drive and configuration.
- [ ] Verify approved Vercel production environment variables, OAuth redirect and the production deployment using read-only smoke tests; do not expose secrets in PR comments.
- [ ] Measure actual mobile/desktop Core Web Vitals and accessibility. Investigate any visual differences before approving UI changes.
- [ ] Plan a separately reviewed SEO change for dynamic CMS pages (server-rendered metadata and sitemap generation). Do not modify protected public markup or routing without explicit UI-preservation approval.

## Remediation branch (2026-10-19)
- [x] Proposed Storage Rules v2 `get`/`list` separation: public asset fetch stays allowed, directory listing requires admin, with emulator and source tests.
- [x] Extended the optional read-only Firebase audit to compare Storage rules when the bucket is supplied.
- [x] Upgraded GitHub CI workflow actions and aligned Node with the configured Vercel 24.x runtime.
- [ ] Confirm CI success at the branch's latest SHA. All proposed changes are for review only; nothing was merged or deployed by this work.
- [ ] Do a separate public-page change review for News/Event listener error states, search preview metadata, sitemap generation, and reduced-motion navigation. Existing public UI source files were not edited here.

## Evidence record
Record the relevant GitHub Actions run URLs, visual comparison artifact, production rules audit result, backup restore date, approved domain, and responsible reviewer in the release ticket. Never paste tokens, private student data, or credentials into this document.
