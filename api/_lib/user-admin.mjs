import { createSign, randomUUID } from 'node:crypto';
import { sendViaResend } from './branded-email.mjs';

/**
 * Server-only Firebase Authentication management.
 * Uses a least-privileged Google service account and documented Identity Toolkit
 * + Firestore REST endpoints. No credentials or privileged endpoints are bundled
 * in the browser; no new npm runtime dependencies are required.
 */
const UID = /^[A-Za-z0-9_-]{1,128}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES = new Set(['admin', 'publisher', 'editor', 'auditor']);
const ACTIONS = new Set(['create', 'update', 'disable', 'enable', 'delete', 'reset']);
let cachedToken;
let tokenExpiry = 0;

export function problem(status, message) {
  return Object.assign(new Error(message), { status });
}
function configuration() {
  const project = process.env.FIREBASE_PROJECT_ID;
  const apiKey = process.env.FIREBASE_WEB_API_KEY || process.env.VITE_FIREBASE_API_KEY;
  if (!project || !/^[a-z][a-z0-9-]{3,62}$/.test(project) || !apiKey)
    throw problem(503, 'Firebase user management is not configured.');
  return { project, apiKey };
}
function serviceAccount() {
  let data;
  try { data = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || ''); }
  catch { throw problem(503, 'Server-side Firebase account management is not configured.'); }
  if (data?.type !== 'service_account' || data.project_id !== configuration().project ||
      !data.client_email?.endsWith('.iam.gserviceaccount.com') ||
      typeof data.private_key !== 'string' || !data.private_key.includes('PRIVATE KEY'))
    throw problem(503, 'Firebase service account does not match this project.');
  return data;
}
function email(value) {
  if (typeof value !== 'string' || value.length > 254 || !EMAIL.test(value.trim()))
    throw problem(400, 'Enter a valid email address.');
  return value.trim().toLowerCase();
}
function name(value) {
  if (typeof value !== 'string' || value.trim().length > 120)
    throw problem(400, 'Display name must be 120 characters or fewer.');
  return value.trim();
}
function uid(value) {
  if (typeof value !== 'string' || !UID.test(value))
    throw problem(400, 'Invalid Firebase account UID.');
  return value;
}
function role(value) {
  if (!ROLES.has(value)) throw problem(400, 'Choose an allowed role.');
  return value;
}
function fields(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj))
    throw problem(400, 'Invalid request body.');
  return obj;
}
async function response(url, options = {}) {
  const res = await fetch(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(12000) });
  const value = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = value?.error?.message || '';
    const status = code === 'EMAIL_EXISTS' || code === 'EMAIL_ALREADY_EXISTS' ? 409
      : code === 'USER_NOT_FOUND' || code === 'EMAIL_NOT_FOUND' ? 404
      : res.status === 401 || res.status === 403 ? 503 : 502;
    throw problem(status, status === 409 ? 'That email address already exists.'
      : status === 404 ? 'The Firebase account was not found.'
      : 'Firebase rejected the operation. Verify project configuration and permissions.');
  }
  return value;
}
async function jsonPost(url, body, bearer = null) {
  return response(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(bearer ? { Authorization: 'Bearer ' + bearer } : {}) },
    body: JSON.stringify(body),
  });
}
function projectBase() {
  return 'https://identitytoolkit.googleapis.com/v1/projects/' + encodeURIComponent(configuration().project);
}
function firestoreBase() {
  return 'https://firestore.googleapis.com/v1/projects/' +
    encodeURIComponent(configuration().project) + '/databases/(default)/documents';
}
function bearerToken(req) {
  const match = /^Bearer ([A-Za-z0-9._-]{20,5000})$/.exec(req?.headers?.authorization || '');
  if (!match) throw problem(401, 'Sign in as a Super Admin to continue.');
  return match[1];
}

/** Verify the actual Firebase ID token, current Auth disabled state, and
 * the live Firestore role on EVERY request (never trust a client-supplied role).
 */
