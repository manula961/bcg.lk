import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import './Admin.css';
import './AdminFrontendTheme.css';

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
    } catch (err) {
      const messages = {
        'auth/invalid-credential': 'Email or password is incorrect.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
        'auth/network-request-failed': 'Network error. Check your internet connection.',
        'auth/operation-not-allowed': 'Sign-in is disabled in Firebase Authentication.',
      };
      setError(messages[err?.code] || 'Unable to sign in. Please check your details and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="admin-center-screen">
      <form onSubmit={login} className="admin-login-card">
        <div className="admin-login-header">
          <div className="admin-logo-mark large">B</div>
          <h1 className="admin-login-title">BCG Admin Console</h1>
          <p className="admin-login-sub">Sign in to manage college content</p>
        </div>

        <div className="admin-login-fields">
          <div>
            <label className="admin-label" htmlFor="admin-login-email">Email Address</label>
            <input
              id="admin-login-email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@bcg.lk"
              className="admin-input"
            />
          </div>

          <div>
            <label className="admin-label" htmlFor="admin-login-password">Password</label>
            <input
              id="admin-login-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="admin-input"
            />
          </div>
        </div>

        {error && <div className="admin-notice error" role="alert">{error}</div>}

        <button type="submit" disabled={busy} className="admin-btn-primary wide">
          {busy ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </main>
  );
}