import { manageUsers } from '../_lib/user-admin.mjs';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Allow', 'GET, POST');
  try {
    const payload = await manageUsers(req);
    return res.status(200).json(payload);
  } catch (error) {
    const status = [400, 401, 403, 404, 405, 409, 413, 415, 503].includes(error?.status)
      ? error.status : 502;
    // No tokens, passwords, raw Firebase responses or credentials in logs.
    console.error('[User Admin API] Request rejected:', status);
    return res.status(status).json({
      error: [401, 403, 400, 404, 405, 409, 413, 415].includes(status)
        ? error.message
        : 'User management is unavailable. Check server configuration or Firebase permissions.',
    });
  }
}
