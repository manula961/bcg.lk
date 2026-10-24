# BCG.LK — post-remediation strict code audit
Date: 2026-10-24

## Scope and decision

Repository: `manula961/bcg.lk`; target: draft PR #68 (`fix/audit-hardening-preserve-ui-20261024`). Audited code head before this report-only commit: `1084f4618eb08f2127b47fd041e9a6be501a370e`. Baseline `main`: `467f158e7b592ce65e08eae355a972a71aa4aa4a`.

**Release decision: NO-GO.** This is a static, repository-only assessment. No successful fresh npm install/test/build, emulator execution, full browser/visual comparison, deployed Firebase verification, IAM inspection or production penetration test has been demonstrated. Never treat proposed source changes as deployed protections.

## Integrity and preservation verification

- Verified diff of the code head against baseline: 11 changed paths, **zero** changes under `src/components/`, `src/pages/`, `src/admin/`, `src/navigation/`, `public/`, or CSS/visual assets.
- Checked Jaliya-authored commit history by file path against every changed existing path: no overlap in the final diff.
- Jaliya's historical contribution to `src/lib/contentRepository.js` was explicitly identified; that file was restored byte-for-byte to the baseline, blob `c0359143d4a457502c9dda9df7cca349f90a2522`.
- Main remains at baseline, and this work is in an unmerged draft PR. Re-run the repository's full Git-history Rule #2 check after CI execution is available.
- Exercised the new Vercel fallback regex against ordinary SPA routes, media/API paths, and root-level missing files. Regex examples aligned with the intended allow/deny behavior, but deployed HTTP behavior is unverified.

## Findings and disposition

| ID | Severity | Area | Post-fix disposition |
| --- | --- | --- | --- |
| G-01 | BLOCKER | Governance | Main branch protections and required independent approval remain **unverified** by accessible repository settings; owner must configure/check them. |
| G-02 | BLOCKER | CI | The latest PR Build, Backend, Dependency and Browser Smoke workflows failed with zero recorded job steps; root cause is unknown. Do not call these failed tests code defects or call them passing. |
| S-03 | HIGH | Google Drive lifecycle | Partial mitigation: future uploads marked by app metadata and can be deleted only via explicit same-origin, authenticated admin/super-admin API. No automatic media unlink; existing unmarked public uploads and retention reconciliation remain open. |
| R-04 | MEDIUM | Firestore scaling | Full-collection subscriptions and reorder reads remain. Pagination must be approved without hiding valid existing content or changing protected UI. |
| R-05 | MEDIUM | Past Papers errors | Code remediation: service catches synchronous subscription setup failures and forwards to existing UI error callback; runtime behavior needs testing. |
| R-06 | MEDIUM | Unknown asset routing | Code remediation: allowlist known root assets, exclude dotted root paths from SPA fallback and test. Requires deployed HTTP checks. |
| R-07 | MEDIUM | Drive availability | Code remediation: 12-second external HTTP abort signals and redirect rejection; mocks added for timeout signal presence. |
| R-08 | MEDIUM | SEO request pressure | Partial mitigation: concurrent same-record requests deduplicate, 12 parallel Firestore reads per instance; not distributed edge rate limiting. |
| R-09 | MEDIUM | Firestore timestamp integrity | Code remediation: creation, publication/unpublication, and timestamped-record writes have server-time restrictions; emulator checks added but not executed successfully. |
| R-10 | MEDIUM | Web security headers | HSTS added; effective deployed headers and compatible CSP still unverified. |
| R-11 | MEDIUM | Calendar UX/reliability | Remaining: calendar currently logs subscription failures without a visitor-facing failure state and may not roll over at midnight. Changes require explicit Rule #1 UI permission. |
| R-12 | MEDIUM | Dynamic CMS SEO | Remaining: generated sitemap excludes published dynamic CMS documents; needs a trusted publication feed and operational review. |

## Additional code-review considerations

1. **Auth:** Firebase email/password sign-in and Firestore role checks exist. No conclusion is possible about production MFA, user enrollment security, lockout settings, session revocation or least-privilege IAM from the repository alone.
2. **Google Drive:** App metadata and filename checks reduce accidental deletion of arbitrary Drive files. The new endpoint still permits a privileged administrator to delete an app-managed asset that is in use; manual reconciliation/ownership checks are essential. The public-image and PDF upload flows intentionally apply anyone-with-link permissions immediately.
3. **File safety:** Image uploads inspect format signatures but do not demonstrate complete image decoding; PDF upload checks the header but does not demonstrate malware scanning or structural validation. Content provenance remains an editorial/operational concern.
4. **Audit history:** Auth role changes use server-side audit records; Firestore CMS edits do not amount to a dedicated immutable editorial audit history. Legacy documents lacking system timestamps remain supported, therefore timestamp history is not uniformly complete.
5. **CSP:** A blocking CSP was not introduced because the existing UI and third-party image/media behavior require compatibility validation. Stage in report-only mode before enforcement.
6. **Dependencies:** Repository has a lockfile, Dependabot, and production `npm audit` workflow, but dependency health cannot be certified while the workflow fails before executing.
7. **Data protection:** No backup restore test, deployed rules parity, incident response drill or production authorization tests were performed.

## Tests reviewed, but not certified

- `tests/security-hardening.test.mjs`: route fallback, future Drive media deletion scope, authorization restriction, subscription handling structure, Firestore rule references and metadata-request coalescing.
- `tests/integration/firebase-emulator.test.mjs`: new forged timestamp and publication transition expectations.
- `scripts/check-public-deployment.mjs`: HSTS, expected status codes and existing security checks.
- CI runs on PR #68 for code head `1084f4618eb08f2127b47fd041e9a6be501a370e` failed without executed job-step evidence. A passing source review **does not imply** these tests passed.

## Mandatory release gates

1. Repair GitHub Actions availability/permissions/quota/billing; run all required jobs to completion on the latest PR SHA.
2. Require independent latest-head approval and enforce branch protection or rulesets; verify direct pushes and force pushes to main are blocked.
3. Obtain explicit UI permission before changes to calendar failure states, pagination UI or other original/Jaliya-designed components.
4. Check deployed Firestore/Storage rule versions, staging IAM/Auth/OAuth, representative existing documents and backup/restore.
5. Verify preview routes, 404/MIME/HSTS/CSP behavior, upload/delete permissions, crawler load, responsive screenshot parity and accessibility.
6. Recheck the entire diff and the Rule #1/#2 protection scripts. Merge only with all mandatory checks green and owner sign-off.

**No production release approved by this report.**
