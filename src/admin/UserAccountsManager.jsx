import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { auth } from '../lib/firebase';
import { ROLE_LABELS, ASSIGNABLE_ROLES } from '../lib/rbac.mjs';

/**
 * Account lifecycle is always handled by /api/admin/users on the server.
 * This component never creates service credentials or stores passwords.
 * Role grant/revocation controls also call the privileged server API.
 */
export default function UserAccountsManager({ currentUid, roleAssignments = [], onAssignRole, onRevokeRole, roleBusy = false }) {
  const [users, setUsers] = useState([]);
  const [nextPage, setNextPage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [createForm, setCreateForm] = useState({ email: '', displayName: '', role: 'editor' });
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [roleChoices, setRoleChoices] = useState({});
  const roleByUid = useMemo(() => Object.fromEntries(
    roleAssignments.map(account => [account.uid, account.role])
  ), [roleAssignments]);

  const callApi = useCallback(async (body, pageToken = '') => {
    const user = auth.currentUser;
    if (!user || user.uid !== currentUid) throw new Error('Your admin session changed. Sign in again.');
    const token = await user.getIdToken();
    const url = '/api/admin/users' + (body === null && pageToken
      ? '?pageToken=' + encodeURIComponent(pageToken) : '');
    const res = await fetch(url, {
      method: body === null ? 'GET' : 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        ...(body === null ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(body === null ? {} : { body: JSON.stringify(body) }),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || 'User management could not be reached.');
    // Local Vite fallback can return HTTP 200 with index.html instead of a
    // Vercel API JSON response. Never let that malformed payload crash React.
    if (!data || typeof data !== 'object' ||
        (body === null && !(Array.isArray(data.users) ||
          (data.user && typeof data.user.uid === 'string')))) {
      throw new Error('Firebase user-management API is unavailable. Use a configured Vercel deployment.');
    }
    return data;
  }, [currentUid]);

  const load = useCallback(async (more = false, token = '') => {
    setLoading(true);
    try {
      const data = await callApi(null, token);
      setUsers(previous => more ? [...previous, ...data.users] : data.users);
      setNextPage(data.nextPageToken || null);
      setNotice(null);
    } catch (error) {
      setNotice({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  }, [callApi]);

  useEffect(() => { void load(); }, [load]);

  async function execute(body) {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const result = await callApi(body);
      setNotice({ type: result.emailWarning ? 'error' : 'success', text: result.message });
      setEditing(null);
      if (body.action === 'create') setCreateForm({ email: '', displayName: '', role: 'editor' });
      // Reload from Firebase Auth to show the resulting account state.
      const list = await callApi(null);
      setUsers(list.users);
      setNextPage(list.nextPageToken || null);
    } catch (error) {
      setNotice({ type: 'error', text: error.message });
    } finally {
      setBusy(false);
    }
  }

  function changeStatus(user, action) {
    if (user.uid === currentUid || roleByUid[user.uid] === 'super_admin') return;
    const messages = {
      disable: 'Disable this login and revoke its console role? Re-enabling will require a new role assignment.',
      enable: 'Enable this Firebase login? You must assign a console role separately.',
      reset: 'Send a password-reset email to ' + user.email + '?',
      delete: 'Permanently delete this Firebase Authentication account? This cannot be undone.',
    };
    if (!window.confirm(messages[action])) return;
    if (action === 'delete') {
      const entered = window.prompt('Type the exact email address to confirm permanent deletion:');
      if (entered !== user.email) return;
      void execute({ action, uid: user.uid, confirmEmail: entered });
    } else {
      void execute({ action, uid: user.uid });
    }
  }

  const filtered = users.filter(user => {
    const value = search.toLowerCase().trim();
    return !value || [user.email, user.displayName, user.uid].some(item =>
      (item || '').toLowerCase().includes(value)
    );
  });

  return (
    <>
      <section className="admin-editor-card admin-users-create" aria-label="Create staff account">
        <header className="admin-editor-header">
          <div>
            <h2 className="admin-editor-title">Add Staff Account</h2>
            <p className="admin-header-desc">Create a login and automatically assign its access role.</p>
          </div>
        </header>
        {notice && <p className={'admin-notice ' + notice.type}
          role={notice.type === 'error' ? 'alert' : 'status'}>{notice.text}</p>}
        <form className="admin-editor-form admin-users-create-form" onSubmit={event => {
          event.preventDefault();
          if (window.confirm('Create the login for ' + createForm.email + ' with ' +
            ROLE_LABELS[createForm.role] + ' access?')) void execute({ action: 'create', ...createForm });
        }}>
          <div className="admin-form-grid">
            <div className="admin-field-wrap">
              <label className="admin-label" htmlFor="new-user-email">New account email</label>
              <input id="new-user-email" className="admin-input" type="email" autoComplete="off"
                value={createForm.email} maxLength={254} required
                onChange={event => setCreateForm(old => ({ ...old, email: event.target.value }))}/>
            </div>
            <div className="admin-field-wrap">
              <label className="admin-label" htmlFor="new-user-name">Display name</label>
              <input id="new-user-name" className="admin-input" value={createForm.displayName}
                maxLength={120} onChange={event => setCreateForm(old => ({ ...old, displayName: event.target.value }))}/>
            </div>
            <div className="admin-field-wrap">
              <label className="admin-label" htmlFor="new-user-role">Initial access role</label>
              <select id="new-user-role" className="admin-select" value={createForm.role}
                onChange={event => setCreateForm(old => ({ ...old, role: event.target.value }))}>
                {ASSIGNABLE_ROLES.map(role => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
              </select>
            </div>
          </div>
          <p className="admin-help-text admin-users-help">A password setup email will be sent. Super Admin access is managed separately by a trusted Firebase owner.</p>
          <div className="admin-editor-footer">
            <button type="submit" className="admin-btn-primary" disabled={busy}>
              {busy ? 'Working...' : 'Add User'}
            </button>
          </div>
        </form>
      </section>
      <section className="admin-table-card admin-users-list" aria-label="Firebase Authentication users">
        <header className="admin-editor-header">
          <div>
            <h2 className="admin-editor-title">Manage Users ({users.length})</h2>
            <p className="admin-header-desc">
              Manage user accounts and roles together. Account creation automatically assigns the selected role.
            </p>
          </div>
          <button type="button" className="admin-btn-secondary" disabled={busy || loading}
            onClick={() => void load()}>Refresh</button>
        </header>
        <div className="admin-filter-wrap admin-user-search">
          <label className="admin-label" htmlFor="auth-user-search">Search users</label>
          <input id="auth-user-search" className="admin-input" value={search}
            placeholder="Email, name or UID" onChange={event => setSearch(event.target.value)}/>
        </div>
        {loading && <p className="admin-state-msg" role="status">Loading Firebase users...</p>}
        {!loading && filtered.length === 0 &&
          <p className="admin-state-msg">No matching accounts in the loaded page.</p>}
        <div className="admin-list-container">
          {filtered.map(user => {
            const protectedUser = user.uid === currentUid || roleByUid[user.uid] === 'super_admin';
            const activeRole = roleByUid[user.uid];
            const chosenRole = roleChoices[user.uid] || (ASSIGNABLE_ROLES.includes(activeRole) ? activeRole : 'editor');
            return (
              <article className="admin-row" key={user.uid}>
                <div className="admin-row-main">
                  <div className="admin-row-details">
                    <h3 className="admin-row-title">{user.displayName || user.email || user.uid}</h3>
                    <p className="admin-row-snippet">{user.displayName && user.email ? user.email : 'Firebase UID: ' + user.uid}</p>
                    <p className="admin-row-meta">
                      {user.disabled ? 'Disabled' : 'Enabled'} · {ROLE_LABELS[activeRole] || 'No console role'}
                    </p>
                  </div>
                </div>
                {protectedUser ? <span className="admin-status-badge published">Protected</span> : (
                  <div className="admin-row-actions">
                    {!user.disabled && <div className="admin-user-role-actions">
                      <label className="admin-label" htmlFor={`role-user-${user.uid}`}>Access role</label>
                      <select id={`role-user-${user.uid}`} className="admin-select" value={chosenRole}
                        disabled={busy || roleBusy}
                        onChange={event => setRoleChoices(previous => ({ ...previous, [user.uid]: event.target.value }))}>
                        {ASSIGNABLE_ROLES.map(role => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
                      </select>
                      <button className="admin-btn-secondary" type="button"
                        disabled={busy || roleBusy || chosenRole === activeRole}
                        onClick={() => void onAssignRole(user.uid, chosenRole)}>Save Role</button>
                      {activeRole && <button className="admin-btn-ghost-danger" type="button"
                        disabled={busy || roleBusy}
                        onClick={() => void onRevokeRole({ uid: user.uid, role: activeRole })}>Revoke Role</button>}
                    </div>}
                    <button className="admin-btn-secondary" type="button" disabled={busy}
                      onClick={() => setEditing({ uid: user.uid, email: user.email, displayName: user.displayName })}>Edit</button>
                    <button className="admin-btn-secondary" type="button" disabled={busy}
                      onClick={() => changeStatus(user, 'reset')}>Reset Password</button>
                    <button className="admin-btn-secondary" type="button" disabled={busy}
                      onClick={() => changeStatus(user, user.disabled ? 'enable' : 'disable')}>
                      {user.disabled ? 'Enable' : 'Disable'}
                    </button>
                    <button className="admin-btn-ghost-danger" type="button" disabled={busy}
                      onClick={() => changeStatus(user, 'delete')}>Delete</button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
        {nextPage && <div className="admin-editor-footer">
          <button className="admin-btn-secondary" type="button" disabled={busy || loading}
            onClick={() => void load(true, nextPage)}>Load next 50 users</button>
        </div>}
      </section>
      {editing && (
        <section className="admin-editor-card" aria-label="Edit Firebase account">
          <header className="admin-editor-header">
            <h2 className="admin-editor-title">Edit Authentication User</h2>
          </header>
          <form className="admin-editor-form" onSubmit={event => {
            event.preventDefault();
            if (window.confirm('Update the Firebase account ' + editing.uid + '?'))
              void execute({ action: 'update', ...editing });
          }}>
            <div className="admin-form-grid">
              <div className="admin-field-wrap">
                <label className="admin-label" htmlFor="edit-auth-email">Email</label>
                <input id="edit-auth-email" className="admin-input" type="email" required
                  value={editing.email} onChange={event => setEditing(old => ({ ...old, email: event.target.value }))}/>
              </div>
              <div className="admin-field-wrap">
                <label className="admin-label" htmlFor="edit-auth-name">Display name</label>
                <input id="edit-auth-name" className="admin-input" value={editing.displayName}
                  maxLength={120} onChange={event => setEditing(old => ({ ...old, displayName: event.target.value }))}/>
              </div>
            </div>
            <div className="admin-editor-footer">
              <button className="admin-btn-primary" type="submit" disabled={busy}>Save User</button>
              <button className="admin-btn-secondary" type="button" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </form>
        </section>
      )}
    </>
  );
}
