# BCG.LK — release readiness, staging and quality evidence

This checklist does **not** certify production. A green source build, Vercel READY
preview, and healthy production release are three different signals.

## 1. Protected releases

An authorized repository owner must review and execute the owner-only command:

    BCG_CONFIRM_BRANCH_PROTECTION=YES bash scripts/enable-main-protection.sh

This requires GitHub CLI (gh) with repository-admin access. Inspect Settings →
Branches after running. Require one independent fresh approval, resolved
conversations, up-to-date status checks, and these job contexts: build, verify,
firebase-emulator, production-audit, browser-smoke, visual-compare,
independent-approval. Require admin enforcement and prohibit force pushes.

This command is intentionally **not executed by PR CI**. If GitHub rejects a
setting due to plan limitations, configure equivalent repository rulesets and
verify the result. The source-level independent-review workflow alone does not
protect main against direct pushes.

If a workflow fails **before the first step starts** and GitHub provides no
job log, investigate runner availability, GitHub Actions quotas, billing,
permissions, and service status. Such a result is an **unresolved CI failure**,
not proof of a code or dependency defect. Never mark it green or bypass checks.

Require every CI job green on the **latest PR head commit** and independent
approval on that same commit. Review visual-comparison screenshots when
public UI is changed. Do not change public CSS/components/media without
separately approved designs.

## 2. Source and deployment verification

Run locally:

    npm ci
    node scripts/check-release-config.mjs
    npm test
    npm run build
    node scripts/check-bundle-budget.mjs

CI uses disposable Firebase emulator projects, not production accounts.
Check the exact approved Vercel preview URL (GET requests only):

    BCG_PUBLIC_ORIGIN=https://APPROVED-PREVIEW.example node scripts/check-public-deployment.mjs

This verifies the home, Events, Past Papers, Admin, sitemap, robots, unknown
404 route, anti-clickjacking and MIME headers, and unauthorized admin/Drive
API requests. Vercel Authentication-protected previews need a separately
approved inspection; do not disable access controls to make smoke pass.

A Vercel READY deployment does **not** prove the Firebase service account,
email delivery or live Firebase security rules are correct.

## 3. Firebase User Management staging validation

Use a **separate staging Firebase project** and disposable test users. Never
use production credentials in PR builds. Back up staging users and roles.
Configure these values only in the authorized staging Vercel environment:
FIREBASE_PROJECT_ID, VITE_FIREBASE_PROJECT_ID, FIREBASE_WEB_API_KEY,
VITE_FIREBASE_API_KEY, FIREBASE_SERVICE_ACCOUNT_JSON, USER_ADMIN_ORIGIN.
USER_ADMIN_ORIGIN must equal the exact approved HTTPS staging origin. If
needed, set BCG_CANONICAL_ORIGIN to that same approved domain.

Run within that authorized staging environment:

    BCG_REQUIRE_FIREBASE_ADMIN=1 node scripts/check-release-config.mjs

This is a **non-network configuration-shape preflight**. It does not prove
IAM privileges, Firebase Auth lifecycle, deployed Firestore rules or email
delivery. Verify those separately with the Firebase owner.

Manual staging lifecycle: Super Admin lists users; creates disposable user;
assigns role; edits name/email; disables; confirms existing session is denied;
enables and confirms **role is not silently restored**; explicitly reassigns
role; requests password reset; deletes after exact email confirmation.
Test anonymous, editor, disabled, cross-origin, self-management and protected
Super Admin requests are denied. Inspect userAudit and roleAudit through
trusted Firebase owner access. Reconcile partial failures manually.

Before any production release, independently verify deployed Firestore and
Storage rules, authorized domains, email templates, least-privilege IAM,
backup, audit log retention and rollback procedures.

## 4. Accessibility and performance evidence

CI checks responsive 320/390/768/1024/1440 viewports, horizontal overflow,
reduced motion, keyboard behavior, browser exceptions, entry JS <=300 KiB
and largest chunk <=800 KiB. These checks are **not WCAG or Core Web Vitals
certification**.

Record dated Lighthouse mobile/desktop Performance, Accessibility, Best
Practices and SEO results for home, Events, Past Papers, About Us and Admin.
Record LCP, INP and CLS from real-user monitoring/Chrome field data when
available (lab Lighthouse does not establish field INP). Verify keyboard-only
navigation, focus visibility, screen-reader announcements, color contrast,
image alt text, network/CPU throttling, fonts and third-party assets.
Attach results and screenshots to the release review.

## 5. Canonical SEO and editorial review

The existing canonical default is https://bcglk.devoraid.com. Do not guess
a new production domain. Once the owner confirms it, configure
BCG_CANONICAL_ORIGIN as the exact HTTPS origin without trailing slash in
the Vercel build environment. Generated route heads, homepage canonical/
OpenGraph URL and sitemap then use that origin. Confirm domain redirects,
Search Console ownership and robots/sitemap responses before reindexing.

