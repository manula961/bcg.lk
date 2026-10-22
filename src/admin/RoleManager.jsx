import React, { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, runTransaction, serverTimestamp, query, orderBy, limit } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { ASSIGNABLE_ROLES, ROLE_LABELS } from '../lib/rbac.mjs';
import UserAccountsManager from './UserAccountsManager';

const UID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

/**
 * Super-admin-only role administration for existing Firebase accounts.
 * Firestore rules independently reject unprivileged, self, and super-admin edits.
 * New accounts are created with an assigned role through the server-side account API.
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

  async function assignRole(uidText, nextRole) {
    const uid = uidText.trim();
    if (!UID_PATTERN.test(uid)) {
      setNotice({ type: 'error', text: 'Enter a valid Firebase Authentication UID (letters, digits, underscores or hyphens).' });
      return;
    }
    if (uid === currentUid || !ASSIGNABLE_ROLES.includes(nextRole)) {
      setNotice({ type: 'error', text: 'You cannot change your own role or assign Super Admin from this panel.' });
      return;
    }
    if (!window.confirm('Assign ' + ROLE_LABELS[nextRole] + ' to Firebase UID ' + uid +
      '? Confirm the UID belongs to the intended existing account.')) return;

    setBusyUid(uid);
    setNotice(null);
    try {
      const actorUid = auth.currentUser?.uid;
      if (!actorUid || actorUid !== currentUid) throw new Error('Your signed-in account has changed. Reload the console.');
      // The Vite Firebase emulator runs without Vercel functions. Production
      // role grants additionally verify the UID against the server-only Auth API.
      if (import.meta.env.VITE_USE_FIREBASE_EMULATORS !== 'true') {
        const token = await auth.currentUser.getIdToken();
        const verification = await fetch('/api/admin/users?uid=' + encodeURIComponent(uid), {
          headers: { Authorization: 'Bearer ' + token }, cache: 'no-store',
        });
        const account = await verification.json().catch(() => ({}));
        if (!verification.ok || account.user?.uid !== uid)
          throw new Error('Cannot verify this Firebase Authentication UID. Check server user-management configuration.');
        if (account.user.disabled)
          throw new Error('Enable this Firebase account before assigning a console role.');
      }
      await runTransaction(db, async transaction => {
        const reference = doc(db, 'admins', uid);
        const current = await transaction.get(reference);
        if (current.exists() && current.data()?.role === 'super_admin') {
          throw new Error('Super-admin role changes require a trusted Firebase administrator.');
        }
        transaction.set(doc(collection(db, 'roleAudit')), {
          actorUid, targetUid: uid,
          action: current.exists() ? 'change' : 'grant',
          beforeRole: current.exists() ? current.data().role : null,
          afterRole: nextRole, createdAt: serverTimestamp(),
        });
        if (current.exists()) {
          transaction.update(reference, {
            role: nextRole, updatedAt: serverTimestamp(), updatedBy: actorUid,
          });
        } else {
          transaction.set(reference, {
            role: nextRole,
            createdAt: serverTimestamp(), createdBy: actorUid,
            updatedAt: serverTimestamp(), updatedBy: actorUid,
          });
        }
      });
      setNotice({ type: 'success', text: 'Role saved. Permission changes take effect for active sessions.' });
    } catch (error) {
      setNotice({ type: 'error', text: error?.code === 'permission-denied'
        ? 'Firestore rejected this role assignment. Confirm Super Admin privileges and deployed rules.'
        : error?.message || 'Could not assign role.' });
    } finally {
      setBusyUid(null);
    }
  }

  async function revokeRole(account) {
    const uid = account.uid;
    if (uid === currentUid || account.role === 'super_admin') return;
    if (!window.confirm('Revoke console access from ' + uid +
      '? This does NOT delete the Firebase Authentication account.')) return;
    setBusyUid(uid);
    setNotice(null);
    try {
      const actorUid = auth.currentUser?.uid;
      if (!actorUid || actorUid !== currentUid) throw new Error('Your signed-in account has changed. Reload the console.');
      await runTransaction(db, async transaction => {
        const reference = doc(db, 'admins', uid);
        const current = await transaction.get(reference);
        if (!current.exists()) return;
        if (current.data()?.role === 'super_admin') {
          throw new Error('Cannot revoke a Super Admin from this panel.');
        }
        transaction.set(doc(collection(db, 'roleAudit')), {
          actorUid, targetUid: uid, action: 'revoke',
          beforeRole: current.data().role, afterRole: null,
          createdAt: serverTimestamp(),
        });
        transaction.delete(reference);
      });
      setNotice({ type: 'success', text: 'Console access revoked for the selected UID.' });
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
