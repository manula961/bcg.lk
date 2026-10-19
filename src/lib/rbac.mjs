/**
 * BCG.LK console RBAC permissions. This file only controls UX;
 * firestore.rules and server-side Drive authorization are the security boundary.
 * The legacy "admin" role keeps its existing content-management privileges.
 */
export const ROLE_LABELS = Object.freeze({
  super_admin: 'Super Admin',
  admin: 'Administrator',
  publisher: 'Publisher',
  editor: 'Editor',
  auditor: 'Auditor',
});

export const ROLE_PERMISSIONS = Object.freeze({
  super_admin: Object.freeze([
    'content.read', 'content.create', 'content.edit', 'content.publish',
    'content.delete', 'content.reorder', 'media.upload', 'users.manage',
  ]),
  admin: Object.freeze([
    'content.read', 'content.create', 'content.edit', 'content.publish',
    'content.delete', 'content.reorder', 'media.upload',
  ]),
  publisher: Object.freeze([
    'content.read', 'content.create', 'content.edit', 'content.publish',
    'content.reorder', 'media.upload',
  ]),
  editor: Object.freeze([
    'content.read', 'content.create', 'content.edit', 'media.upload',
  ]),
  auditor: Object.freeze(['content.read']),
});

// Super-admin provisioning and transfer are trusted Firebase-console/Admin SDK operations.
// Never expose super_admin in the self-service role-assignment choices.
export const ASSIGNABLE_ROLES = Object.freeze(['admin', 'publisher', 'editor', 'auditor']);

export function isConsoleRole(role) {
  return typeof role === 'string' &&
    Object.prototype.hasOwnProperty.call(ROLE_PERMISSIONS, role);
}

export function hasPermission(role, permission) {
  return isConsoleRole(role) && ROLE_PERMISSIONS[role].includes(permission);
}

export function canEditRecord(role, record) {
  return hasPermission(role, 'content.edit') &&
    (hasPermission(role, 'content.publish') || record?.published !== true);
}
