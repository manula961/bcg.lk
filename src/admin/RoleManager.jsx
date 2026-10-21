import React, { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, runTransaction, serverTimestamp, query, orderBy, limit } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { ASSIGNABLE_ROLES, ROLE_LABELS } from '../lib/rbac.mjs';
import UserAccountsManager from './UserAccountsManager';

const UID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

/**
 * Super-admin-only console for existing Firebase Authentication UIDs.
 * Firestore rules independently reject unprivileged, self, and super-admin edits.
 * Creating Authentication accounts and granting the first super_admin remain trusted
 * Firebase console / Admin SDK operations.
 */
export default function RoleManager({ currentUid }) {
  const [accounts, setAccounts] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState({});
  const [newUid, setNewUid] = useState('');
  const [newRole, setNewRole] = useState('editor');
  const [busyUid, setBusyUid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);

  useEffect(() => onSnapshot(collection(db, 'admins'), snapshot => {
    setAccounts(snapshot.docs.map(item => ({ uid: item.id, ...item.data() }))
      .sort((a, b) => a.uid.localeCompare(b.uid)));
    setLoading(false);
  }, error => {
    setLoading(false);
    setNotice({ type: 'error', text: error?.code === 'permission-denied'
      ? 'Super-admin listing is unavailable. Deploy and verify the reviewed Firestore RBAC rules.'
      : 'Could not load console roles. Check your connection and retry.' });
  }), []);

  useEffect(() => onSnapshot(query(collection(db, 'roleAudit'), orderBy('createdAt', 'desc'), limit(25)), snapshot => {
    setRecentActivity(snapshot.docs.map(item => ({ id: item.id, ...item.data() })));
  }, () => {
    setNotice({ type: 'error', text: 'Role changes remain protected, but the activity log could not be loaded. Check deployed Firestore rules.' });
  }), []);

  const totals = useMemo(() => accounts.reduce((result, account) => {
    result[account.role] = (result[account.role] || 0) + 1;
    return result;
  }, {}), [accounts]);

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
      setNewUid('');
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
      <UserAccountsManager currentUid={currentUid} roleAssignments={accounts} />
      <section className="admin-editor-card" aria-label="Role assignment">
        <header className="admin-editor-header">
          <div>
            <h2 className="admin-editor-title">Role-Based Access Control</h2>
            <p className="admin-header-desc">Grant access only to verified, existing Firebase Authentication UIDs.</p>
          </div>
        </header>
        {notice && <p role={notice.type === 'error' ? 'alert' : 'status'}
          className={`admin-notice ${notice.type}`}>{notice.text}</p>}
        <form className="admin-editor-form" onSubmit={event => {
          event.preventDefault();
          void assignRole(newUid, newRole);
        }}>
          <div className="admin-form-grid">
            <div className="admin-field-wrap">
              <label className="admin-label" htmlFor="role-target-uid">Existing Firebase user UID</label>
              <input id="role-target-uid" className="admin-input" value={newUid} onChange={e => setNewUid(e.target.value)}
                placeholder="Paste exact Firebase Authentication UID" required maxLength={128} autoComplete="off" />
            </div>
            <div className="admin-field-wrap">
              <label className="admin-label" htmlFor="role-target-role">Assign role</label>
              <select id="role-target-role" className="admin-input" value={newRole}
                onChange={e => setNewRole(e.target.value)}>
                {ASSIGNABLE_ROLES.map(role => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
              </select>
            </div>
          </div>
          <div className="admin-editor-footer">
            <button type="submit" className="admin-btn-primary" disabled={busyUid !== null}>
              {busyUid === newUid.trim() ? 'Saving...' : 'Assign Role'}
            </button>
          </div>
        </form>
        <p className="admin-help-text">
          Super Admin roles can only be created or transferred through a trusted Firebase console/Admin SDK.
          Assigning a role does not create a login. Never grant access based on an unverified UID.
        </p>
      </section>
      <section className="admin-table-card" aria-label="Console access list">
        <div className="admin-editor-header">
          <div>
            <h2 className="admin-editor-title">Authorized Accounts ({accounts.length})</h2>
            <p className="admin-header-desc">Live role records. Super Admin accounts are protected against client-side changes.</p>
          </div>
        </div>
        {loading ? <p className="admin-state-msg" role="status">Loading role assignments...</p>
          : accounts.length === 0 ? <p className="admin-state-msg">No role records available.</p>
          : <div className="admin-list-container">
            {accounts.map(account => {
              const locked = account.uid === currentUid || account.role === 'super_admin';
              const selection = selectedRoles[account.uid] || (ASSIGNABLE_ROLES.includes(account.role) ? account.role : 'auditor');
              const busy = busyUid !== null;
              return (
                <article className="admin-row" key={account.uid}>
                  <div className="admin-row-main">
                    <div className="admin-row-details">
                      <h3 className="admin-row-title">{account.uid === currentUid ? 'Your account' : 'Firebase UID'}</h3>
                      <p className="admin-row-snippet" style={{ overflowWrap: 'anywhere' }}>{account.uid}</p>
                      <div className="admin-row-meta">
                        <span>{ROLE_LABELS[account.role] || 'Unknown role'}</span>
                        {account.updatedBy && <span>Last changed by {account.updatedBy}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="admin-row-actions">
                    {locked ? <span className="admin-status-badge published">Protected</span> : (
                      <>
                        <label className="admin-label" htmlFor={`role-select-${account.uid}`}>Role</label>
                        <select id={`role-select-${account.uid}`} className="admin-select"
                          value={selection} disabled={busy}
                          onChange={e => setSelectedRoles(old => ({ ...old, [account.uid]: e.target.value }))}>
                          {ASSIGNABLE_ROLES.map(role => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
                        </select>
                        <button type="button" className="admin-btn-secondary" disabled={busy || selection === account.role}
                          onClick={() => void assignRole(account.uid, selection)}>Save Role</button>
                        <button type="button" className="admin-btn-ghost-danger" disabled={busy}
                          onClick={() => void revokeRole(account)}>Revoke</button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>}
        <p className="admin-help-text">Assigned: {Object.entries(totals).map(([role, count]) =>
          (ROLE_LABELS[role] || role) + ' ' + count).join(' · ') || 'none'}</p>
      </section>
      <section className="admin-table-card" aria-label="Recent role activity">
        <div className="admin-editor-header">
          <div><h2 className="admin-editor-title">Recent Role Activity</h2>
            <p className="admin-header-desc">Last 25 recorded console changes. Older records remain in Firestore.</p></div>
        </div>
        {recentActivity.length === 0 ? <p className="admin-state-msg">No role changes have been recorded.</p> :
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