The middleware offers metadata-only enrichment for verified published CMS
record IDs when requested by known indexing/link-preview crawlers. It uses
anonymous Firestore reads subject to published-only security rules, escapes
user-controlled text and returns the original SPA on errors or missing
configuration. It does not reveal draft content or change page visuals.
Verify crawler HTML on an approved preview and review Firestore read quotas;
legacy title-based URLs still fall back to client-side metadata.

Dynamic/unpublished CMS pages are deliberately excluded from the static
sitemap. Real school images, Past Papers permissions and content provenance
require editorial review; do not invent or automatically publish content.

## Rules #1 and #2 — unmodified UI and preserved Jaliya work

All remediation branches must be based on the current main and must preserve
every contribution by `JaliyaMaheshakya0529`. Changes to UI components,
styles, visual assets, animations or responsive design require the owner's
explicit approval; do not treat a bug report as UI-change permission.
Run `node scripts/verify-jaliya-preservation.mjs` from a full checkout
with `origin/main` available; CI checks Rule #2 automatically on PRs and
fails closed without Jaliya's Git history. Also inspect the branch
comparison for touched `src/components/`, `src/pages/`,
`src/admin/`, `public/`, and visual assets before proposing a merge.
Never revert Jaliya's commits as an expedient way to resolve regressions.

Past Papers requires `pastPapers` in every Firestore CMS write permission
(create, update, delete) as well as its existing read permission. Validate
the role matrix with Firestore/Storage emulators; repository rule edits do
not update deployed Firebase rules. The school anthem needs real HTTP 200
audio MIME from `/audio/school-anthem.mp3`; a 200 SPA HTML fallback fails
the release check. Confirm both on an approved staging environment.

## 6. Go/no-go and rollback

Require green latest-SHA CI, independent approval, matching immutable
Vercel preview, read-only smoke, staged Firebase user lifecycle and rules
verification, and documented performance/accessibility results. Otherwise
**hold production**. With owner approval, revert a faulty Git change through
a reviewed PR and redeploy the last known-good Vercel version. Restore
Firebase rules/data separately from the approved backup/release history.


## Temporary exact-SHA production release hold

Until GitHub Actions can actually start runners and `main` enforces reviewed,
green status checks, the Vite production build has an additional **fail-closed
exact-commit hold** in `scripts/production-release-gate.mjs`. It does not
certify a release, enforce GitHub reviews or replace staging tests.

- Vercel Preview and local builds have no SHA restriction.
- Vercel Production builds reject missing, malformed or mismatched
  `BCG_APPROVED_PRODUCTION_SHA` / `VERCEL_GIT_COMMIT_SHA` values and
  require Git provider `github`, owner `manula961`, repo `bcg.lk`, branch `main`.
- Only after all external release checks and human approval, configure
  `BCG_APPROVED_PRODUCTION_SHA` for **Vercel Production only**, with the
  exact 40-character *resulting commit/merge SHA*. Do not expose it through
  `VITE_*` or copy production credentials to Preview.
- Confirm that Vercel's **Automatically expose System Environment Variables**
  setting is enabled and that Production supplies `VERCEL_ENV` and
  `VERCEL_GIT_COMMIT_SHA`. An operator must verify this with a deliberately
  unapproved test build; do not assume this gate enforces when Vercel system
  variables are disabled.
- Unapproved production builds should fail while the prior deployment remains
  in place. A PR head SHA is **not** necessarily its merge commit SHA:
  approve the exact deployed commit after it exists, then explicitly
  redeploy/retry the approved revision. Test a mismatch before relying on the
  gate. Avoid bypass settings, force-pushing or auto-approval.
- When a reviewed rollback commit is needed, approve its exact SHA and follow
  documented Vercel rollback / Firebase recovery separately.

Run `node --test tests/production-release-gate.test.mjs` and the existing
`npm test` / `npm run build` preflight. The gate is a temporary accidental
release safeguard, **not a security boundary against someone who can edit the
repository build configuration or Vercel Production environment**. Only
supported GitHub branch protection + real independent reviews + trusted CI
and deployment checks close the release-governance P0 findings.

**Owner operations still required:** Repair GitHub Actions zero-step runner
failures, enable a GitHub plan/ruleset with required checks, create isolated
Firebase staging, verify deployed Firestore/Storage rules and IAM, configure
and test `CMS_CRON_SECRET` on both scheduler ends, resolve mandatory editorial
approval bypass and public-on-upload media policy, prove backups/restore,
and run browser / security / accessibility / live HTTP acceptance.
The previous 188 green Node tests do not validate these items.
