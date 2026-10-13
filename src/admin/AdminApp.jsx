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
    let revision = 0;
    let initialTimer = setTimeout(() => {
      if (active) {
        setChecking(false);
        setError('Firebase did not finish checking your session. Check connectivity and reload.');
      }
    }, 15000);
    const unsubscribe = onAuthStateChanged(auth, async next => {
      const current = ++revision;
      if (!active) return;
      if (!next) {
        clearTimeout(initialTimer);
        setUser(null);
        setChecking(false);
        return;
      }
      setChecking(true);
      setError('');
      try {
        const admin = await Promise.race([
          getDoc(doc(db, 'admins', next.uid)),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore admin check timed out.')), 12000))
        ]);
        if (!active || current !== revision) return;
        if (admin.exists() && admin.data()?.role === 'admin') {
          setUser(next);
        } else {
          setUser(null);
          setError('Access denied: your account needs an admins/{UID} document with role "admin".');
          await signOut(auth);
        }
      } catch (err) {
        if (!active || current !== revision) return;
        setUser(null);
        setError(err?.code ? `${err.code}: ${err.message}` : (err?.message || 'Unable to verify administrator access.'));
        await signOut(auth).catch(() => {});
      } finally {
        if (active && current === revision) {
          clearTimeout(initialTimer);
          setChecking(false);
        }
      }
    }, err => {
      if (!active) return;
      clearTimeout(initialTimer);
      setUser(null);
      setError(err?.message || 'Firebase session error.');
      setChecking(false);
    });
    return () => { active = false; clearTimeout(initialTimer); unsubscribe(); };
  }, []);
  if (!firebaseConfigured) return <main className="min-h-screen bg-black text-white p-8">Firebase configuration is missing. Check Vercel environment variables and redeploy.</main>;
  if (checking) return <main className="min-h-screen bg-black text-white p-8">Checking administrator access...</main>;
  return <>{error && <p role="alert" className="bg-red-950 text-white p-4">{error}</p>}{user ? <AdminDashboard user={user} /> : <AdminLogin />}</>;
}
