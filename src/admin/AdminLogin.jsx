import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';

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
  return <main className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-6">
    <form onSubmit={login} className="w-full max-w-md rounded-xl border border-[#C9A84C]/40 p-8 space-y-5">
      <h1 className="text-3xl font-bold text-[#C9A84C]">BCG.LK Admin</h1>
      <label className="block">Email<input type="email" required autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} className="mt-2 w-full rounded bg-white text-black p-3" /></label>
      <label className="block">Password<input type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className="mt-2 w-full rounded bg-white text-black p-3" /></label>
      {error && <p role="alert" className="text-red-300 break-words">{error}</p>}
      <button type="submit" disabled={busy} className="w-full rounded bg-[#C9A84C] p-3 text-black font-bold disabled:opacity-50">{busy ? 'Signing in…' : 'Sign in'}</button>
    </form>
  </main>;
}
