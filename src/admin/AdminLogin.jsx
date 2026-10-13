import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import './Admin.css';

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
        'auth/too-many-requests': 'Too many attempts. Wait before trying again.',
        'auth/network-request-failed': 'Network error. Check your connection and retry.',
        'auth/operation-not-allowed': 'Email/password sign-in is disabled in Firebase Authentication.',
      };
      setError(messages[err?.code] || err?.message || 'Unable to sign in.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="admin-center-screen">
      <div className="admin-glow-maroon" />
      <div className="admin-glow-gold" />

      <form onSubmit={login} className="admin-card-glass relative z-10 space-y-6">
        <div className="text-center space-y-2">
          <div className="admin-logo-box mx-auto mb-2">B</div>
          <h1 className="admin-title text-2xl font-extrabold text-white">BCG.LK Admin</h1>
          <p className="admin-subtitle text-xs font-semibold tracking-widest text-[#C9A84C] uppercase">
            Sign in to access console
          </p>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="admin-input-label">Email Address</span>
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@bcg.lk"
              className="admin-input"
            />
          </label>

          <label className="block">
            <span className="admin-input-label">Password</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="admin-input"
            />
          </label>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-950/30 p-3 text-xs text-red-200">
            {error}
          </div>
        )}

        <button type="submit" disabled={busy} className="admin-btn-primary w-full py-3.5">
          {busy ? 'Signing in...' : 'Sign In to Admin Console'}
        </button>
      </form>
    </main>
  );
}