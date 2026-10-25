# BCG.LK — Bandaranayake College

The Bandaranayake College, Gampaha website, built with React 19, Vite, Tailwind CSS and the existing Firebase 12 SDK. The existing public design is protected by the project's UI-preservation checks.

## Project overview

- **Public website:** Home, college information, news, event calendar, published pages, societies, sports and leadership directories.
- **Admin CMS:** Firebase email/password sign-in with Firestore-based administrator authorization; drafting, publishing and managing seven content collections.
- **Backend:** The **existing** Firebase Authentication, Firestore and Storage project. Google Drive image uploads also use authenticated Vercel API functions.
- **Deployment:** Vercel with GitHub Actions checks. Keep the current production Firebase project; no additional cloud Firebase project is required.

## Local development

Requires a supported Node.js installation (CI uses Node 24).

```bash
npm ci
cp .env.example .env.local
# Fill .env.local with web-app configuration from the EXISTING Firebase project.
npm run dev
```

Never commit `.env.local`, Firebase administrator credentials, OAuth client secrets or encryption keys. Variables prefixed `VITE_` are exposed to the client and must **not** contain server secrets.

## Verification

```bash
npm test
npm run build
npm run preview
```

GitHub Actions additionally checks Firestore/Storage rules using local emulators, authenticated CMS flows in disposable emulators, browser routes, production dependency advisories, and JavaScript bundle budgets. The manual visual-regression workflow compares approved deployments.

## Documentation

**[Operations, Firebase, security, backups and deployment guide](docs/OPERATIONS.md)** — the current source of truth for administering and releasing BCG.LK.

Old setup-stage notes, completed pull-request audit reports and superseded branch instructions have been retired from the working tree. Their history remains available in Git. Changes must be reviewed and approved before merging; never deploy Firestore rules or modify the production database automatically as part of documentation work.
