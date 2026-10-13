import React, { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import NewsManager from './NewsManager';

export default function AdminDashboard({ user }) {
 const [section,setSection]=useState('News');
 return <main className="min-h-screen bg-[#0a0a0a] text-white p-6 md:p-8">
  <header className="flex flex-wrap justify-between items-center gap-4 border-b border-[#C9A84C] pb-6"><div><h1 className="text-3xl text-[#C9A84C] font-bold">BCG.LK Admin Dashboard</h1><p>{user.email}</p></div><button onClick={()=>signOut(auth)} className="border border-[#C9A84C] rounded px-4 py-2">Sign out</button></header>
  <nav aria-label="Content sections" className="flex flex-wrap gap-3 mt-8">{['News','Events','Pages'].map(name=><button key={name} onClick={()=>setSection(name)} aria-pressed={section===name} className={`rounded-lg border border-[#C9A84C] px-6 py-3 ${section===name?'bg-[#7B1C1C]':''}`}>{name}</button>)}</nav>
  {section==='News'?<NewsManager/>:<p className="mt-8 text-white/70">{section} management is coming next.</p>}
 </main>;
}
