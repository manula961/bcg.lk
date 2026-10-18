# BCG.LK — all-action audit remediation (18 October 2026)

**Branch:** `audit/all-actions-20261018` · **PR:** #35 (draft, unmerged)

## Scope and non-negotiable safeguards

- Keep the **current production Firebase project**, administrators, Firestore records and OAuth settings.
- Keep the public website visually stable at ordinary motion settings. All public-source changes are pinned by exact SHA in Rule #1; review actual screenshots before approval.
- Do not merge automatically, deploy Firestore security rules, delete production content, or connect a test account to live Google Drive without explicit authorization.
- CI passing is evidence of covered behavior only, not a production security guarantee.

## Ten audit action items

| Priority | Action | Repository implementation | Remaining release/operational work |
|---|---|---|---|
| P0 | Missing public Sports listing | **Fixed:** `SchoolContentListing` now subscribes to published Sports. Added Node and emulator-backed browser checks. | Verify real published sports appear on live site after review/merge. |
| P1 | Branch protection | Four workflows already run on PRs and `main`; new read-only production smoke workflow available manually. | **Blocked at account/settings level:** GitHub reports `main.protected=false`. This private repo returned 403 on protection access; rulesets API reports plan/visibility limitation. Repository owner must configure protection/upgraded plan or adopt manual controlled merges. Do not make a private repository public just to enable protections. |
| P1 | Current Firebase rules and record compatibility | Added `scripts/audit-firestore-readonly.mjs`; checks all seven collections and compares deployed rule source without writing. | Execute it with approved read-only IAM access; resolve incompatible legacy records **before** deploying stricter repository rules. No live rules were changed. |
| P1 | Backup/restore preparedness | Provided procedures below for backups within the **existing** Firebase/GCP project. | Set retention, IAM access, billing, export location, and conduct an authorized restore drill. No backup was started. |
| P2 | Accessibility | Sports directory restored, CMS label/help associations added, news cards are native links, reduced-motion scroll now respects OS setting. | Review screen-reader behavior, contrast and public screenshot diffs. |
| P2 | SEO and 404s | Root `middleware.js` returns HTTP 404 for **unknown static paths** on Vercel. Added robots/sitemap and generic Open Graph/Twitter/canonical tags in `index.html`. | Confirm canonical domain `https://bcglk.devoraid.com`; verify middleware behavior on Vercel Preview. Unknown dynamic CMS IDs still need a Firebase-aware route to return actual 404; dynamically published pages aren't yet included in static sitemap or bot HTML metadata. |
| P2 | Performance | Added cap of 800 KiB per individual JS chunk alongside 300 KiB entry cap; extended browser checks. | Run Lighthouse and measure real LCP/INP/CLS on approved public domain; shared Firebase chunk remains large. Avoid claiming scores before measurement. |
| P2 | Drive OAuth and image delivery | Existing server-side token, OAuth, MIME and cookie controls retained. Added GET-only public API/status smoke script. | Only an authorized admin can test real OAuth connect/upload/disconnect and anonymous image visibility. This is **not** accomplished by the read-only script. |
| P3 | Development dependency advisories | Dependabot configured for weekly patch/minor npm dependency PRs without silent major Vite/Tailwind upgrades. | Review dependency update PRs and run tests; the 14 reported development-tree advisories are **not** automatically resolved by Dependabot configuration. |
| P3 | Wider regression coverage | E2E seeds published Sports/Societies/Leadership plus Events/News in disposable emulators. Added directory, semantic news link, and CMS form tests, mobile route smoke checks and operational-safety tests. | Manually approve screenshots and consider Firefox/WebKit/real device accessibility testing. |

## Read-only current Firebase audit

Use a Google Cloud identity with read access to the **existing** Firebase project. Do not paste an access token into GitHub issues, pull requests, or this chat.

```bash
# Replace the project ID below with your existing Firebase project.
export FIREBASE_PROJECT_ID="YOUR_EXISTING_FIREBASE_PROJECT_ID"
export FIREBASE_AUDIT_ACCESS_TOKEN="$(gcloud auth print-access-token)"
BCG_READONLY_AUDIT=YES node scripts/audit-firestore-readonly.mjs
unset FIREBASE_AUDIT_ACCESS_TOKEN
```

The command fetches only Firestore documents and deployed Firebase Rules using HTTPS GET. It reports counts of missing/incompatible fields **without document bodies**. To privately print affected document IDs in your own terminal, set `BCG_AUDIT_INCLUDE_IDS=YES`. Exit code 2 means incompatible content exists; 3 means deployed rules cannot be confirmed identical. Lack of API permissions is not proof that production is configured correctly.

Check that documents have required nonempty fields, correct publication booleans, page slug equals its document ID, and real event dates. Review the returned mismatches before any rules deployment.

## Backup and recovery for the **same existing Firebase project**

A regular Firestore export to a restricted Google Cloud Storage bucket is one possible recovery mechanism. This requires appropriate Google Cloud permissions, a valid bucket and any necessary billing settings. Review bucket location, lifecycle, access control and data retention first.

```bash
# Commands to RUN MANUALLY after confirming the existing project and backup bucket:
gcloud config set project YOUR_EXISTING_FIREBASE_PROJECT_ID
gcloud firestore export gs://YOUR_PRIVATE_BACKUP_BUCKET/bcg-2026-10-18 \
  --collection-ids=news,events,pages,societies,sports,extracurricular,leadership
```

The export copies the content collections. Inventory administrator-role documents, indexes, Firebase Authentication users, Storage files, and Google Drive images separately; Firestore export is **not** a full backup of those services. Protect the bucket from public access and set an explicit retention schedule.

Before recovery, identify the correct export, verify its integrity, and rehearse a targeted restore in a controlled environment where possible. **Never run a production `gcloud firestore import` automatically**: it can overwrite existing documents and is not an undo button for all data changes. Document who can authorize recovery and the acceptable downtime.

## Production smoke and Google Drive verification

After deployment and owner approval, run the manual GitHub workflow **BCG.LK Production Read-Only Smoke** with the approved public HTTPS origin, or locally:

```bash
BCG_PUBLIC_ORIGIN="https://bcglk.devoraid.com" node scripts/check-public-deployment.mjs
```

This issues **GET requests only** to the homepage, Events, robots, sitemap, an unknown static route, and an unauthenticated Drive status endpoint. It asserts the expected HTTP responses. It doesn't sign in or modify content.

For a separate **authorized manual OAuth test**: sign in with an existing admin; open Google Drive integration; connect the intended Google account; upload a disposable nonconfidential image and confirm anonymous visibility; remove test assets from Drive; disconnect/revoke access. Record only nonsecret test results. The image made public by Drive is visible to anyone who has its link.

## Release checklist

1. Confirm 4/4 PR CI workflows green at the **latest commit**, plus Vercel Preview build ready.
2. Run approved visual comparisons of Sports, news cards, mobile calendar, admin forms, hero, and home page. Rule #1 protects exact reviewed source files but doesn't replace screenshots.
3. Confirm the canonical custom domain and Vercel Middleware's 404 response on the Preview. Ensure no previously valid route is classified as unknown.
4. Review the deployed rules **read-only** and prepare production backup compatibility/remediation in the current Firebase project.
5. Confirm no credentials/roles/users were accidentally modified.
6. Obtain explicit **merge approval**. Production Firebase rules deployment and Google OAuth testing require separate authorization.
