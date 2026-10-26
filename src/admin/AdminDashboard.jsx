import React, { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import ContentManager from './ContentManager';
import AnalyticsDashboard from './AnalyticsDashboard';
import RoleManager from './RoleManager';
import { hasPermission, ROLE_LABELS } from '../lib/rbac.mjs';
import './Admin.css';
import './AdminFrontendTheme.css';

const sections = [
  {
    id: 'analytics',
    label: 'Analytics',
    description: 'Content statistics & publishing',
    icon: (
      <svg className="admin-nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 3v18h18M7 16v-5m5 5V6m5 10v-8" />
      </svg>
    ),
  },
  {
    id: 'news',
    label: 'News',
    description: 'Articles & announcements',
    icon: (
      <svg className="admin-nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1m2 13a2 2 0 0 1-2-2V7m2 13a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2m-4-3H9M7 16h6M7 8h6m-6 4h4" />
      </svg>
    ),
  },
  {
    id: 'events',
    label: 'Events',
    description: 'Calendar & occasions',
    icon: (
      <svg className="admin-nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
      <svg className="admin-nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
    icon: (
      <svg className="admin-nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M4 8l6 2 2 6-4 4M17 5l-3 5 2 5 5 1" />
      </svg>
    ),
  },
  {
    id: 'leadership',
    label: 'Leadership',
    description: 'Senior administration',
    icon: (
      <svg className="admin-nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="7" r="4" />
        <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
      </svg>
    ),
  },
  {
    id: 'pages',
    label: 'Website Pages',
    description: 'Published pages & search descriptions',
    icon: (
      <svg className="admin-nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 2h9l5 5v15H6z" />
        <path d="M15 2v6h5M9 14h8M9 18h6" />
      </svg>
    ),
  },
  {
    id: 'pastPapers', label: 'Past Papers', description: 'Examination PDFs & Drive uploads',
    icon: <svg className="admin-nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2h9l5 5v15H6z"/><path d="M15 2v6h5M9 14h8M9 18h6"/></svg>,
  },

];

const roleSection = {
  id: 'users',
  label: 'Users & Roles',
  description: 'Manage console roles for existing Firebase accounts',
  icon: (
    <svg className="admin-nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="8" cy="8" r="3" /><circle cx="17" cy="9" r="2" />
      <path d="M2 20v-2a6 6 0 0 1 12 0v2M15 15a5 5 0 0 1 7 5" />
    </svg>
  ),
};

export default function AdminDashboard({ user, role }) {
  const [section, setSection] = useState('news');
  const [editorDirty, setEditorDirty] = useState(false);

  function changeSection(next) {
    if (section === next) return;
    if (editorDirty && !window.confirm('Discard unsaved changes and switch sections?')) return;
    setEditorDirty(false);
    setSection(next);
  }

  const visibleSections = hasPermission(role, 'users.manage') ? [...sections, roleSection] : sections;
  const selectedSection = visibleSections.some(item => item.id === section) ? section : 'news';
  const currentSection = visibleSections.find((s) => s.id === selectedSection);

  return (
    <main className="admin-body">
      <div className="admin-layout-wrapper">
        {/* Sidebar */}
        <aside className="admin-sidebar">
          <div className="admin-sidebar-header">
            <div className="admin-brand-wrap">
              <div className="admin-logo-mark">B</div>
              <div>
                <span className="admin-brand-title">BCG Admin</span>
                <span className="admin-brand-sub">Console</span>
              </div>
            </div>
          </div>

          <div className="admin-sidebar-nav-container">
            <div className="admin-sidebar-section-label">Navigation</div>
            <nav aria-label="Admin content sections" className="admin-sidebar-nav">
              {visibleSections.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => changeSection(item.id)}
                  aria-pressed={selectedSection === item.id}
                  className={`admin-nav-item ${selectedSection === item.id ? 'active' : ''}`}
                >
                  <span className="admin-nav-icon">{item.icon}</span>
                  <div className="admin-nav-text">
                    <span className="admin-nav-label">{item.label}</span>
                    <span className="admin-nav-desc">{item.description}</span>
                  </div>
                </button>
              ))}
            </nav>
          </div>

          <div className="admin-sidebar-footer">
            <div className="admin-user-info">
              <span className="admin-user-email">{user?.email} · {ROLE_LABELS[role] || 'No role'}</span>
            </div>
            <button
              type="button"
              onClick={() => signOut(auth)}
              className="admin-btn-ghost-danger"
              title="Sign Out"
            >
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main Content Workspace */}
        <div className="admin-main-area">
          <header className="admin-header">
            <div>
              <h1 className="admin-header-title">{currentSection?.label}</h1>
              <p className="admin-header-desc">{currentSection?.description}</p>
            </div>
            <div className="admin-header-actions">
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="admin-btn-secondary"
              >
                <span>View Website</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            </div>
          </header>

          <div className="admin-content-area">
            {selectedSection === 'users'
              ? <RoleManager currentUid={user?.uid} />
              : selectedSection === 'analytics'
                ? <AnalyticsDashboard userId={user?.uid} />
                : <ContentManager key={selectedSection + ':' + role} kind={selectedSection} role={role} onDirtyChange={setEditorDirty} />}
          </div>
        </div>
      </div>
    </main>
  );
}