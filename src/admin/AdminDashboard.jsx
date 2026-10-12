import React from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

export default function AdminDashboard({ user }) {
  return <main className="min-h-screen bg-[#0a0a0a] text-white p-8">
    <header className="flex flex-wrap justify-between items-center gap-4 border-b border-[#C9A84C] pb-6">
      <div><h1 className="text-3xl text-[#C9A84C] font-bold">BCG.LK Admin Dashboard</h1><p>{user.email}</p></div>
      <button onClick={()=>signOut(auth)} className="border border-[#C9A84C] rounded px-4 py-2">Sign out</button>
    </header>
    <section className="mt-10 grid gap-4 md:grid-cols-3">
      {['News','Events','Pages'].map(name=><article key={name} className="rounded-xl border border-white/20 p-6"><h2 className="text-xl text-[#C9A84C]">{name}</h2><p className="mt-2 text-white/70">Content management coming next.</p></article>)}
    </section>
  </main>;
}
