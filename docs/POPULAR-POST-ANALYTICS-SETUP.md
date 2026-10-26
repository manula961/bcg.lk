# Popular-post analytics — provider changed to free Cloudflare Web Analytics

The previous visitor-counting backend that used Firestore TTL and Google Cloud
billing has been **retired**. Its POST collector, HMAC-based visitor identifiers,
daily Firestore rollups and old browser tracker are no longer part of this branch.

**Current instructions:** [Cloudflare Free Analytics Setup](CLOUDFLARE-FREE-ANALYTICS-SETUP.md).

This new integration requires only a free Cloudflare Web Analytics site, its
browser beacon token, and a restricted, read-only Cloudflare Account Analytics
API token stored as a secret in Vercel. Firebase Spark remains usable for
the existing CMS/auth features; no analytics-related Firestore TTL is required.

For production release, preserve existing public UI and Jaliya-authored work.
Do not bypass the UI-preservation guard, GitHub Actions, account review, or
branch protection. All changes remain subject to a separate reviewed PR.