export async function requireSuperAdmin(req) {
  const token = bearerToken(req);
  const { apiKey } = configuration();
  const auth = await response('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' +
    encodeURIComponent(apiKey), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token }),
      redirect: 'error', signal: AbortSignal.timeout(12000),
    }).catch(() => { throw problem(401, 'Firebase session expired. Sign in again.'); });
  const user = auth.users;
  if (!Array.isArray(user) || user.length !== 1 || !UID.test(user[0]?.localId || '') ||
      user[0]?.disabled === true)
    throw problem(401, 'Firebase session is not authorized.');
  const path = firestoreBase() + '/admins/' + encodeURIComponent(user[0].localId);
  const roleResponse = await fetch(path, {
    headers: { Authorization: 'Bearer ' + token },
    redirect: 'error', signal: AbortSignal.timeout(12000),
  });
  if (!roleResponse.ok) throw problem(403, 'Super Admin access required.');
  const doc = await roleResponse.json();
  if (doc?.fields?.role?.stringValue !== 'super_admin')
    throw problem(403, 'Super Admin access required.');
  return { uid: user[0].localId };
}
function validOrigin(req) {
  const allowed = process.env.USER_ADMIN_ORIGIN;
  if (!allowed || !/^https:\/\/[^/]+$/.test(allowed))
    throw problem(503, 'Configure USER_ADMIN_ORIGIN to the HTTPS admin site origin.');
  if (req?.headers?.origin !== allowed) throw problem(403, 'Origin not permitted.');
}
export function safeAccount(user) {
  return {
    uid: user.localId, email: user.email || '', displayName: user.displayName || '',
    disabled: Boolean(user.disabled), emailVerified: Boolean(user.emailVerified),
    createdAt: user.createdAt || '', lastLoginAt: user.lastLoginAt || '',
  };
}
async function accessToken() {
  if (cachedToken && Date.now() + 60000 < tokenExpiry) return cachedToken;
  const account = serviceAccount();
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const claims = Buffer.from(JSON.stringify({
    iss: account.client_email, scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
  })).toString('base64url');
  const assertion = header + '.' + claims;
  const signer = createSign('RSA-SHA256');
  signer.update(assertion);
  signer.end();
  const signature = signer.sign(account.private_key).toString('base64url');
  const result = await response('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: assertion + '.' + signature,
    }),
  });
  if (!result.access_token || typeof result.expires_in !== 'number')
    throw problem(503, 'Google service account authorization is unavailable.');
  cachedToken = result.access_token;
  tokenExpiry = Date.now() + Math.min(result.expires_in, 3500) * 1000;
  return cachedToken;
}
async function authCall(route, payload) {
  const token = await accessToken();
  return jsonPost(projectBase() + route, payload, token);
}
async function lookup(uidValue) {
  const id = uid(uidValue);
  const result = await authCall('/accounts:lookup', { localId: [id] });
  const user = result.users?.find(x => x.localId === id);
  if (!user) throw problem(404, 'Firebase Authentication account not found.');
  return safeAccount(user);
}
async function roleDocument(uidValue) {
  const token = await accessToken();
  const path = firestoreBase() + '/admins/' + encodeURIComponent(uid(uidValue));
  const res = await fetch(path, {
    headers: { Authorization: 'Bearer ' + token },
    redirect: 'error', signal: AbortSignal.timeout(12000),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw problem(503, 'Could not verify the target account role.');
  return res.json();
}
function roleName(document) { return document?.fields?.role?.stringValue || null; }
function stringField(value) { return { stringValue: value }; }
function timeField() { return { timestampValue: new Date().toISOString() }; }
async function commit(writes) {
  const token = await accessToken();
  return jsonPost(firestoreBase() + ':commit', { writes }, token);
}
function documentName(collection, id) {
  return 'projects/' + configuration().project + '/databases/(default)/documents/' +
    collection + '/' + id;
}
function writeAudit(actor, targetUid, action, beforeRole, afterRole) {
  return {
    update: {
      name: documentName('roleAudit', randomUUID()),
      fields: {
        actorUid: stringField(actor),
        targetUid: stringField(targetUid),
        action: stringField(action),
        beforeRole: beforeRole ? stringField(beforeRole) : { nullValue: null },
        afterRole: afterRole ? stringField(afterRole) : { nullValue: null },
        createdAt: timeField(),
      },
    },
    currentDocument: { exists: false },
  };
}
async function setRole(actor, targetUid, nextRole) {
  const document = await roleDocument(targetUid);
  const previous = roleName(document);
  if (previous === 'super_admin') throw problem(403, 'Super Admin accounts are protected.');
  if (nextRole === null && !document) return;
  const docName = documentName('admins', targetUid);
  const condition = document ? { updateTime: document.updateTime } : { exists: false };
  const write = nextRole === null
    ? { delete: docName, currentDocument: condition }
    : {
        update: {
          name: docName,
          fields: {
            role: stringField(nextRole),
            updatedAt: timeField(), updatedBy: stringField(actor),
            ...(!document ? { createdAt: timeField(), createdBy: stringField(actor) } : {}),
          },
        },
        ...(!document ? { currentDocument: condition } : {
          updateMask: { fieldPaths: ['role', 'updatedAt', 'updatedBy'] },
          currentDocument: condition,
        }),
      };
  await commit([write, writeAudit(actor, targetUid,
    nextRole === null ? 'revoke' : document ? 'change' : 'grant', previous, nextRole)]);
}
async function auditRequest(actor, action, targetUid, targetEmail) {
  const eventId = randomUUID();
  const entry = {
    actorUid: stringField(actor), action: stringField(action),
    targetUid: stringField(targetUid || ''),
    targetEmail: stringField(targetEmail || ''),
    createdAt: timeField(), status: stringField('requested'),
  };
  await commit([{
    update: { name: documentName('userAudit', eventId), fields: entry },
    currentDocument: { exists: false },
  }]);
  return eventId;
}
async function auditFinish(eventId, status) {
  try {
    await commit([{
      update: { name: documentName('userAudit', eventId), fields: { status: stringField(status) } },
      updateMask: { fieldPaths: ['status'] },
      currentDocument: { exists: true },
    }]);
  } catch (error) {
    console.error('[User Admin] Audit completion unavailable:', error?.status || 500);
  }
}
function assertProtected(target, actor, targetRole) {
  if (target.uid === actor || targetRole === 'super_admin')
    throw problem(403, 'Your own account and all Super Admin accounts are protected.');
}
async function sendReset(emailAddress, displayName = '', purpose = 'reset') {
  // Preserve Firebase's built-in email when Resend is not configured.
  if (!process.env.RESEND_API_KEY && !process.env.RESEND_FROM_EMAIL) {
    const { apiKey } = configuration();
    await jsonPost('https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=' +
      encodeURIComponent(apiKey), { requestType: 'PASSWORD_RESET', email: emailAddress });
    return;
  }
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL)
    throw problem(503, 'Branded email configuration is incomplete.');

  // Privileged Identity Toolkit call creates a Firebase-managed, expiring link
  // without triggering the standard Firebase email message.
  const result = await authCall('/accounts:sendOobCode', {
    requestType: 'PASSWORD_RESET',
    email: emailAddress,
    returnOobLink: true,
  });
  if (typeof result.oobLink !== 'string' || !result.oobLink.startsWith('https://'))
    throw problem(502, 'Firebase could not generate a secure password link.');
  await sendViaResend({ to: emailAddress, displayName, resetLink: result.oobLink, purpose });
}

async function loadPage(req) {
  const query = req?.query || {};
  if (query.uid) return { user: await lookup(uid(query.uid)) };
  const pageToken = query.pageToken || '';
  if (typeof pageToken !== 'string' || pageToken.length > 1024)
    throw problem(400, 'Invalid pagination token.');
  const url = new URL(projectBase() + '/accounts:batchGet');
  url.searchParams.set('maxResults', '50');
  if (pageToken) url.searchParams.set('nextPageToken', pageToken);
  const token = await accessToken();
  const result = await response(url.toString(), { headers: { Authorization: 'Bearer ' + token } });
  return {
    users: (result.users || []).filter(x => UID.test(x.localId || '')).map(safeAccount),
    nextPageToken: result.nextPageToken || null,
  };
}
async function perform(input, actor) {
  const body = fields(input);
  const action = body.action;
  if (!ACTIONS.has(action)) throw problem(400, 'Unsupported user management action.');
  const isCreate = action === 'create';
  const targetUid = isCreate ? '' : uid(body.uid);
  const createEmail = isCreate ? email(body.email) : '';
  const createRole = isCreate ? role(body.role) : null;
  const displayName = isCreate ? name(body.displayName || '') : '';
  let existing, existingRole;
  if (!isCreate) {
    existing = await lookup(targetUid);
    existingRole = roleName(await roleDocument(targetUid));
    assertProtected(existing, actor.uid, existingRole);
  }
  if (action === 'update') {
    if (!Object.prototype.hasOwnProperty.call(body, 'email') &&
        !Object.prototype.hasOwnProperty.call(body, 'displayName'))
      throw problem(400, 'Provide an email or display name to edit.');
  }
  if (action === 'delete' && (!existing.email || body.confirmEmail !== existing.email))
    throw problem(400, 'Type the exact account email to confirm deletion. Email-less accounts require trusted Firebase Console review.');
  if (action === 'reset' && !existing.email)
    throw problem(400, 'This account has no email address for a password reset.');
  const eventId = await auditRequest(actor.uid, action, targetUid, createEmail || existing?.email);
  try {
    let result;
    if (isCreate) {
      // The new login stays disabled until its role is committed.
      const created = await authCall('/accounts?key=' + encodeURIComponent(configuration().apiKey), {
        email: createEmail, displayName, disabled: true,
      });
      const createdUid = uid(created.localId);
      try {
        await setRole(actor.uid, createdUid, createRole);
        await authCall('/accounts:update', { localId: createdUid, disableUser: false });
      } catch (error) {
        // If role provisioning fails, leave the identity inaccessible.
        await authCall('/accounts:update', { localId: createdUid, disableUser: true }).catch(() => {});
        throw problem(503, 'Account provisioning was interrupted. Inspect the disabled account before retrying.');
      }
      result = { user: await lookup(createdUid), message: 'Account created.' };
      try {
        await sendReset(createEmail, displayName, 'setup');
        result.message = 'Account created and password setup email sent.';
      } catch {
        result.message = 'Account created, but password setup email failed. Use Reset Password to retry.';
        result.emailWarning = true;
      }
    } else if (action === 'update') {
      const attributes = { localId: targetUid };
      if (Object.prototype.hasOwnProperty.call(body, 'email')) attributes.email = email(body.email);
      if (Object.prototype.hasOwnProperty.call(body, 'displayName')) attributes.displayName = name(body.displayName);
      await authCall('/accounts:update', attributes);
      result = { user: await lookup(targetUid), message: 'Account updated.' };
    } else if (action === 'disable') {
      // Revoke the Firestore role BEFORE disabling Auth so existing ID tokens
      // immediately lose CMS access. Re-enabling never silently restores a role.
      await setRole(actor.uid, targetUid, null);
      await authCall('/accounts:update', { localId: targetUid, disableUser: true });
      result = { message: 'Account disabled and console role revoked.' };
    } else if (action === 'enable') {
      // Do not restore an old Firestore role that might have survived a
      // manual Firebase Console disable. Require explicit reapproval.
      await setRole(actor.uid, targetUid, null);
      await authCall('/accounts:update', { localId: targetUid, disableUser: false });
      result = { message: 'Account enabled. Assign a role separately before console access.' };
    } else if (action === 'delete') {
      await setRole(actor.uid, targetUid, null);
      await authCall('/accounts:delete', { localId: targetUid });
      result = { message: 'Authentication account deleted and console role revoked.' };
    } else if (action === 'reset') {
      await sendReset(existing.email, existing.displayName, 'reset');
      result = { message: 'Password reset email requested.' };
    }
    await auditFinish(eventId, 'completed');
    return result;
  } catch (error) {
    await auditFinish(eventId, 'failed');
    throw error;
  }
}
export async function manageUsers(req) {
  if (req.method !== 'GET' && req.method !== 'POST')
    throw problem(405, 'Method not allowed.');
  const actor = await requireSuperAdmin(req);
  if (req.method === 'GET') return loadPage(req);
  validOrigin(req);
  if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || ''))
    throw problem(415, 'Send JSON request content.');
  const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
  if (raw.length > 8192) throw problem(413, 'Request is too large.');
  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(raw) : req.body; }
  catch { throw problem(400, 'Invalid JSON.'); }
  return perform(body, actor);
}
