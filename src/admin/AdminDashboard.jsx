import React, { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import ContentManager from './ContentManager';
import './AdminTheme.css';

const sections = [
  { id: 'news', label: 'News', description: 'Articles & announcements' },
  { id: 'events', label: 'Events', description: 'Calendar & occasions' },
  { id: 'pages', label: 'Pages', description: 'Website content' },
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
                <button
                  key={item.id}
                  type="button"
                  onClick={() => changeSection(item.id)}
                  aria-pressed={section === item.id}
                  className="admin-nav-link"
                >
                  <span className="admin-nav-index" aria-hidden="true">0{index + 1}</span>
                  <span>
                    <span className="admin-nav-title">{item.label}</span>
                    <span className="admin-nav-meta">{item.description}</span>
                  </span>
                </button>
              ))}
            </nav>
          </div>

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
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="admin-secondary-button"
              >View website <span aria-hidden="true">↗</span></a>
              <button type="button" onClick={() => signOut(auth)} className="admin-primary-button">
                Sign out
              </button>
            </div>
          </header>

          <div className="admin-page-content">
            <div className="admin-crumb" aria-label="Current section">
              <span>Content management</span>
              <span aria-hidden="true">/</span>
              <span className="admin-crumb-current">{currentSection.label}</span>
            </div>
            <ContentManager key={section} kind={section} onDirtyChange={setEditorDirty} />
            <footer className="admin-footer">BCG.LK • Bandaranayake College Gampaha • Administration</footer>
          </div>
        </div>
      </div>
    </main>
  );
}
