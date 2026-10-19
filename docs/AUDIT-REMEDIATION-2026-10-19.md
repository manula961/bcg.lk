# Audit remediation and release verification (2026-10-19)

This checklist supplements [OPERATIONS.md](OPERATIONS.md). Do not treat any item below as complete until evidence is recorded. Keep the existing public UI unchanged.

## Automated changes in this branch
- [x] Browser smoke fails rather than warns when a tested viewport has horizontal overflow.
- [x] Visual comparison now includes desktop/mobile Events and Sports/Societies plus mobile Leadership and About Us, alongside homepage/admin.
- [ ] Confirm the latest PR commit passes all build, backend, emulator, security and browser checks.
- [ ] Manually dispatch the visual regression workflow with **approved, accessible** baseline and candidate URLs. Review the screenshot artifacts and any differences; never auto-approve changes.

## Repository-owner actions (not automatable with current connector permissions)
- [ ] In GitHub Settings → Branches / Rulesets, require a pull request before merging into `main`, at least one independent approval, dismissal of stale approvals, and passing required checks (build, verify, firebase-emulator, browser-smoke, production-audit). Confirm enforcement for administrators as appropriate.
- [ ] Update/rebase PR #42 against current `main`, rerun its checks, and manually test smooth scrolling and reduced-motion behavior before merging. Do not merge this PR solely because its old SHA passed.
- [ ] Run `scripts/audit-firestore-readonly.mjs` against the **existing** production Firebase project using authorized read-only access. Compare deployed Firestore rules with source. Verify Storage rules separately; the script's Firestore checks do not prove deployed Storage rules.
- [ ] Confirm a tested Firestore restore procedure, backup retention, access controls, and recovery inventory for Auth users, Storage, Drive and configuration.
- [ ] Verify approved Vercel production environment variables, OAuth redirect and the production deployment using read-only smoke tests; do not expose secrets in PR comments.
- [ ] Measure actual mobile/desktop Core Web Vitals and accessibility. Investigate any visual differences before approving UI changes.
- [ ] Plan a separately reviewed SEO change for dynamic CMS pages (server-rendered metadata and sitemap generation). Do not modify protected public markup or routing without explicit UI-preservation approval.

## Evidence record
Record the relevant GitHub Actions run URLs, visual comparison artifact, production rules audit result, backup restore date, approved domain, and responsible reviewer in the release ticket. Never paste tokens, private student data, or credentials into this document.
