# BCG.LK → Cloudflare Pages migration

**Status: PREPARED, NOT DEPLOYED.** Current source branch: `migration/cloudflare-pages-20261030`. Production Vercel project, domains, Firebase rules, data, roles, OAuth secrets, and cookies were **not** changed.

## Goal and scope

- Keep the exact existing public React UI, static routes and admin CMS.
- Publish Vite output (`dist/`) on Cloudflare Pages.
- Run the **existing** 11 Vercel-style API entrypoints via a bounded Cloudflare Pages Functions adapter, with Cloudflare Workers Node compatibility date `2026-10-30`.
- Keep Firebase Auth/Firestore/Storage, Firestore rules, Google Drive OAuth and Resend as external services. **No database migration is required**.
- Use a separate Cloudflare Worker Cron Trigger for scheduled approved CMS publication, after staging verification.
- Preserve original Vercel release protection with a Cloudflare production SHA gate. Avoid dropping GitHub review gates or changing UI and editor permissions.

## Source-level repairs

The `main` branch removed `src/pages/news/Updates.jsx` and `Updates.css` but retained a lazy import in `src/main.jsx` plus route tests. These exact two files were restored from Git revision `3996b896b5c077dc9284d28a3da0fa780271549f`, preserving their prior UI without inventing a new page.

The current homepage NewsSection opens an accessible dialog, not an old-style link. `tests/audit-fixes.test.mjs` now checks its actual current dialog semantics rather than requiring deleted link markup. Original /updates/:id details remain addressable.

**Review restored News detail files with the original contributor before merge.** Changing this route was explicitly part of the current repo evolution.

## Prepare Cloudflare Pages project

1. Keep `manula961/bcg.lk` private. Open Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → connect GitHub repository `manula961/bcg.lk`.
2. Create a **new** Pages project named `bcg-lk-cloudflare`. Use `main` as production branch, but **pause automatic production deployment** until approval and complete staging acceptance. Configure preview branch builds to deploy the migration branch only.
3. Root directory: repository root. Framework: **Vite / React**. Build command: `npm run build`; output: `dist`. Set Node build version `24` (committed `.node-version`). Cloudflare Pages can install dependencies from `package-lock.json`.
4. `wrangler.toml` defines `pages_build_output_dir="./dist"` and compatibility date `2026-10-30`. For existing Cloudflare Pages projects, download/reconcile the dashboard configuration first; do not overwrite existing bindings blindly.
5. Import `public/_headers` and `public/_routes.json` via Vite's public assets copy into `dist`. A catch-all `functions/[[path]].js` adapts all 11 APIs; keeps SPA pages, original static SEO and 404 semantics; and returns dynamic CMS metadata for recognized crawlers using Cloudflare's `ASSETS` binding.
6. Never commit `.dev.vars`, `.env.local`, private JSON keys, OAuth secrets or a production `wrangler.toml` with plaintext secrets. Avoid turning on "Deploy production on push" while CI runners/reviews are broken.

### Environment variables — Cloudflare Pages

Use **Workers & Pages → bcg-lk-cloudflare → Settings → Variables and Secrets**. Store sensitive values as encrypted **Secrets**. Cloudflare needs two distinct sets: **Preview = isolated staging Firebase project**, **Production = approved real Firebase project**. Do not copy privileged production secrets to preview.

