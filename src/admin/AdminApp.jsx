import React, { useCallback, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDocFromServer } from 'firebase/firestore';
import { auth, db, firebaseConfigured } from '../lib/firebase';
import AdminLogin from './AdminLogin';
import AdminDashboard from './AdminDashboard';

const CHECK_TIMEOUT_MS = 12000;

export default function AdminApp() {
  const [session, setSession] = useState({ status: 'checking', user: null, message: '' });
  const currentUser = useRef(null);
  const checkId = useRef(0);
  const mounted = useRef(false);

  const verifyAdmin = useCallback(async (user) => {
    const id = ++checkId.current;
    currentUser.current = user;
    if (!user) {
      if (mounted.current) setSession({ status: 'signedOut', user: null, message: '' });
      return;
    }
    setSession({ status: 'checking', user: null, message: '' });
    let timeout;
    try {
      const record = await Promise.race([
        getDocFromServer(doc(db, 'admins', user.uid)),
        new Promise((_, reject) => {
          timeout = setTimeout(() => reject(new Error('Administrator verification timed out. Check your connection and try again.')), CHECK_TIMEOUT_MS);
        }),
      ]);
      if (!mounted.current || id !== checkId.current) return;
      if (record.exists() && record.data()?.role === 'admin') {
        setSession({ status: 'authorized', user, message: '' });
      } else {
        setSession({ status: 'denied', user: null, message: 'This account is not an administrator. Confirm that admins/<your Firebase UID> exists with role set to admin.' });
      }
    } catch (error) {
      if (!mounted.current || id !== checkId.current) return;
      setSession({
        status: 'error', user: null,
        message: error?.code === 'permission-denied'
          ? 'Firestore denied access to your admin record. Check the deployed Firestore rules.'
          : (error?.message || 'Could not verify administrator access.'),
      });
    } finally {
      clearTimeout(timeout);
    }
  }, []);

  useEffect(() => {
    if (!firebaseConfigured || !auth || !db) return;
    mounted.current = true;
    const unsubscribe = onAuthStateChanged(auth, verifyAdmin, error => {
      if (mounted.current) setSession({ status: 'error', user: null, message: error?.message || 'Unable to restore your session.' });
    });
    return () => {
      mounted.current = false;
      ++checkId.current;
      unsubscribe();
    };
  }, [verifyAdmin]);

  if (!firebaseConfigured || !auth || !db) {
    return <main className="min-h-screen bg-black text-white p-8" role="alert">Firebase web configuration is incomplete. Check all six VITE_FIREBASE_* variables in Vercel and redeploy.</main>;
  }
  if (session.status === 'checking') {
    return <main className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-6"><p role="status">Checking administrator access…</p></main>;
  }
  if (session.status === 'authorized') return <AdminDashboard user={session.user} />;
  if (session.status === 'denied' || session.status === 'error') {
    return <main className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-6">
      <section className="w-full max-w-md rounded-xl border border-[#C9A84C]/40 p-8 space-y-4">
        <h1 className="text-2xl font-bold text-[#C9A84C]">Administrator access</h1>
        <p role="alert" className="text-red-200">{session.message}</p>
        <button className="rounded bg-[#C9A84C] px-4 py-2 text-black font-semibold" onClick={() => verifyAdmin(auth.currentUser)}>Retry verification</button>
        <button className="ml-3 rounded border border-white/40 px-4 py-2" onClick={() => signOut(auth)}>Sign out</button>
      </section>
    </main>;
  }
  return <AdminLogin />;
}
