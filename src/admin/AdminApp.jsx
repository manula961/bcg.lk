import React, { useCallback, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDocFromServer } from 'firebase/firestore';
import { auth, db, firebaseConfigured } from '../lib/firebase';
import AdminLogin from './AdminLogin';
import AdminDashboard from './AdminDashboard';
import './Admin.css';

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
          timeout = setTimeout(
            () => reject(new Error('Administrator verification timed out. Check your connection and try again.')),
            CHECK_TIMEOUT_MS
          );
        }),
      ]);

      if (!mounted.current || id !== checkId.current) return;

      if (record.exists() && record.data()?.role === 'admin') {
        setSession({ status: 'authorized', user, message: '' });
      } else {
        setSession({
          status: 'denied',
          user: null,
          message: 'This account is not an administrator. Confirm that admins/<your Firebase UID> exists with role set to admin.',
        });
      }
    } catch (error) {
      if (!mounted.current || id !== checkId.current) return;
      setSession({
        status: 'error',
        user: null,
        message:
          error?.code === 'permission-denied'
            ? 'Firestore denied access to your admin record. Check the deployed Firestore rules.'
            : error?.message || 'Could not verify administrator access.',
      });
    } finally {
      clearTimeout(timeout);
    }
  }, []);

  useEffect(() => {
    if (!firebaseConfigured || !auth || !db) return;
    mounted.current = true;
    const unsubscribe = onAuthStateChanged(auth, verifyAdmin, (error) => {
      if (mounted.current)
        setSession({ status: 'error', user: null, message: error?.message || 'Unable to restore your session.' });
    });
    return () => {
      mounted.current = false;
      ++checkId.current;
      unsubscribe();
    };
  }, [verifyAdmin]);

  if (!firebaseConfigured || !auth || !db) {
    return (
      <main className="admin-center-screen" role="alert">
        <div className="admin-card-glass border-red-500/30">
          <h1 className="text-lg font-bold text-red-400 mb-2">Firebase Configuration Incomplete</h1>
          <p className="text-xs text-white/70 leading-relaxed">
            Firebase web configuration is incomplete. Check all six VITE_FIREBASE_* variables in Vercel and redeploy.
          </p>
        </div>
      </main>
    );
  }

  if (session.status === 'checking') {
    return (
      <main className="admin-center-screen">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full border-2 border-[#C9A84C]/20 border-t-[#C9A84C] animate-spin" />
          <p role="status" className="admin-subtitle text-xs font-semibold tracking-widest text-[#C9A84C] uppercase">
            Verifying Administrator Access...
          </p>
        </div>
      </main>
    );
  }

  if (session.status === 'authorized') return <AdminDashboard user={session.user} />;

  if (session.status === 'denied' || session.status === 'error') {
    return (
      <main className="admin-center-screen">
        <section className="admin-card-glass space-y-5">
          <h1 className="admin-title text-xl font-bold text-[#C9A84C]">Access Restricted</h1>
          <p role="alert" className="text-xs leading-relaxed text-red-200">
            {session.message}
          </p>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              className="admin-btn-primary flex-1"
              onClick={() => verifyAdmin(auth.currentUser)}
            >
              Retry
            </button>
            <button
              type="button"
              className="admin-btn-secondary"
              onClick={() => signOut(auth)}
            >
              Sign Out
            </button>
          </div>
        </section>
      </main>
    );
  }

  return <AdminLogin />;
}