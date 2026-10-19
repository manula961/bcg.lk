# BCG.LK Audit Hardening — Release Verification

This change is a **review-only remediation** for the October 19 audit. **No production data, Firebase rules, or Vercel settings have been changed by these commits.** The existing public page structure, fonts, images, colors, and CSS are deliberately retained.

## Changes in this PR

- [x] Storage Rules v2: media-capable roles may **create** public images; only Admin and Super Admin can **replace or delete** existing public images. Anonymous GET remains allowed and anonymous listing remains blocked.
- [x] Firebase emulator regression tests cover Editor/Publisher blocked overwrites and privileged replacements.
- [x] Super-admin grants, changes and revocations append role activity documents in the same Firestore transaction; client-side modification/deletion is denied. This is not a substitute for immutable server-side audit logs.
- [x] News/Event details and CMS public pages expose retriable network-error states without altering the successful rendering path.
- [x] Menu retains keyboard focus when open and obeys reduced-motion scrolling. Explore tabs support arrow/home/end navigation; automatic rotation stops under reduced motion.
- [x] Google Drive uploads require explicit acknowledgement that files become public immediately.
- [x] Generate route-specific static HTML metadata for /events, /about-us and /life/*, with canonical and Open Graph URLs. Preserve the React UI and homepage HTML. Dynamic CMS SEO **still requires a separately authenticated server rendering/data-export solution**.
- [x] Independent-review GitHub Actions check for a fresh non-author approval on ready-for-review PRs.
- [x] Vercel anti-clickjacking, nosniff, referrer and device-permission headers; explicit noindex for admin and API routes.
- [ ] Exact PR head commit must pass build, unit, Firebase emulator, browser and audit checks. Confirm Vercel preview.
- [ ] Execute baseline-vs-preview screenshots and inspect differences before merge. This workflow is manual and requires authorized accessible deployments.

## Production owner actions — NOT completed by this PR

- [ ] **Deploy reviewed Firestore RBAC audit rules before the new role UI**, so role assignments will not be blocked by an unknown collection. Ensure backups and rollback.\n- [ ] Compare live deployed Firestore and Storage Rules releases with repository sources using the authorized GET-only audit script, **and verify any intended RBAC changes are actually live**. A Vercel deployment does not deploy Firebase rules.
- [ ] Independently review and approve this PR, then enforce **required passing CI + one independent approval** for the main branch in GitHub Settings → Rulesets/Branches. The workflow check alone cannot guarantee blocked merges without a protected-branch requirement.
- [ ] Deploy the reviewed Storage rules separately, after backup, project/bucket confirmation, evidence, and rollback plan. Test existing image URLs and no unauthorized overwrites.
- [ ] Test scheduled backups and restore of Firestore content, Auth roles, Storage and Drive-linked assets in a nonproduction environment. Record a recovery point and restore procedure.
- [ ] Perform Lighthouse/axe measurements on production and mobile; verify menu keyboard, tabs and reduced motion in real browsers.
- [ ] Provide authorized server access (or a trusted publication feed) to render dynamic CMS article/event/page metadata and generate an accurate published-content sitemap. **Do not expose privileged credentials to clients.**
- [ ] Review actual photographs used for Explore campus areas. Existing placeholder images are retained until verified, consented replacement assets are supplied.
- [ ] Resolve the nine current all-dependency advisories carefully; avoid untested Vite/Tailwind major-version upgrades. Production-only audit currently has zero reported vulnerabilities.
- [ ] Set up production web analytics/browser error monitoring with appropriate privacy controls. Verify alerts using a non-sensitive test event.

## Validation and rollback

Run `npm ci && npm run build` and `npm test`. Run Firebase emulator tests with the pinned CI commands from `.github/workflows/backend-checks.yml`. The SEO postbuild step generates per-route HTML in `dist`; inspect `/events`, `/about-us` and each `/life/*` response headers and HTML metadata on Vercel preview before enabling in production.

UI preservation guard now pins the exact reviewed UI source blobs; no existing public stylesheets or hero/image assets were modified. Revert the PR branch or deployment if public rendering regresses. **A Vercel rollback cannot roll back separately deployed Firebase rules.**

**Score policy:** Report only evidence-backed audit scores. The target is 90+/100 after merged-head CI, live rule parity, visual comparisons, restore evidence, and dynamic SEO are verified; do not assert 90+ merely because code was committed.
