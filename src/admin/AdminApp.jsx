import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, firebaseConfigured } from '../lib/firebase';
import AdminLogin from './AdminLogin';
import AdminDashboard from './AdminDashboard';

export default function AdminApp() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    if (!auth || !db) { setChecking(false); return; }
    return onAuthStateChanged(auth, async next => {
      setChecking(true);
      try {
        if (next) {
          const admin = await getDoc(doc(db, 'admins', next.uid));
          if (admin.exists() && admin.data()?.role === 'admin') setUser(next);
          else { setUser(null); await signOut(auth); }
        } else setUser(null);
      } catch { setUser(null); await signOut(auth).catch(()=>{}); }
      finally { setChecking(false); }
    });
  }, []);
  if (!firebaseConfigured) return <main className="p-8">Firebase is not configured. See FIREBASE_SETUP.md.</main>;
  if (checking) return <main className="p-8">Checking administrator access...</main>;
  return user ? <AdminDashboard user={user} /> : <AdminLogin onAuthorized={setUser} />;
}
