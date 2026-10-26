# BCG.LK — Finalize Cloudflare Web Analytics (production checklist)

**Status:** Blocked until the owner supplies the verified Cloudflare **site tag** and validates the existing account and API token. **Do not paste Cloudflare credentials into chat, GitHub commits, screenshots, logs, or frontend `VITE_*` keys.**

**Canonical school site:** `https://bcglk.devoraid.com`  
**Hosting remains Vercel:** project `bcg-lk` (no DNS move required).  
**Implementation:** Vite build injects an opt-in Cloudflare JS beacon; authenticated `/api/admin/post-analytics` reads Cloudflare GraphQL. No Firestore visitor counters.

## 1. Get the exact Cloudflare site identifiers

1. Open https://dash.cloudflare.com/ in the account used for the BCG Web Analytics site.
2. Navigate to **Web Analytics** (often Analytics & Logs > Web Analytics), select the site whose hostname is exactly **bcglk.devoraid.com**, then **Manage site**.
3. Confirm the existing manual JS beacon snippet contains `data-cf-beacon` with a **32-character hexadecimal** `token`. This is **`CLOUDFLARE_WEB_ANALYTICS_SITE_TOKEN`**, a *public* beacon identifier.
4. Obtain **`site_tag`** from the site's settings or site-info metadata. Cloudflare exposes a separate **`site_tag`** and **`site_token`** in its API. They **can be identical but must not be assumed identical**. The exact `site_tag` is the value of **`CLOUDFLARE_WEB_ANALYTICS_SITE_TAG`** used to filter GraphQL results.
5. If the dashboard does not show the site tag explicitly, use the Cloudflare site-info API from your own trusted terminal/session:
   - API: `GET https://api.cloudflare.com/client/v4/accounts/{account_id}/rum/site_info/list`
   - The API requires an authorized Cloudflare token with **Account Settings: Read**; this may be a separate, temporary read token. Do not expand your Analytics-only reporting token just for this lookup without review.
   - Match the site by **host**. Read its `site_tag` and `site_token` fields. Never share the API response publicly.

Official Cloudflare source: https://developers.cloudflare.com/api/resources/rum/subresources/site_info/methods/list/

## 2. Verify the read-only GraphQL API token

In Cloudflare **API Tokens**, maintain a token with **Account > Account Analytics > Read** scoped to the BCG account. Call this **`CLOUDFLARE_ANALYTICS_API_TOKEN`**; it must remain *server-only*. Cloudflare Web Analytics is free, and Vercel remains the hosting provider.

Official scope requirements: https://developers.cloudflare.com/analytics/graphql-api/getting-started/authentication/api-token-auth/

## 3. Set all FOUR Vercel Production environment variables

Go to https://vercel.com/ > team/project **bcg-lk** > **Settings > Environment Variables**, filter to **Production**:

| Name | Source and role | Exposure |
| --- | --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account's 32-hex ID | Server configuration |
| `CLOUDFLARE_WEB_ANALYTICS_SITE_TOKEN` | Web Analytics JS snippet's **site_token** (32 hex) | Public beacon identifier (used in generated HTML) |
| `CLOUDFLARE_WEB_ANALYTICS_SITE_TAG` | Web Analytics **site_tag** (32 hex) from site info | Server-side GraphQL filter |
| `CLOUDFLARE_ANALYTICS_API_TOKEN` | Scoped Account Analytics **Read** API token | **Sensitive: server-only** |

**Current verified issue on 2026-10-26:** First, second and fourth keys were listed in Vercel; `CLOUDFLARE_WEB_ANALYTICS_SITE_TAG` was **absent**. Add the verified tag. Do not replace the site token with the tag unless Cloudflare confirms they are the same for this site.

Keep `BCG_CANONICAL_ORIGIN` unset when using the default `https://bcglk.devoraid.com`, or set it to that exact HTTPS origin if your deployment policy requires a configured value. The reporting API filters only `bcglk.devoraid.com` paths, excluding preview/other hosts.

