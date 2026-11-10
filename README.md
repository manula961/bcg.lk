# BCG.LK — Bandaranayake College website

React 19 + Vite frontend; Firebase Authentication, Firestore and Storage; Vercel functions for administrator/CMS workflows, Drive media and scheduled publishing. Static SEO HTML, sitemap and a read-only production smoke check are generated during builds.

## Local development

1. Install Node.js **24** and npm. The Vercel project and CI should use the same Node major.
2. Run `npm ci` and `npm test`.
3. Create a local `.env.local` from **approved development or emulator-only credentials**. Never commit credentials. Browser variables start with `VITE_` and are publicly exposed in a built bundle.
4. Run `npm run dev`. For production-style build validation, use `npm run build` in a nonproduction environment.
5. Firebase emulators are restricted in source to localhost with project ID `demo-bcg-e2e`. They must never be bound to a production Firebase project.

## Environments

Keep **Production**, **Preview**, and local development isolated. The production Vercel project requires an owner-approved canonical HTTPS origin, a protected/reviewed GitHub main commit and a matching explicit release SHA. The production release gate fails closed by design.

- **Production**: verified Firebase project, restricted Firebase service account, approved Google OAuth and mail configuration (only if needed), GitHub read-only audit token, and the exact independently reviewed commit SHA. Prefer scoped server secrets only in Production.
- **Preview**: no production Firebase service account, OAuth client secret, Drive encryption key, mail API key, release approval token, cron secret or GitHub audit token. Use a separate least-privilege staging project **before** enabling connected preview CMS features. Without staging credentials, preview may render the static site while Firebase-dependent features stay unavailable.
- **Local**: emulator/test-only credentials. Keep `.env*` out of Git except explicit nonsecret examples.

Do **not** set `BCG_APPROVED_PRODUCTION_SHA` automatically to the build commit. This is an independent approval, not a workaround to get a green build. After peer review, verify branch protection and CI, approve the full 40-character reviewed merge SHA, then deploy *that exact SHA*. Any new commit requires a new review and approval. See `scripts/production-release-gate.mjs`, `scripts/preflight-production-build.mjs` and `scripts/check-github-main-protection.mjs`.

For production: `BCG_CANONICAL_ORIGIN` must be the exact HTTPS origin used for canonical URLs and the externally verified website. Domain/redirect setup must agree with that setting. The default source SEO origin is `https://bcglk.devoraid.com`; verify domain ownership and routing before launch.

## Quality and checks

- `npm test`: offline/contract tests (also runs automatically before `npm run build`).
- `npm run build`: Vite build and generated SEO pages, sitemap, robots.txt and public `release.json`.
- Production-only read-only smoke: run the **BCG.LK Production Read-Only Smoke** GitHub Actions workflow with an independently approved HTTPS public origin and exact deployed SHA. It inspects status, headers, metadata, routes and release identity without posting data.
- Manual verification still required: desktop/mobile browser behavior, screen readers, real Firebase roles, Google OAuth, admin editorial flows, publishing/restore, performance, analytics, and failover/rollback.

Do not report CI contract tests as proof that production Firebase, OAuth or browser flows succeeded.

## Security model

- Firestore security rules in `firestore.rules` allow public reads only for published content, while client-created records remain drafts. Trusted server APIs control publishing and role changes.
- Storage rules in `storage.rules` restrict browser uploads to administrators and approved image MIME types and size.
- Server-side Firebase Admin credentials **bypass client security rules**: every backend operation must validate identity, role, input, and origin independently.
- The Drive upload endpoint can create immediately public files; ensure owner policy approval and external sharing are correct. Do not enable public Drive uploads or managed deletion without explicit review.
- Never publish service-account JSON, Google OAuth secrets, API keys for mail/cron, or full debugging logs.
- Protect Vercel preview deployments from untrusted forks and separate production credentials. Rotating credentials is necessary if unauthorized code previously accessed them.

## Analytics and privacy

The site contains Google Tag Manager (`GTM-KMGG36L8`) and optional direct GA4 measurement (`VITE_GA_MEASUREMENT_ID`). An explicit CSP SHA-256 hash authorizes the **exact existing** inline GTM bootstrap. The hash is automatically checked by `tests/security-analytics-hardening.test.mjs` and must be recalculated after any approved modification to its script bytes. Do not permit blanket `script-src 'unsafe-inline'` to work around a mismatch.

GA4 route tracking intentionally sends only the public URL **pathname**, never query parameters or admin pages. Avoid configuring GA4 page_view independently in both GTM and the direct helper for the same measurement ID; check GA4 Realtime/DebugView for duplicate views. Review applicable consent/privacy policies before enabling tracking, especially for school visitors.

The current CSP still allows some broad external images, frames and network connections to support legacy media and Firebase. Narrow those sources only after a browser network inventory confirms the required hosts, otherwise critical school site features can break.

## Deployment recovery

1. Inspect the failed Vercel deployment's build logs; distinguish test errors from independent production release gate errors.
2. Confirm the deployment SHA is the latest **reviewed** `main` merge, and that required checks/branch protection are enforced.
3. Verify production-only server secrets are present and target the intended Firebase project. Do not reveal values in logs or tickets.
4. Independently approve that full SHA in Vercel, rebuild and verify the resulting `release.json` and canonical origin.
5. Run the read-only production smoke workflow and manual user journeys before considering the deployment accepted.
6. For an incident, stop further promotion, revert through a reviewed commit, independently approve its resulting SHA and redeploy. Archive/restore content operations must be tested on staging first.

## Areas requiring owner action

GitHub branch rules and required human approvals; staging Firebase project and credentials; exact intended domain DNS; OAuth consent and redirect settings; Google Analytics consent/measurement configuration; recovery account and rollback credentials; live performance/accessibility checks.

**UI preservation:** existing React visual design, CSS, layout, fonts, animations and media must not be modified incidentally by infrastructure/security fixes.
