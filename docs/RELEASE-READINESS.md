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
