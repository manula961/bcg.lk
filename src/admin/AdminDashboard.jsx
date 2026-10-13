import React, { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import ContentManager from './ContentManager';
<<<<<<< HEAD
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
=======
import './AdminTheme.css';

const sections = [
  { id: 'news', label: 'News', description: 'Articles & announcements' },
  { id: 'events', label: 'Events', description: 'Calendar & occasions' },
  { id: 'pages', label: 'Pages', description: 'Website content' },
>>>>>>> 7880c7a301272083bd90d03d453042a7db221c8e
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

  const currentSection = sections.find(item => item.id === section);

  return (
<<<<<<< HEAD
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
=======
    <main className="bcg-admin">
      <div className="admin-layout">
        <aside className="admin-sidebar" aria-label="Admin sidebar">
          <a className="admin-brand" href="/" target="_blank" rel="noopener noreferrer" aria-label="BCG.LK public website">
            <span className="admin-brand-mark" aria-hidden="true">B</span>
            <span>
              <span className="admin-brand-name">BCG.LK</span>
              <span className="admin-brand-caption">Nayakenz Admin</span>
            </span>
          </a>

          <div className="admin-sidebar-body">
            <p className="admin-eyebrow admin-nav-caption">Manage Content</p>
            <nav className="admin-nav" aria-label="Admin content sections">
              {sections.map((item, index) => (
>>>>>>> 7880c7a301272083bd90d03d453042a7db221c8e
                <button
                  key={item.id}
                  type="button"
                  onClick={() => changeSection(item.id)}
                  aria-pressed={section === item.id}
<<<<<<< HEAD
                  className={`admin-nav-item ${section === item.id ? 'active' : ''}`}
                >
                  <span className="admin-nav-icon">{item.icon}</span>
=======
                  className="admin-nav-link"
                >
                  <span className="admin-nav-index" aria-hidden="true">0{index + 1}</span>
>>>>>>> 7880c7a301272083bd90d03d453042a7db221c8e
                  <span>
                    <span className="admin-nav-title">{item.label}</span>
                    <span className="admin-nav-meta">{item.description}</span>
                  </span>
                </button>
              ))}
            </nav>
          </div>

<<<<<<< HEAD
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
=======
          <div className="admin-account">
            <p className="admin-eyebrow">Signed in as</p>
            <p className="admin-account-email">{user.email}</p>
          </div>
        </aside>

        <div className="admin-workspace">
          <header className="admin-topbar">
            <div>
              <p className="admin-eyebrow">Bandaranayake College • Gampaha</p>
              <h1 className="admin-display admin-main-heading">ADMIN CONSOLE</h1>
              <div className="admin-divider" aria-hidden="true"><span /><span /></div>
            </div>
            <div className="admin-header-actions">
>>>>>>> 7880c7a301272083bd90d03d453042a7db221c8e
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
<<<<<<< HEAD
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
=======
                className="admin-secondary-button"
              >View website <span aria-hidden="true">↗</span></a>
              <button type="button" onClick={() => signOut(auth)} className="admin-primary-button">
                Sign out
>>>>>>> 7880c7a301272083bd90d03d453042a7db221c8e
              </button>
            </div>
          </header>

<<<<<<< HEAD
          <div className="admin-content-area">
=======
          <div className="admin-page-content">
            <div className="admin-crumb" aria-label="Current section">
              <span>Content management</span>
              <span aria-hidden="true">/</span>
              <span className="admin-crumb-current">{currentSection.label}</span>
            </div>
>>>>>>> 7880c7a301272083bd90d03d453042a7db221c8e
            <ContentManager key={section} kind={section} onDirtyChange={setEditorDirty} />
            <footer className="admin-footer">BCG.LK • Bandaranayake College Gampaha • Administration</footer>
          </div>
        </div>
      </div>
    </main>
  );
}