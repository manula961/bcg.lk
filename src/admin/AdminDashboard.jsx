import React, { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import ContentManager from './ContentManager';

const sections = [
  { id: 'news', label: 'News', initial: 'N', description: 'Articles & announcements' },
  { id: 'events', label: 'Events', initial: 'E', description: 'Calendar & occasions' },
  { id: 'pages', label: 'Pages', initial: 'P', description: 'Website content' },
];

export default function AdminDashboard({ user }) {
  const [section, setSection] = useState('news');
  const [editorDirty, setEditorDirty] = useState(false);

  function changeSection(next) {
    if (section === next) return;
    if (editorDirty && !window.confirm('Discard unsaved changes and switch sections?')) return;
    setEditorDirty(false);
    setSection(next);
  }

  return (
    <main className="min-h-screen bg-[#090a0c] text-white">
      <div className="mx-auto max-w-[1700px] lg:flex">
        <aside className="border-b border-white/10 bg-[#101115] lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-[270px] lg:shrink-0 lg:flex-col lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between px-6 py-6 lg:border-b lg:border-white/10 lg:py-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#C9A84C]/40 bg-[#7B1C1C] text-2xl font-black text-[#F0D78C]">B</div>
              <div>
                <p className="text-xl font-extrabold tracking-wider text-[#C9A84C]">BCG.LK</p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">Admin Console</p>
              </div>
            </div>
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">Admin</span>
          </div>
          <div className="px-4 pb-4 lg:flex-1 lg:py-7">
            <p className="mb-3 hidden px-3 text-[11px] font-semibold uppercase tracking-[0.23em] text-white/35 lg:block">Content</p>
            <nav aria-label="Admin content sections" className="flex gap-2 overflow-x-auto lg:flex-col">
              {sections.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => changeSection(item.id)}
                  aria-pressed={section === item.id}
                  className={'flex min-w-fit items-center gap-3 rounded-xl px-4 py-3 text-left transition lg:w-full ' +
                    (section === item.id
                      ? 'border border-[#C9A84C]/30 bg-[#7B1C1C]/35 text-[#F0D78C]'
                      : 'border border-transparent text-white/65 hover:bg-white/5 hover:text-white')}
                >
                  <span aria-hidden="true" className={'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ' +
                    (section === item.id ? 'bg-[#C9A84C]/20' : 'bg-white/5')}>{item.initial}</span>
                  <span>
                    <span className="block text-sm font-semibold">{item.label}</span>
                    <span className="hidden text-xs text-white/40 lg:block">{item.description}</span>
                  </span>
                </button>
              ))}
            </nav>
          </div>
          <div className="hidden border-t border-white/10 px-6 py-6 lg:block">
            <p className="text-xs font-semibold uppercase tracking-[0.17em] text-white/35">Signed in as</p>
            <p className="mt-2 break-all text-sm text-white/75">{user.email}</p>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 bg-[#0d0f13] px-5 py-5 sm:px-8 lg:px-10 lg:py-7">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A84C]">Administration</p>
              <h1 className="mt-1 text-xl font-bold text-white sm:text-2xl">Content Dashboard</h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <a href="/" target="_blank" rel="noopener noreferrer" className="rounded-lg border border-white/20 px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:border-[#C9A84C]/60 hover:text-white">
                View website ↗
              </a>
              <button type="button" onClick={() => signOut(auth)}
                className="rounded-lg border border-[#C9A84C]/50 px-4 py-2.5 text-sm font-semibold text-[#F0D78C] transition hover:bg-[#7B1C1C]/30">
                Sign out
              </button>
            </div>
          </header>
          <div className="px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
            <ContentManager key={section} kind={section} onDirtyChange={setEditorDirty} />
          </div>
        </div>
      </div>
    </main>
  );
}
