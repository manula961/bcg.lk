# Past Papers CMS and Drive setup

The public **/past-papers** page keeps its existing layout and loads only `published == true` documents from Firestore collection `pastPapers`. In **/admin**, choose **Past Papers** and create an entry with title, exam, subject, year (four digits), language, optional term, and PDF URL. Use the **Upload PDF to Google Drive** action to populate the URL, then save as a draft or publish.

## Google Drive setup (owner action required)

Reuse the **existing** OAuth client and Firebase project. Configure these **server-only** Vercel environment variables: `FIREBASE_PROJECT_ID`, `FIREBASE_WEB_API_KEY`, `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI=https://bcglk.devoraid.com/api/drive/callback`, and `DRIVE_COOKIE_ENCRYPTION_KEY` (64 hex characters, 32 random bytes). `GOOGLE_DRIVE_FOLDER_ID` is an optional existing Drive folder accessible by the connected account. The OAuth client must allow the exact callback URL. Use the same-origin production site and connect Drive through the admin panel.

The upload endpoint authenticates the Firebase ID token, checks the media-upload role using Firestore, requires the same origin and an encrypted browser-bound Google OAuth session, then validates `application/pdf`, a `%PDF-` signature, and a maximum of 10 MiB. It generates a random filename. Google Drive grants anyone-with-link read permission to the PDF and returns a Drive view URL. **Even drafts' uploaded files are immediately public via their links**; never upload private materials. Google Drive link-based access may be unavailable if the Google Workspace administrator restricts public sharing.

## Deployment checklist

1. Review the PR and run `npm ci`, `npm test`, and `npm run build` plus browser smoke tests and public UI regression checks.
2. Back up existing Firestore data, compare deployed rules with repository `firestore.rules`, then **separately** approve and deploy updated rules to the existing Firebase project. A Vercel build does not deploy Firestore rules.
3. Confirm Vercel variables, Drive OAuth callback, approved Drive folder, and permissions. Redeploy Vercel only after reviewing the diff.
4. Test with editor, publisher, admin, auditor, and anonymous sessions: upload a non-sensitive PDF, save draft, verify it is absent publicly, publish, verify search/download, and unpublish.
5. Verify that PDF URLs open anonymously in a logged-out browser. Deleting a Firestore entry does **not** delete its Google Drive file; clean up Drive separately.

**Limits:** The PDF endpoint uses the same Drive upload flow as images and has a 10 MiB size ceiling. No credentials, OAuth grants, Firebase rules, or production settings are changed by this PR.
