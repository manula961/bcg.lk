# BCG.LK verification and remediation — 2 November 2026

Baseline: `a6c3971627f661c0c665ed0de5696cf586ef2a3b`.

## Result: 60/100, production NO-GO

This is an evidence-weighted readiness checklist, not a Lighthouse score or a certification that every defect has been found. Unverified production controls receive no credit. The requested 95-point target is not met. No production settings, database records, secrets, rules, or deployments were changed.

| Area | Earned / possible | Evidence and deductions |
| --- | --- | --- |
| Source correctness and build | 25 / 25 | Clean dependency install, 266 passing tests, build and syntax checks; original suite had seven failing entries. |
| Runtime and UX | 10 / 15 | 22 emulator integration tests and authenticated CMS browser flow passed. All 16 public smoke cases passed only after Google Fonts requests were stubbed; full visual/accessibility/performance acceptance remains open. |
| Security and dependencies | 15 / 20 | Production dependency audit: zero advisories. Full dependency audit: four development advisories. Release-governance validation hardened. Live rules/IAM are not certified by local tests. |
| Release and live operations | 5 / 25 | Release checks exist and are tested. Actual main is unprotected; reviewed release, exact-head CI, deployment identity, live Firebase parity and scheduler operation remain unverified. |
| Recovery and privacy | 0 / 10 | No observed restore drill or school media-consent evidence. Existing public-upload safety gate remains intact. |
| Rules 1 and 2 | 5 / 5 | No protected UI or Jaliya-contributed file changes. |
| **Total** | **60 / 100** | **Open critical release controls prevent production approval.** |

## Findings fixed and retested

1. **Build blocker:** static SEO substitutions required single-line metadata. The current protected `index.html` formats descriptions over multiple lines. Accept whitespace between attributes and HTML5 void-tag syntax without editing the source template. Build, sitemap, release manifest and static metadata tests now pass.
2. **Crawler regression:** dynamic published-CMS metadata had the same assumption and silently fell back to the SPA. Apply the same compatible matcher; retain escaping, unpublished-content protection and unchanged React body.
3. **Incomplete approval evidence:** the GitHub verifier read only the first 100 reviews. A later change-request could be missed. Paginate reviews and associated PRs with a bounded fail-closed limit. A regression test proves that a page-two change request invalidates an earlier approval.
4. **Incomplete protection policy:** an absent/noninteger review count could pass the previous numeric comparison, and unresolved-conversation policy was unchecked. Require a positive integer approval count and required conversation resolution.

Added regression coverage for multiline, tab-separated and compact HTML5 metadata, unchanged body markup, incomplete protection settings and review pagination. Existing tests were not deleted, skipped or weakened.

## Verification and limits

- Node 24.22.1; `npm ci --ignore-scripts`, `npm run build` (includes the full test suite), source syntax and bundle budgets.
- `npm test`: **266 passed; zero failures/skips** after remediation. Baseline: 251 passed and seven failing entries; fixing an import-time failure also exposes the remaining tests in that file.
- Firestore/Storage emulator integration: **22 passed; zero failures/skips**, demo project only.
- Authenticated admin E2E: passed calendar keyboard/focus, published directory, modal and draft privacy, draft edits, stale-write rejection, archive boundaries, role changes and revocation. Uses disposable Auth/Firestore/Storage emulators; it does not prove production API delivery or live credentials.
- Public smoke: normal run fails because this environment rejects Google Fonts CSS requests (`ERR_EMPTY_RESPONSE`), causing Vite to reject the Footer CSS preload. A diagnostic copy of the existing smoke test stubs only `fonts.googleapis.com` to empty CSS: **16/16 passed**. This proves fallback-font route/runtime behavior only. The checked-in test remains unchanged. Do not report the ordinary public smoke or visual comparison as passed.
- Rule checks compare committed changes against `origin/main`; Jaliya history includes 112 protected paths. Working tree was additionally checked for protected-file changes.
- Initial entry approximately 264 KB; shared Firebase/content chunk approximately 725 KB. Repository budgets pass; the standard Vite >500 KB warning remains. No claim of field Core Web Vitals or Lighthouse results.
- Ephemeral browser/emulator test dependencies were installed for checks; the final build was rerun after restoring the unchanged lockfile with `npm ci`. Dependency files are not modified.

## Findings still open and required closure evidence

- **P0 — release protection:** GitHub branch API currently reports `main.protected=false`. Configure enforceable protection, current-head independent review, all required checks and conversation resolution, no administrator bypass, then demonstrate a rejected noncompliant merge. Repository is currently reported public; older documents describing private-plan restrictions are historical, not proof of current settings.
- **P0 — exact release CI:** original head has failed `build`, `verify`, `browser-smoke` and `merge-integrity`; `firebase-emulator` and `production-audit` pass; visual comparison is skipped. New candidate checks must complete. The visual-compare workflow also builds/tests the baseline, whose seven failures can block comparison; do not bypass or claim that baseline green.
- **P0 — live deployment/Firebase:** independently establish approved production origin and deployed SHA; verify deployed Firestore/Storage rules and IAM, credentials, OAuth callbacks and server APIs against the existing project. No live privileged credentials are available here. Do not infer live success from emulators.
- **P1 — development dependencies:** npm audit reports `vite` high, `esbuild` moderate, `postcss-selector-parser` moderate and `@babel/core` low (four total). npm proposes a major Vite upgrade for part of the chain. Both package files have Jaliya-authored history; modifying them violates the explicitly retained rule 2. Requires a separately authorized dependency update and compatibility verification, not suppression of the audit.
- **P1 — external stylesheet reliability:** reproduce font-provider failure on approved browsers; decide on a locally hosted font or resilient loading implementation under a separately authorized UI change. Existing CSS and React sources are protected. Full public smoke, pixel comparison, keyboard/screen-reader/contrast and mobile performance need unrestricted/staging evidence.
- **P1 — recovery/privacy:** isolated backup restoration evidence, retention and school consent/public-media policy remain absent. Keep public Drive uploads and destructive cleanup opt-ins disabled until approved. No false completion credit for a disabled scheduler.
- **P2 — performance/CSP:** route-shared chunk warning and broad network/media CSP remain. Measure actual approved-host traffic and performance before narrowing the allowlist or changing protected code.

The code-remediable findings discovered in this pass were fixed and re-audited. Remaining findings cannot be closed honestly while preserving the stated file rules and without live operational evidence. No score was raised merely to meet the requested threshold.
