import React, { useState } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export default function AdminLogin({ onAuthorized }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function login(event) {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const admin = await getDoc(doc(db, 'admins', credential.user.uid));
      if (!admin.exists() || admin.data()?.role !== 'admin') {
        await signOut(auth);
        throw new Error('This account is not authorized as an administrator.');
      }
      onAuthorized(credential.user);
    } catch (err) {
      setError(err.message || 'Unable to sign in.');
    } finally { setBusy(false); }
  }
  return <main className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-6">
    <form onSubmit={login} className="w-full max-w-md rounded-xl border border-[#C9A84C]/40 p-8 space-y-5">
      <h1 className="text-3xl font-bold text-[#C9A84C]">BCG.LK Admin</h1>
      <label className="block">Email<input type="email" required autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 w-full rounded bg-white text-black p-3" /></label>
      <label className="block">Password<input type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 w-full rounded bg-white text-black p-3" /></label>
      {error && <p role="alert" className="text-red-300">{error}</p>}
      <button disabled={busy} className="w-full rounded bg-[#C9A84C] p-3 text-black font-bold disabled:opacity-50">{busy ? 'Signing in...' : 'Sign in'}</button>
    </form>
  </main>;
}
