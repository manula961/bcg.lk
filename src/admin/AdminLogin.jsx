import React, { useState } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Firebase request timed out. Check the browser Network tab and your Firebase configuration.')), ms))
  ]);
}
export default function AdminLogin({ onAuthorized }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function login(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try {
      const credential = await withTimeout(signInWithEmailAndPassword(auth, email, password), 15000);
      const admin = await withTimeout(getDoc(doc(db, 'admins', credential.user.uid)), 12000);
      if (!admin.exists() || admin.data()?.role !== 'admin') {
        throw new Error('This account is not authorized as an administrator. Check admins/{uid} in Firestore.');
      }
      onAuthorized(credential.user);
    } catch (err) {
      setError(err?.code ? `${err.code}: ${err.message}` : (err?.message || 'Unable to sign in.'));
      await signOut(auth).catch(() => {});
    } finally { setBusy(false); }
  }
  return <main className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-6">
    <form onSubmit={login} className="w-full max-w-md rounded-xl border border-[#C9A84C]/40 p-8 space-y-5">
      <h1 className="text-3xl font-bold text-[#C9A84C]">BCG.LK Admin</h1>
      <label className="block">Email<input type="email" required autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 w-full rounded bg-white text-black p-3" /></label>
      <label className="block">Password<input type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 w-full rounded bg-white text-black p-3" /></label>
      {error && <p role="alert" className="text-red-300 break-words">{error}</p>}
      <button disabled={busy} className="w-full rounded bg-[#C9A84C] p-3 text-black font-bold disabled:opacity-50">{busy ? 'Signing in...' : 'Sign in'}</button>
    </form>
  </main>;
}
