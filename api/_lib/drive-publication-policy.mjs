/**
 * BCG.LK Google Drive uploads currently create an anyone-with-link reader
 * permission before a CMS item is published. Refuse new uploads until the
 * school owner has explicitly authorized that privacy model.
 *
 * Server-only opt-in. This must not be prefixed with VITE_ or exposed in the
 * browser; it never grants upload rights without Firebase role + Drive OAuth.
 */
export function assertPublicDriveUploadApproved(env = process.env) {
  if (env.BCG_ALLOW_PUBLIC_DRIVE_UPLOADS !== '1') {
    throw Object.assign(
      new Error('Public Google Drive uploads are disabled pending school approval of the public-sharing policy.'),
      { status: 403 }
    );
  }
}
