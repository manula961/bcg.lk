# BCG.LK — Popular post analytics setup and release

## What was implemented
The existing Admin → Analytics page gains real qualified-visit rankings for published News, Events and Pages: 7/30/90-day filters, post title/link, daily trend, section breakdown, totals and CSV export. The original content-statistics dashboard remains.

Traffic is counted only after feature activation. No pre-existing visitor history is available. Counts represent **qualified views**, not unique people: at most one count per 30-minute window for the same post/network/user-agent combination. The script uses no cookie, browser storage or referrer and honors Do Not Track and Global Privacy Control. Private visitor IPs and user-agent strings are never saved.

## Backend
- Browser tracking script injected into Vite-built HTML only; original public React components and source index.html are untouched.
- POST /api/analytics/collect checks same-origin browser requests, published stable post IDs, and excludes many known crawlers.
- Firestore analyticsDedupe stores only temporary HMAC hashes; analyticsViewsDaily stores daily counts, post title and canonical path.
- One atomic Firestore commit creates the dedupe marker and increments a daily view document. Concurrent duplicates are ignored.
- GET /api/admin/post-analytics requires a verified Firebase session and live admin-console role. Aggregate records cannot be read or written through ordinary Firestore browser rules.

## Required owner configuration before enabling production
1. Approve institutional visitor-measurement privacy policy and check any necessary disclosures.
2. Verify Firestore default deny rules remain in place for both analytics collections. Do not open anonymous writes.
3. Configure Firestore TTL policies with field name **expiresAt**, separately for collection groups **analyticsDedupe** and **analyticsViewsDaily**. Dedupe expires after 48 hours and aggregates after 100 days (actual TTL deletion can lag).
4. In Vercel project Production, add server-only:
   - BCG_ANALYTICS_ENABLED = 1
   - BCG_ANALYTICS_ORIGIN = the verified production HTTPS origin without a trailing slash (current canonical default is https://bcglk.devoraid.com)
   - BCG_ANALYTICS_HASH_KEY = 32+ character cryptographically random secret generated privately, for instance via a local Node crypto randomBytes call. NEVER use VITE_ prefix or commit secrets.
5. Retain correct existing FIREBASE_PROJECT_ID and FIREBASE_SERVICE_ACCOUNT_JSON. Deploy only after PR review, staging tests and security checks.
6. In staging, verify a published stable-ID article increments by one; repeat within a half hour from the same network/browser to confirm deduplication; verify unpublished content and denied users never count or read data; test the admin table and CSV.
7. Monitor Firestore costs, HMAC key rotation, Vercel function use and TTL deletion. Never treat zero records before activation as zero real website visits.

## Known limitations
- Legacy title-based article URLs without stable 20-character IDs are not counted.
- The view counter is not immune to deliberate API abuse; counters are approximate and can undercount shared WiFi audiences.
- GA4, unique people, geographic breakdown, referral breakdown and historical page view reconstruction are not configured.
- Aggregated daily reads are capped and fail closed if the report is too large. Implement longer-term/materialized rollups as traffic grows.
- The existing src/admin/AnalyticsDashboard.jsx was modified solely to embed the new panel. Repository Rule #1 still rejects modifications to protected admin UI files without independent, explicit owner approval. Do not disable global UI or Jaliya preservation checks.
- GitHub Actions runner availability, main branch protection, and production Firebase TTL/index verification remain independent operational release blockers.

## Testing
Run npm ci; npm test; npm run build; node scripts/check-bundle-budget.mjs on a clean checkout. Run the Firebase emulator and browser suites, compare existing admin and public UI against main, and confirm that the public HTML body remains byte-identical aside from the new deferred head script.
