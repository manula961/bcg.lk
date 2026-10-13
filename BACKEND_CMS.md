# BCG.LK Firebase CMS services — backend only

This branch adds data services. It does **not** change or connect any public-site or admin-dashboard UI files. Do not merge a rewritten NewsSection from another branch: preserve the current presentation exactly.

## Modules

- \`src/lib/contentRepository.js\` — Firestore CRUD, publication filtering, subscriptions, timestamps, input validation.
- \`src/lib/newsService.js\` — news-specific schema and CRUD functions.
- \`src/lib/eventsService.js\` — event-specific schema and CRUD functions.
- \`src/lib/pagesService.js\` — page-specific schema and CRUD functions.

Each service exports \`listPublished*\`, \`subscribePublished*\`, \`getPublished*\`, \`listAdmin*\`, \`subscribeAdmin*\`, \`getAdmin*\`, \`create*\`, \`update*\`, and \`delete*\`. Subscriptions return Firestore's unsubscribe function and accept an optional error callback.

All operations use the existing \`src/lib/firebase.js\`, which reads the six \`VITE_FIREBASE_*\` web-app config values. **Do not** store service-account credentials in client-side Vite variables. No additional dependencies are needed.

## Data shapes

Common fields: \`published\` (boolean, defaults to \`false\`), \`createdAt\`, \`updatedAt\`, \`publishedAt\` (Firestore timestamps or null), \`createdBy\` and \`updatedBy\` (Firebase user UIDs). These metadata fields are managed by the services and are not accepted in user input.

**News:** required \`title\` and \`excerpt\`; optional \`body\`, \`category\` (\`News\` or \`Announcements\`), \`tag\`, and \`imageUrl\` (HTTPS).

**Events:** required \`title\`, \`description\`, \`location\`, and \`eventDate\` (real date in \`YYYY-MM-DD\`); optional \`color\` (\`#RRGGBB\`) and \`imageUrl\` (HTTPS). The calendar date is intentionally a string so a viewer's timezone cannot change the date.

**Pages:** required \`slug\` (lowercase letters, digits, hyphens), \`title\`, \`body\`; optional \`seoDescription\` and \`imageUrl\` (HTTPS). The page's document ID equals the immutable slug. Creation uses a transaction to prevent overwriting an existing page.

## Example usage in *future* approved UI integration

\`\`\`js
import { createNews, subscribePublishedNews, subscribeAdminNews } from './lib/newsService';

// Admin with Firebase Authentication and Firestore admins/<UID> role=admin:
const id = await createNews({
  title: 'School announcement',
  excerpt: 'A short summary.',
  category: 'Announcements',
  published: false,
});

// Public listeners query where published == true (important for Firestore Rules):
const stopPublicListener = subscribePublishedNews(
  posts => { /* render posts using the existing UI layout */ },
  error => { /* show existing UI error state */ },
);
stopPublicListener();

// Admins can list unpublished drafts:
const stopAdminListener = subscribeAdminNews(
  posts => { /* manage articles in an approved admin UI */ },
  error => { /* handle Firestore permission errors */ },
);
stopAdminListener();
\`\`\`

For event \`eventDate\`, map to the existing UI's month/day presentation *only after explicit UI integration approval*. News already has a separate public UI layout; this backend branch does not touch it.

## Security and rollout checklist

1. Confirm Firebase Authentication's Email/Password provider is enabled.
2. Confirm \`admins/<UID>\` exists with \`role: 'admin'\`.
3. Confirm **live** Firestore Security Rules enforce admin-only writes and public reads for published documents.
4. In a preview environment, test: unauthenticated writes denied, non-admin writes denied, authenticated admin create/update/delete, public queries returning only published records.
5. Test page-slug uniqueness, required-field validation, draft→publish→draft transitions, and unsubscribe behavior.
6. Verify all six \`VITE_FIREBASE_*\` variables exist in the desired Vercel environments.
7. Check the branch diff: **only these newly added backend files and this document**, no UI/CSS modifications.

### Important limitations

- Client-side validators are not a security boundary. Firestore Security Rules must also enforce any validation that must be protected against a malicious client; this branch does not modify rule files.
- Firebase Storage rules already exist, but file upload workflows are not implemented by these services.
- No UI is wired to these services yet; creating these files will not add buttons, editor screens, or change website content.
- Automatic end-to-end Firestore permission tests require a configured Firebase emulator or test project; a Vite build alone does not verify live authorization.
