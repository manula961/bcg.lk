import {
  configured, requireMethod, requireSameOrigin, requireAdmin, verifySession,
  accessToken, deleteManagedDriveFile, errorReply,
} from '../_lib/drive.mjs';

// Explicit, independently authenticated cleanup operation. Never triggered
// merely by deleting/unpublishing a Firestore record.
export default async function handler(req, res) {
  if (!requireMethod(req, res, 'POST')) return;
  try {
    if (!configured()) throw new Error('Google Drive is not configured');
    requireSameOrigin(req);
    const uid = await requireAdmin(req);
    const session = verifySession(req, uid);
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body) ||
        Object.keys(body).length !== 1 || typeof body.fileId !== 'string') {
      throw Object.assign(new Error('Provide a managed Drive file ID'), { status: 400 });
    }
    const token = await accessToken(session.refresh);
    const result = await deleteManagedDriveFile(token, body.fileId);
    res.status(200).json(result);
  } catch (error) { errorReply(res, error); }
}
