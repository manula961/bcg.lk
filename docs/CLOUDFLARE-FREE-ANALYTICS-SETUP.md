# BCG.LK — Free Cloudflare Web Analytics setup

## Overview

BCG.LK remains hosted on Vercel. No domain transfer, DNS switch, Cloudflare paid plan or Google Cloud Blaze billing is needed for this design. Cloudflare Web Analytics is a free browser beacon. The BCG admin panel queries Cloudflare's read-only RUM GraphQL API for pageviews by **canonical post path**.

**Source of truth:** Cloudflare's recorded RUM pageviews. No visitor counters, IP hashes, daily rollups or TTL policies are created in Firestore. Firebase remains for school content and administrator login.

This repository's tracking snippet is **opt-in**: it is included during Vercel build only when a Cloudflare site token is configured. Historical traffic before enabling the beacon cannot be reconstructed. Existing Firebase content totals remain a separate admin section.

## Step 1 — Create a free Web Analytics site

1. Create or sign in to a free Cloudflare account: https://dash.cloudflare.com/
2. Navigate to **Analytics & Logs → Web Analytics → Add a site**.
3. Use the actual, confirmed live Vercel hostname (current BCG canonical default is `bcglk.devoraid.com`).
4. Choose the **manual JavaScript snippet** setup, even though Vercel hosts this site. You do **not** need to switch DNS or proxy your domain.
5. From **Manage site**, copy the 32-character hexadecimal **site token** embedded in `data-cf-beacon`. Treat it as a public site identifier, not a privileged secret.
6. Find the Cloudflare **Account ID** (the account's dashboard sidebar or URL).
7. If Cloudflare's RUM site metadata distinguishes `site_tag` and `site_token`, use the site tag for GraphQL and the site token for the browser beacon. In many dashboards the site identifier shown with the beacon is also used as the RUM `siteTag`. The two values should be explicitly verified before production rollout.

The programmatically injected beacon includes `"spa":true` to observe React client-side navigation. It does not alter any public React component or page layout.

## Step 2 — Create a restricted Cloudflare API token

In Cloudflare, navigate to **Profile → API Tokens → Create Token → Custom Token**.
Use the name `BCG Admin Read-only Analytics`. Grant:

- **Account → Account Analytics → Read**.
- Restrict **Account Resources** to the BCG analytics account wherever the UI supports it. Do not grant write permissions.
- Copy the token **privately** once. Do not put it in GitHub, tickets, messages or Vite/public environment variables.

Cloudflare documentation: https://developers.cloudflare.com/analytics/graphql-api/getting-started/authentication/api-token-auth/

## Step 3 — Configure Vercel Production environment variables

In the connected **bcg-lk** Vercel project, **Settings → Environment Variables**.
Set all four keys in the **Production environment only**:

| Key | Type | Value |
|---|---|---|
| CLOUDFLARE_WEB_ANALYTICS_SITE_TOKEN | Config | 32-hex beacon token from `data-cf-beacon` |
| CLOUDFLARE_WEB_ANALYTICS_SITE_TAG | Config | 32-hex RUM site tag from Cloudflare site info |
| CLOUDFLARE_ACCOUNT_ID | Config | 32-hex Cloudflare account ID |
| CLOUDFLARE_ANALYTICS_API_TOKEN | **Secret** | Restricted Account Analytics: Read API token |

If Cloudflare uses a single identifier for both site tag and site token, both site variables can carry that same value. The script defaults to `CLOUDFLARE_WEB_ANALYTICS_SITE_TAG` when `CLOUDFLARE_WEB_ANALYTICS_SITE_TOKEN` is not set, but explicitly configuring both is recommended.

Review `BCG_CANONICAL_ORIGIN` only if your canonical site domain differs from `https://bcglk.devoraid.com`. The admin GraphQL report filters the hostname so preview/other sites cannot inflate the rankings.

**Do not add the old Firebase analytics variables:** `BCG_ANALYTICS_ENABLED`, `BCG_ANALYTICS_ORIGIN`, `BCG_ANALYTICS_HASH_KEY`. They are no longer needed. Also do not create `analyticsDedupe` or `analyticsViewsDaily` Firestore TTL policies; they belong to the removed backend.

## Step 4 — Review, deploy and verify

1. Open the feature PR. Verify that protected public React UI source, fonts, animations and Jaliya-authored files are unchanged.
2. **Important:** `src/admin/PostViewsDashboard.jsx` and `AnalyticsDashboard.jsx` are protected admin UI paths. Preserve fail-closed Rule #1; have the owner formally review/approve this narrow analytics UI change rather than disabling guard checks.
3. Fix GitHub Actions runner-allocation failures and protect `main` before merging.
4. Review this change in an authenticated Vercel preview without production Cloudflare configuration. It should show an informative unavailable state, **not fake zero traffic**.
5. After independent review and successful CI/preview acceptance, merge/deploy. Ensure the production Vercel build receives the four configured variables. Redeploy if they were added after a deployment.
6. In the browser, inspect the production HTML. Confirm `https://static.cloudflareinsights.com/beacon.min.js` appears once with `"spa":true`. Check Cloudflare Web Analytics receives actual visits; a browser ad blocker may stop the beacon.
7. Open a published stable-ID news article, then verify that **Cloudflare's Web Analytics dashboard** shows its path and pageviews. Allow time for data ingestion.
8. Sign in to `/admin` and open **Analytics**. Confirm top-post titles, rankings, daily charts, and CSV export. If it says unavailable, inspect Vercel logs (without printing your API token), and verify Account Analytics: Read permission, account ID, site tag and GraphQL access.

The site token is public. **The API token is server-only** and must never appear in HTML, browser devtools, public source or screenshots.

## Measurement and limitations

- Cloudflare Web Analytics measures **client-side pageviews**, not every HTTP request and not exact unique people. Cloudflare may use adaptive sampling for reports and can be blocked by ad blockers.
- Only stable `/updates/<20-char-id>`, `/events/<20-char-id>` and `/pages/<slug>` records appear in the top-post rankings. The main Cloudflare dashboard may also show your homepage and other routes.
- Admin reports support 7, 30 and 90 UTC days. The GraphQL integration splits long windows into requests of at most 30 days, filters the exact production hostname, and returns an error rather than silently truncating when Cloudflare caps grouped results.
- Human-readable titles for the top 15 ranked posts are resolved with a small number of authenticated Firestore document reads; these ordinary CMS reads fit Firebase Spark's free quota if usage stays within its limits.
- Cloudflare analytics historical reporting is subject to its retention and sampling limits; consult your actual account.
- Retire unused old Firestore analytics keys; do not delete existing analytics records without evaluating their retention/privacy obligations.
- Existing release blockers (GitHub Action runners, unprotected main, pending security review) remain unresolved until independently verified.

Official docs:
- https://developers.cloudflare.com/web-analytics/get-started/
- https://developers.cloudflare.com/web-analytics/faq/
- https://developers.cloudflare.com/analytics/graphql-api/