| Key | Type | Notes |
|---|---|---|
| `VITE_FIREBASE_API_KEY` | Build variable | Firebase web API key for selected environment |
| `VITE_FIREBASE_AUTH_DOMAIN` | Build variable | Environment-specific Firebase Auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Build variable | Staging/production project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Build variable | Storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Build variable | Firebase sender |
| `VITE_FIREBASE_APP_ID` | Build variable | Firebase app ID |
| `VITE_FIREBASE_MEASUREMENT_ID` | Optional build variable | Only if configured |
| `FIREBASE_PROJECT_ID` | Runtime variable | Must equal the corresponding `VITE_FIREBASE_PROJECT_ID` |
| `FIREBASE_WEB_API_KEY` | Runtime variable | Must equal `VITE_FIREBASE_API_KEY` |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | **Secret** | Full JSON for the **correct** Firebase project; production only after review |
| `USER_ADMIN_ORIGIN` | Runtime variable | Exact allowed HTTPS admin origin, no slash or path |
| `GOOGLE_OAUTH_CLIENT_ID` | Runtime variable | OAuth web application client ID |
| `GOOGLE_OAUTH_CLIENT_SECRET` | **Secret** | Matching Google OAuth client secret |
| `GOOGLE_OAUTH_REDIRECT_URI` | Runtime variable | `https://APPROVED_HOST/api/drive/callback` |
| `DRIVE_COOKIE_ENCRYPTION_KEY` | **Secret** | Existing 64-digit hex key when preserving connected Drive cookies; generate a separate one for staging |
| `GOOGLE_DRIVE_FOLDER_ID` | Optional runtime variable | Managed Drive folder ID |
| `RESEND_API_KEY` | **Secret** | For admin email workflows |
| `RESEND_FROM_EMAIL` | Runtime variable | Must use verified sender domain |
| `RESEND_REPLY_TO` | Optional runtime variable | Reply-to |
| `EMAIL_SCHOOL_LOGO_URL`, `EMAIL_SOCIETY_LOGO_URL` | Runtime variables | Approved full HTTPS media links |
| `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_WEB_ANALYTICS_SITE_TAG`, `CLOUDFLARE_WEB_ANALYTICS_SITE_TOKEN` | Build/runtime variables | Keep existing Web Analytics identifiers |
| `CLOUDFLARE_ANALYTICS_API_TOKEN` | **Secret** | Restricted account analytics READ scope |
| `BCG_CANONICAL_ORIGIN` | Build/runtime variable | Keep `https://bcglk.devoraid.com` after production cutover |
| `CMS_CRON_SECRET` | **Secret** | Same 32–256-character URL-safe secret for Pages API and cron Worker; staging first |
| `BCG_APPROVED_PRODUCTION_SHA` | Production-only variable | Full immutable 40-digit **independently approved** commit; do not add to Preview |
| `NODE_VERSION` | Build variable | `24`, also pinned by `.node-version` |

`USER_ADMIN_ORIGIN` and `GOOGLE_OAUTH_REDIRECT_URI` **must match the actual deployment origin**. Use a fixed staging hostname (with Firebase authorized domain and Google OAuth redirect registered), not random per-commit Pages URLs. Restrict staging with Cloudflare Access. Do not authorize random public previews to use production admin secrets.

The production origin is `https://bcglk.devoraid.com`; the production OAuth callback is `https://bcglk.devoraid.com/api/drive/callback`. During staging use a different approved origin such as the dedicated, stable Cloudflare Pages preview hostname and its matching callback.

## Staging build and Pages Functions acceptance

On a local clone of the new branch:

```bash
git switch migration/cloudflare-pages-20261030
npm ci
npm test
npm run build
npx wrangler pages dev dist
```

Run local tests before using Wrangler. To pass local **staging-only** secrets to `wrangler pages dev`, create a local, gitignored `.dev.vars` file in your clone and delete it after verification. Never use production Firebase service-account credentials in an untrusted laptop or PR environment.

Verify Cloudflare Pages deployment of the migration **preview branch** before merging. Check: `/`, `/about-us`, `/events`, `/past-papers`, all `/life/*`, `/updates/:id`, `/pages/:slug`, `/admin`, static files, `/robots.txt`, `/sitemap.xml` and invalid routes (real HTTP 404). Verify admin pages and APIs have `X-Robots-Tag: noindex`, CSP/HSTS, correct MIME, and custom 404.

