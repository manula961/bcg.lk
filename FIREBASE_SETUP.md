# BCG.LK — Firebase setup (Step 2)

1. In https://console.firebase.google.com create a Firebase project and register a **Web app**.
2. Enable **Authentication → Sign-in method → Email/Password**.
3. Create a **Cloud Firestore** database and **Cloud Storage** bucket. Choose an appropriate region and review billing requirements.
4. Copy `.env.example` to `.env.local` and paste the six Firebase Web app configuration values. Never put service account credentials in Vite environment variables.
5. Install dependencies with `npm install`, then run `npm run dev`.
6. Install Firebase CLI (`npm install -g firebase-tools`), run `firebase login`, then `firebase use --add` to select your project.
7. Deploy rules with `firebase deploy --only firestore:rules,storage`.
8. In Authentication, create your first admin email/password account. Copy its **UID**. In Firestore console create document `admins/<UID>` (e.g. `{role: 'admin'}`). Admin document creation is intentionally blocked from browser clients.
9. Collections for future steps: `news`, `events`, `pages`. Each public document should include `published: true` when ready to display. Unpublished content is readable only by admins.

**Important:** This stage prepares Firebase integration and access rules; it does not yet replace the site's hard-coded news/events or add an admin UI. These will be implemented in the next stages.

**Security:** Firebase Web API keys are public configuration, not authorization secrets. Firestore and Storage rules protect data. Only trusted project owners should manage the `admins` collection via Firebase Console or Admin SDK.
