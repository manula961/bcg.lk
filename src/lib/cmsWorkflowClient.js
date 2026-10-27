/**
 * Minimal authenticated client for the existing server-owned CMS archive.
 * Unlike the legacy Firestore delete() service, this preserves a recoverable
 * snapshot, an audit entry, and leaves the content unpublished on restore.
 */
import { auth } from './firebase';

const KINDS = new Set(['news','events','pages','societies','sports','leadership','pastPapers']);

function validTarget(kind, id) {
  if (!KINDS.has(kind) || typeof id !== 'string' ||
      !/^[A-Za-z0-9_-]{1,150}$/.test(id)) {
    throw new Error('Invalid CMS record.');
  }
}

async function authorizedWorkflow(kind, id, action) {
  validTarget(kind,id);
  const user = auth?.currentUser;
  if (!user) throw new Error('Sign in to BCG.LK admin first.');
  const idToken = await user.getIdToken();
  const statusCheck = !action;
  const path = statusCheck
    ? '/api/admin/workflow?' + new URLSearchParams({ action: 'trash', kind, id })
    : '/api/admin/workflow';
  const response = await fetch(path, {
    method: statusCheck ? 'GET' : 'POST',
    credentials: 'same-origin',
    headers: {
      Authorization: 'Bearer ' + idToken,
      ...(statusCheck ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(statusCheck ? {} : { body: JSON.stringify({ action, kind, id }) }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'CMS archive request failed. No record was removed.');
  }
  return data;
}

/**
 * Privileged editorial transitions. The Firestore browser client may write only
 * unpublished drafts; publishing, published edits and unpublishing use this API.
 */
export async function performEditorialAction(kind, id, action, extra = {}) {
  validTarget(kind, id);
  if (!['submit','approve','publish','unpublish','proposeEdit','applyEdit','schedule'].includes(action))
    throw new Error('Unsupported editorial action.');
  const user = auth?.currentUser;
  if (!user) throw new Error('Sign in to the admin console first.');
  const token = await user.getIdToken();
  const response = await fetch('/api/admin/workflow', {
    method:'POST', credentials:'same-origin',
    headers:{Authorization:'Bearer ' + token, 'Content-Type':'application/json'},
    body:JSON.stringify({kind,id,action,...extra}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Editorial action failed. Please retry.');
  return data;
}

export async function getEditorialStatus(kind, id) {
  validTarget(kind,id);
  const user = auth?.currentUser;
  if (!user) throw new Error('Sign in to the admin console first.');
  const token = await user.getIdToken();
  const url = '/api/admin/workflow?' + new URLSearchParams({action:'status',kind,id});
  const response = await fetch(url, {
    method:'GET',credentials:'same-origin',cache:'no-store',
    headers:{Authorization:'Bearer '+token},
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Cannot read editorial status.');
  return data;
}

export async function getArchiveStatus(kind, id) {
  const data = await authorizedWorkflow(kind, id);
  return data.archived === true;
}

export async function getArchivedRecordIds(kind) {
  if (!KINDS.has(kind)) throw new Error('Invalid CMS collection.');
  const user = auth?.currentUser;
  if (!user) throw new Error('Sign in to the BCG.LK console first.');
  const token = await user.getIdToken();
  const url = '/api/admin/workflow?' + new URLSearchParams({ action:'trashList', kind });
  const response = await fetch(url, {
    method:'GET', headers:{Authorization:'Bearer ' + token}, cache:'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !Array.isArray(data.ids))
    throw new Error(data.error || 'Cannot verify archived content.');
  if (data.truncated) throw new Error('Archive list is too large to verify safely.');
  return data.ids.filter(id => typeof id === 'string' && /^[A-Za-z0-9_-]{1,150}$/.test(id));
}

export async function archiveCmsRecord(kind, id) {
  return authorizedWorkflow(kind, id, 'archive');
}

export async function restoreCmsRecord(kind, id) {
  return authorizedWorkflow(kind, id, 'restore');
}