Use disposable staging accounts and content to exercise:
- Firebase sign-in/out, disabled account/revoked role and denied anonymous API requests.
- Read and write drafts; independent submit/approve/publish; published edit proposals; archive Delete/Restore; admin user-role API, conflicting writes.
- Google Drive OAuth connect/status/disconnect and approved image/PDF uploads; cookie encryption, public sharing warnings, file size and signature checks. Uploaded assets can become public immediately; keep `BCG_ALLOW_PUBLIC_DRIVE_UPLOADS` disabled unless approved.
- Resend email delivery from the verified sender, Cloudflare analytics dashboard GET, preview screenshots and original public/admin UI parity.
- Firestore indexes and rules via emulator; review actual existing indexes before deploying any managed index file.

**No test result here proves these external integrations work**. Pages Functions use Workers, not the original Node/Vercel runtime, and must pass an authenticated staging browser test and Cloudflare build before production.

## Production release SHA gate

`scripts/production-release-gate.mjs` already blocks Vercel production unless `VERCEL_GIT_COMMIT_SHA` is approved. This branch additionally checks Cloudflare `CF_PAGES=1`, `CF_PAGES_BRANCH=main` and `CF_PAGES_COMMIT_SHA` against the exact production-only `BCG_APPROVED_PRODUCTION_SHA`.

**Expected behavior:** A new Cloudflare Pages production build of an unapproved SHA fails. No automatic release bypass exists. Obtain independent approval and successful GitHub CI, set the exact release SHA, and build that exact merge commit again.

## Scheduled publishing

Cloudflare Pages has Pages Functions but **does not provide a Cron Trigger inside the Pages project**. This branch includes `cloudflare/cron-worker.mjs` plus `cloudflare/wrangler-cron.toml` for a **separate** Cloudflare Worker, with a `*/15 * * * *` trigger and protected call to `https://bcglk.devoraid.com/api/cron/publish`.

Only after staging approvals, deployed `cmsJobs(status,runAt)` Firestore composite index is READY, and the matching token is created:

```bash
npx wrangler secret put CMS_CRON_SECRET --config cloudflare/wrangler-cron.toml
npx wrangler deploy --config cloudflare/wrangler-cron.toml
```

Do not deploy this scheduler until the Pages API is verified and the previous GitHub scheduler is **disabled** or certified not to run. Two schedulers may race even with audited job preconditions. Keep production publishing off until first controlled staging execution and monitoring.

## Cutover and rollback

1. Keep Vercel production **live** while Cloudflare staging and an approved production build pass security/browser/visual acceptance.
2. Preserve the school domain `bcglk.devoraid.com`. Add it as a Pages **Custom Domain** in Cloudflare. Coordinate DNS with the `devoraid.com` zone owner; do not delete Vercel DNS until Pages returns ready with HTTPS certificates and verification.
3. Update the DNS record only during an owner-approved maintenance window. Match `USER_ADMIN_ORIGIN`, `GOOGLE_OAUTH_REDIRECT_URI`, Google OAuth allowed redirect URLs and Firebase Auth authorized domains to the final hostname. Keep the same encryption key if you require cookie continuity.
4. Smoke-test production static routes, CMS deep links, noindex and 404, real admin sign-in and roles, images/PDF download, Resend, Google Drive, Cloudflare Analytics, runtime logs and scheduled publishing.
5. **Rollback**: Repoint DNS back to the retained last-known-good Vercel deployment and keep its valid production secrets/config until recovery is verified. An emergency Cloudflare rollback must be an approved ready deployment, not a preview with staging credentials.

## Remaining external dependencies

There is no Cloudflare account connection in this chat, so no Cloudflare project, secrets, custom domain, DNS records or Worker deployments were created here. GitHub Actions runner allocation and protected-main enforcement remain unresolved; no emulator/staging-authenticated browser acceptance was run. Keep this branch as a draft PR and do not promote it to `main` without independent review.
