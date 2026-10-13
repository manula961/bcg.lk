import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import './AdminTheme.css';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function login(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // AdminApp owns session restoration and authorization.
    } catch (err) {
      const messages = {
        'auth/invalid-credential': 'Email or password is incorrect.',
        'auth/too-many-requests': 'Too many attempts. Wait before trying again.',
        'auth/network-request-failed': 'Network error. Check your connection and retry.',
        'auth/operation-not-allowed': 'Email/password sign-in is disabled in Firebase Authentication.',
      };
      setError(messages[err?.code] || err?.message || 'Unable to sign in.');
    } finally { setBusy(false); }
  }
  return (
    <main className="bcg-admin admin-auth">
      <div className="admin-login-card">
        <div className="admin-login-mark" aria-hidden="true">B</div>
        <p className="admin-eyebrow">Bandaranayake College • Gampaha</p>
        <h1 className="admin-display admin-auth-title">ADMIN CONSOLE</h1>
        <div className="admin-divider" aria-hidden="true"><span /><span /></div>
        <p className="admin-auth-hint mt-5">
          Secure content administration. Sign in using your authorized college administrator account.
        </p>

        <form onSubmit={login} className="mt-8 space-y-5">
          <label className="block">
            <span className="admin-field-label">Email address</span>
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="admin-input mt-2"
              placeholder="name@school.lk"
            />
          </label>
          <label className="block">
            <span className="admin-field-label">Password</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="admin-input mt-2"
              placeholder="Enter your password"
            />
          </label>
          {error && <p role="alert" className="break-words text-sm text-red-300">{error}</p>}
          <button type="submit" disabled={busy} className="admin-primary-button w-full">
            {busy ? 'Signing in…' : 'Sign in to dashboard'}
          </button>
        </form>
        <p className="admin-footer">BCG.LK • Official Administration</p>
      </div>
    </main>
  );
}