**Do not add old Firestore tracker variables** `BCG_ANALYTICS_ENABLED`, `BCG_ANALYTICS_HASH_KEY` or `BCG_ANALYTICS_ORIGIN`. The current dashboard uses Cloudflare RUM.

## 4. Perform private readiness validation

This branch introduces `BCG_REQUIRE_CLOUDFLARE_ANALYTICS=1` as an opt-in preflight switch. From a **trusted local checkout** whose environment has these four keys loaded, run:

```bash
BCG_REQUIRE_CLOUDFLARE_ANALYTICS=1 node scripts/check-release-config.mjs
npm test
npm run build
```

On PowerShell, set the flag with `$env:BCG_REQUIRE_CLOUDFLARE_ANALYTICS='1'` before the command, and remove it afterward.

The preflight validates value shapes and completeness, **not** the live Cloudflare GraphQL permissions, hostname association, or actual data. Readiness still requires the smoke tests below. Secrets must not print in CLI logs.

Do not configure production secrets for untrusted pull-request Preview builds.

## 5. Release and browser verification

1. Restore GitHub Actions runners and enforce review/branch protection so the PR is actually tested before release. Verify protected source/UI remains unchanged.
2. After four production env keys are saved, trigger a **fresh Vercel production deployment from the reviewed commit**, not the older cached build; beacon injection is a **build-time** step.
3. Open the production website **View Page Source**. Verify **exactly one** `https://static.cloudflareinsights.com/beacon.min.js` with `"spa":true` and the expected site **token**; don't display API tokens.
4. In DevTools Network, check that `beacon.min.js` loads and Cloudflare receives requests (ad blockers and privacy settings may prevent this). Navigate to a published `/updates/<20-character-document-id>`, `/events/<20-character-document-id>`, and `/pages/<slug>` page. SPA navigation should cause a pageview.
5. Check the **Cloudflare Web Analytics dashboard** for `bcglk.devoraid.com`: a real visit should appear after Cloudflare ingestion. Visits **before** the beacon was enabled cannot be recovered.
6. Sign into the actual BCG admin `/admin` with an authorized test account, open **Analytics** and verify 7-, 30-, and 90-day reports, rankings, charts, readable titles and CSV export.
7. Use the admin Network panel to inspect `GET /api/admin/post-analytics?days=7`. Expected: **200** valid metrics after integration, **401** if not authenticated, **403** if role denied, **503** if Cloudflare config is incomplete, **502** if upstream Cloudflare rejects the request or returns an invalid report. A 200 with zero metrics may be legitimate if no qualified visit has been ingested.
8. Check Vercel runtime logs for this endpoint **without printing the token**. Compare the correct **site_tag**, account, API token permission and query errors. Run only authorized read-only tests against production.
9. Treat values as **Cloudflare browser pageviews (possibly sampled)**, not exact unique users. Rankings include only published post-style stable routes. The homepage and listings are excluded from the post-ranking contract.

## 6. Other release blockers unrelated to Cloudflare

- [ ] GitHub `main` branch protection and independent latest-head review (previously unprotected).
- [ ] GitHub Actions Build/Backend/Browser/Dependency jobs must actually start and pass (earlier `runner_id=0` with zero steps).
- [ ] Isolated Firebase/GCP Preview/staging and live Firestore/Storage rules/index/IAM verification.
- [ ] Production backup, restoration rehearsal and Google Drive public-file lifecycle approval.
- [ ] `CMS_CRON_SECRET` both in Vercel and GitHub Actions; scheduler index and approved workflow migration.
- [ ] Legacy `ContentManager` still directly publishes/hard-deletes. The new approval/archive API is opt-in until a coordinated owner-approved migration.
- [ ] Live route, browser, accessibility, media/PDF, SEO and Core Web Vitals acceptance.

**Never claim all project issues are fixed just because the Cloudflare analytics report succeeds.**
