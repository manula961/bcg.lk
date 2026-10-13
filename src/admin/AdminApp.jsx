import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, firebaseConfigured } from '../lib/firebase';
import AdminLogin from './AdminLogin';
import AdminDashboard from './AdminDashboard';

export default function AdminApp() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!auth || !db) { setChecking(false); return; }
    let active = true;
    let sequence = 0;
    const timeout = setTimeout(() => {
      if (active) { setChecking(false); setError('Firebase authentication timed out. Check your network, Firebase configuration and authorized domain, then reload.'); }
    }, 12000);
    const unsubscribe = onAuthStateChanged(auth, async next => {
      const current = ++sequence;
      if (!active) return;
      setChecking(true);
      setError('');
      try {
        if (!next) { setUser(null); return; }
        const admin = await getDoc(doc(db, 'admins', next.uid));
        if (!active || current !== sequence) return;
        if (admin.exists() && admin.data()?.role === 'admin') setUser(next);
        else {
          setUser(null);
          setError('This account is not authorized as an administrator.');
          await signOut(auth);
        }
      } catch (err) {
        if (!active || current !== sequence) return;
        setUser(null);
        setError(err?.message || 'Administrator access check failed.');
        await signOut(auth).catch(() => {});
      } finally {
        if (active && current === sequence) { clearTimeout(timeout); setChecking(false); }
      }
    }, err => {
      if (!active) return;
      clearTimeout(timeout);
      setUser(null);
      setError(err?.message || 'Firebase authentication failed.');
      setChecking(false);
    });
    return () => { active = false; clearTimeout(timeout); unsubscribe(); };
  }, []);
  if (!firebaseConfigured) return <main className="min-h-screen bg-black text-white p-8">Firebase is not configured. Check Vercel environment variables and redeploy.</main>;
  if (checking) return <main className="min-h-screen bg-black text-white p-8">Checking administrator access...</main>;
  return <>{error && <p role="alert" className="bg-red-950 text-white p-4">{error}</p>}{user ? <AdminDashboard user={user} /> : <AdminLogin onAuthorized={setUser} />}</>;
}
