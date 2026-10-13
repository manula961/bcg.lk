import React, { useCallback, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDocFromServer } from 'firebase/firestore';
import { auth, db, firebaseConfigured } from '../lib/firebase';
import AdminLogin from './AdminLogin';
import AdminDashboard from './AdminDashboard';
import './AdminTheme.css';

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
    return <main className="bcg-admin admin-auth" role="alert"><section className="admin-login-card"><p className="admin-eyebrow">Configuration required</p><h1 className="admin-display admin-auth-title">ADMIN CONSOLE</h1><p className="admin-auth-hint">Firebase web configuration is incomplete. Check all six VITE_FIREBASE_* variables in Vercel and redeploy.</p></section></main>;
  }
  if (session.status === 'checking') {
    return <main className="bcg-admin admin-auth"><section className="admin-login-card" role="status"><p className="admin-eyebrow">Secure administrator access</p><h1 className="admin-display admin-auth-title">VERIFYING ACCESS</h1><div className="admin-divider" aria-hidden="true"><span /><span /></div><p className="admin-auth-hint mt-5">Checking administrator access…</p></section></main>;
  }
  if (session.status === 'authorized') return <AdminDashboard user={session.user} />;
  if (session.status === 'denied' || session.status === 'error') {
    return <main className="bcg-admin admin-auth">
      <section className="admin-login-card">
        <p className="admin-eyebrow">Account verification</p>
        <h1 className="admin-display admin-auth-title">ADMIN ACCESS</h1>
        <div className="admin-divider" aria-hidden="true"><span /><span /></div>
        <p role="alert" className="mt-5 text-sm leading-7 text-red-200">{session.message}</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <button type="button" className="admin-primary-button" onClick={() => verifyAdmin(auth.currentUser)}>Retry verification</button>
          <button type="button" className="admin-secondary-button" onClick={() => signOut(auth)}>Sign out</button>
        </div>
      </section>
    </main>;
  }
  return <AdminLogin />;
}
