import React, { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import ContentManager from './ContentManager';
import './Admin.css';

const sections = [
  {
    id: 'news',
    label: 'News',
    description: 'Articles & announcements',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1m2 13a2 2 0 0 1-2-2V7m2 13a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2m-4-3H9M7 16h6M7 8h6m-6 4h4" />
      </svg>
    ),
  },
  {
    id: 'events',
    label: 'Events',
    description: 'Calendar & occasions',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    id: 'societies',
    label: 'Societies',
    description: 'Clubs & student societies',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="8" cy="8" r="3" />
        <circle cx="17" cy="9" r="2" />
        <path d="M2 20v-2a6 6 0 0 1 12 0v2M15 15a5 5 0 0 1 7 5" />
      </svg>
    ),
  },
  {
    id: 'sports',
    label: 'Sports',
    description: 'Teams & achievements',
    icon: (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M4 8l6 2 2 6-4 4M17 5l-3 5 2 5 5 1" /></svg>),
  },
  {
    id: 'extracurricular',
    label: 'Extracurricular',
    description: 'Activities & programmes',
    icon: (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 4h18v16H3zM7 9h10M7 13h8M7 17h6" /></svg>),
  },
  {
    id: 'leadership',
    label: 'Leadership',
    description: 'Senior school administration',
    icon: (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="7" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></svg>),
  },
  {
    id: 'pages',
    label: 'Pages',
    description: 'Website content',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
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
    <main className="admin-body">
      <div className="admin-layout-wrapper">
        {/* Sidebar */}
        <aside className="admin-sidebar">
          <div className="admin-sidebar-header">
            <div className="flex items-center gap-3">
              <div className="admin-logo-box !h-10 !w-10 !text-xl">B</div>
              <div>
                <p className="admin-logo-text text-base font-extrabold text-[#C9A84C]">BCG.LK</p>
                <p className="admin-subtitle text-[10px] font-semibold text-white/45 uppercase tracking-widest">
                  Admin Console
                </p>
              </div>
            </div>
            <span className="admin-badge-published">Admin</span>
          </div>

          <div className="px-4 py-4 lg:flex-1 lg:py-6">
            <p className="admin-subtitle mb-3 hidden px-3 text-[10px] font-semibold uppercase tracking-widest text-white/35 lg:block">
              Content Sections
            </p>
            <nav aria-label="Admin content sections" className="flex gap-2 overflow-x-auto lg:flex-col">
              {sections.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => changeSection(item.id)}
                  aria-pressed={section === item.id}
                  className={`admin-nav-item ${section === item.id ? 'active' : ''}`}
                >
                  <span className="admin-nav-icon">{item.icon}</span>
                  <span>
                    <span className="block text-sm font-semibold">{item.label}</span>
                    <span className="hidden text-xs text-white/40 lg:block">{item.description}</span>
                  </span>
                </button>
              ))}
            </nav>
          </div>

          <div className="hidden border-t border-white/10 px-6 py-5 lg:block">
            <p className="admin-subtitle text-[10px] font-semibold uppercase tracking-widest text-white/35">
              Signed in as
            </p>
            <p className="mt-1 break-all text-xs font-medium text-white/75">{user?.email}</p>
          </div>
        </aside>

        {/* Main Header & Content */}
        <div className="min-w-0 flex-1">
          <header className="admin-header">
            <div>
              <p className="admin-subtitle text-xs font-semibold uppercase tracking-widest text-[#C9A84C]">
                Dashboard
              </p>
              <h1 className="admin-title text-xl font-bold text-white sm:text-2xl">
                {sections.find((s) => s.id === section)?.label} Overview
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="admin-btn-secondary"
              >
                View Website ↗
              </a>
              <button
                type="button"
                onClick={() => signOut(auth)}
                className="admin-btn-danger"
              >
                Sign Out
              </button>
            </div>
          </header>

          <div className="admin-content-area">
            <ContentManager key={section} kind={section} onDirtyChange={setEditorDirty} />
          </div>
        </div>
      </div>
    </main>
  );
}