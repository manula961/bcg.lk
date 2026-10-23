import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { ASSIGNABLE_ROLES, ROLE_LABELS } from '../lib/rbac.mjs';
import UserAccountsManager from './UserAccountsManager';

const UID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

/**
 * Super-admin-only role administration for existing Firebase accounts.
 * All role mutations go through the privileged API and are atomically audited.
 * Firestore rules reject browser role document and audit writes.
 * Granting the first super_admin remains a trusted Firebase console / Admin SDK operation.
 */
export default function RoleManager({ currentUid }) {
  const [accounts, setAccounts] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [busyUid, setBusyUid] = useState(null);
  const [notice, setNotice] = useState(null);

  useEffect(() => onSnapshot(collection(db, 'admins'), snapshot => {
    setAccounts(snapshot.docs.map(item => ({ uid: item.id, ...item.data() }))
      .sort((a, b) => a.uid.localeCompare(b.uid)));
  }, error => {
    setNotice({ type: 'error', text: error?.code === 'permission-denied'
      ? 'Super-admin listing is unavailable. Deploy and verify the reviewed Firestore RBAC rules.'
      : 'Could not load console roles. Check your connection and retry.' });
  }), []);

  useEffect(() => onSnapshot(query(collection(db, 'roleAudit'), orderBy('createdAt', 'desc'), limit(25)), snapshot => {
    setRecentActivity(snapshot.docs.map(item => ({ id: item.id, ...item.data() })));
  }, () => {
    setNotice({ type: 'error', text: 'Role changes remain protected, but the activity log could not be loaded. Check deployed Firestore rules.' });
  }), []);

  async function roleRequest(body) {
    const current = auth.currentUser;
    if (!current || current.uid !== currentUid)
      throw new Error('Your signed-in account has changed. Reload the console.');
    const token = await current.getIdToken();
    const response = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify(body), cache: 'no-store',
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result)
      throw new Error(result?.error || 'Secure role management is unavailable. Please try again.');
    return result;
  }

  async function assignRole(uidText, nextRole) {
    const uid = String(uidText || '').trim();
    if (!UID_PATTERN.test(uid) || uid === currentUid || !ASSIGNABLE_ROLES.includes(nextRole)) {
      setNotice({ type: 'error', text: 'Choose an allowed role for another existing account.' });
      return;
    }
    if (!window.confirm('Assign ' + ROLE_LABELS[nextRole] + ' to Firebase UID ' + uid + '?')) return;
    setBusyUid(uid);
    setNotice(null);
    try {
      const result = await roleRequest({ action: 'role', uid, role: nextRole });
      setNotice({ type: 'success', text: result.message || 'Role saved.' });
    } catch (error) {
      setNotice({ type: 'error', text: error?.message || 'Could not assign role.' });
    } finally {
      setBusyUid(null);
    }
  }

  async function revokeRole(account) {
    const uid = account?.uid;
    if (!UID_PATTERN.test(uid || '') || uid === currentUid || account.role === 'super_admin') return;
    if (!window.confirm('Revoke console access from ' + uid +
      '? The Firebase Authentication account will remain enabled.')) return;
    setBusyUid(uid);
    setNotice(null);
    try {
      const result = await roleRequest({ action: 'revokeRole', uid });
      setNotice({ type: 'success', text: result.message || 'Role revoked.' });
    } catch (error) {
      setNotice({ type: 'error', text: error?.message || 'Could not revoke access.' });
    } finally {
      setBusyUid(null);
    }
  }

  return (
    <div className="admin-cm-wrap">
      <UserAccountsManager currentUid={currentUid} roleAssignments={accounts} onAssignRole={assignRole} onRevokeRole={revokeRole} roleBusy={busyUid !== null} />
      {notice && <p className={'admin-notice ' + notice.type} role={notice.type === 'error' ? 'alert' : 'status'}>{notice.text}</p>}
      <section className="admin-table-card admin-role-activity" aria-label="Recent role activity">
        <div className="admin-editor-header">
          <div><h2 className="admin-editor-title">Recent Role Activity</h2>
            <p className="admin-header-desc">Latest account permission changes.</p></div>
        </div>
        {recentActivity.length === 0 ? <p className="admin-state-msg">No role changes yet. Activity will appear when accounts are updated.</p> :
          <div className="admin-list-container">{recentActivity.map(entry => (
            <article className="admin-row" key={entry.id}>
              <div className="admin-row-details">
                <h3 className="admin-row-title">{entry.action} · {entry.targetUid}</h3>
                <p className="admin-row-snippet">{ROLE_LABELS[entry.beforeRole] || 'No role'} → {ROLE_LABELS[entry.afterRole] || 'No role'}</p>
                <p className="admin-row-meta">By {entry.actorUid}</p>
              </div>
            </article>
          ))}</div>}
      </section>
    </div>
  );
}
