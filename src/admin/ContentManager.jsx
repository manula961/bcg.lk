import React, { useEffect, useMemo, useState } from 'react';
import {
  subscribeAdminNews, createNews, updateNews, deleteNews,
} from '../lib/newsService';
import {
  subscribeAdminEvents, createEvent, updateEvent, deleteEvent,
} from '../lib/eventsService';
import {
  subscribeAdminPages, createPage, updatePage, deletePage,
} from '../lib/pagesService';
import {
  subscribeAdminSocieties, createSociety, updateSociety, deleteSociety,
} from '../lib/societiesService';
import {
  subscribeAdminSports, createSport, updateSport, deleteSport,
} from '../lib/sportsService';
import {
  subscribeAdminExtracurricular, createActivity, updateActivity, deleteActivity,
} from '../lib/extracurricularService';
import {
  subscribeAdminLeadership, createLeader, updateLeader, deleteLeader,
} from '../lib/leadershipService';
import './Admin.css';

const collections = {
  news: {
    title: 'News & Announcements',
    singular: 'article',
    description: 'Write announcements, keep drafts, and manage published articles.',
    subscribe: subscribeAdminNews, create: createNews, update: updateNews, remove: deleteNews,
    defaults: { title: '', category: 'News', tag: '', excerpt: '', body: '', imageUrl: '', published: false },
    fields: [
      { key: 'title', label: 'Article title', required: true, maxLength: 180, placeholder: 'Enter headline', wide: true },
      { key: 'category', label: 'Category', type: 'select', options: ['News', 'Announcements'] },
      { key: 'tag', label: 'Topic / tag', maxLength: 80, placeholder: 'e.g. Sports' },
      { key: 'excerpt', label: 'Short summary', type: 'textarea', rows: 3, maxLength: 500, required: true, wide: true },
      { key: 'body', label: 'Full article', type: 'textarea', rows: 9, maxLength: 30000, wide: true },
      { key: 'imageUrl', label: 'Cover image URL', type: 'url', maxLength: 2048, placeholder: 'https://example.com/image.jpg', wide: true },
    ],
  },
  events: {
    title: 'College Events',
    singular: 'event',
    description: 'Manage dates, venues, and event details.',
    subscribe: subscribeAdminEvents, create: createEvent, update: updateEvent, remove: deleteEvent,
    defaults: { title: '', eventDate: '', location: '', description: '', imageUrl: '', published: false },
    fields: [
      { key: 'title', label: 'Event title', required: true, maxLength: 180, wide: true, placeholder: 'Enter event name' },
      { key: 'eventDate', label: 'Event date', type: 'date', required: true },
      { key: 'location', label: 'Location / venue', required: true, maxLength: 200, placeholder: 'e.g. Main Hall, BCG' },
      { key: 'description', label: 'Event description', type: 'textarea', rows: 6, maxLength: 3000, required: true, wide: true },
      { key: 'imageUrl', label: 'Event image URL', type: 'url', maxLength: 2048, placeholder: 'https://example.com/photo.jpg', wide: true },
    ],
  },
  societies: {
    title: 'College Societies',
    singular: 'society',
    description: 'Add society names, descriptions and logo URLs.',
    subscribe: subscribeAdminSocieties, create: createSociety, update: updateSociety, remove: deleteSociety,
    defaults: { title: '', category: '', description: '', imageUrl: '', websiteUrl: '', published: false },
    fields: [
      { key: 'title', label: 'Society name', required: true, maxLength: 180, wide: true, placeholder: 'e.g. Computer Society' },
      { key: 'category', label: 'Category', maxLength: 80, placeholder: 'e.g. Science & Technology' },
      { key: 'description', label: 'Description', required: true, type: 'textarea', rows: 5, maxLength: 1200, wide: true },
      { key: 'imageUrl', label: 'Society logo URL', type: 'url', maxLength: 2048, wide: true, placeholder: 'https://example.com/society-logo.png' },
      { key: 'websiteUrl', label: 'Society website or social link', type: 'url', maxLength: 2048, wide: true, placeholder: 'https://example.com' },
    ],
  },
  sports: {
    title: 'College Sports',
    singular: 'sport',
    description: 'Manage school sports, teams and achievements.',
    subscribe: subscribeAdminSports, create: createSport, update: updateSport, remove: deleteSport,
    defaults: { title: '', category: '', description: '', achievements: '', imageUrl: '', published: false },
    fields: [
      { key: 'title', label: 'Sport or team name', required: true, maxLength: 180, wide: true, placeholder: 'e.g. Cricket' },
      { key: 'category', label: 'Category', maxLength: 80, placeholder: 'e.g. Team Sports' },
      { key: 'description', label: 'Description', required: true, type: 'textarea', rows: 5, maxLength: 3000, wide: true },
      { key: 'achievements', label: 'Achievements', type: 'textarea', rows: 4, maxLength: 2000, wide: true },
      { key: 'imageUrl', label: 'Photo URL', type: 'url', maxLength: 2048, wide: true, placeholder: 'https://example.com/photo.jpg' },
    ],
  },
  extracurricular: {
    title: 'Extracurricular Activities',
    singular: 'activity',
    description: 'Manage activities and programmes outside the classroom.',
    subscribe: subscribeAdminExtracurricular, create: createActivity, update: updateActivity, remove: deleteActivity,
    defaults: { title: '', category: '', description: '', imageUrl: '', published: false },
    fields: [
      { key: 'title', label: 'Activity name', required: true, maxLength: 180, wide: true, placeholder: 'e.g. Community Service' },
      { key: 'category', label: 'Category', maxLength: 80, placeholder: 'e.g. Cadets and Service' },
      { key: 'description', label: 'Description', required: true, type: 'textarea', rows: 5, maxLength: 3000, wide: true },
      { key: 'imageUrl', label: 'Activity image URL', type: 'url', maxLength: 2048, wide: true, placeholder: 'https://example.com/photo.jpg' },
    ],
  },
  leadership: {
    title: 'School Leadership',
    singular: 'leader',
    description: 'Manage verified senior administrative staff and display order.',
    subscribe: subscribeAdminLeadership, create: createLeader, update: updateLeader, remove: deleteLeader,
    defaults: { title: '', role: 'Principal', rank: '1', description: '', imageUrl: '', published: false },
    fields: [
      { key: 'title', label: 'Staff member name', required: true, maxLength: 180, wide: true, placeholder: 'Enter full name' },
      { key: 'role', label: 'Position', type: 'select', options: ['Principal', 'Deputy Principal', 'Assistant Principal', 'Sectional Head', 'Other Senior Staff'] },
      { key: 'rank', label: 'Display order', type: 'select', options: Array.from({ length: 20 }, (_, i) => String(i + 1)) },
      { key: 'description', label: 'Profile / responsibilities', type: 'textarea', rows: 5, maxLength: 1200, wide: true },
      { key: 'imageUrl', label: 'Official portrait URL', type: 'url', maxLength: 2048, wide: true, placeholder: 'https://example.com/portrait.jpg' },
    ],
  },
  pages: {
    title: 'Website Pages',
    singular: 'page',
    description: 'Prepare page content and search descriptions.',
    subscribe: subscribeAdminPages, create: createPage, update: updatePage, remove: deletePage,
    defaults: { title: '', slug: '', seoDescription: '', body: '', imageUrl: '', published: false },
    fields: [
      { key: 'title', label: 'Page title', required: true, maxLength: 180, wide: true, placeholder: 'Enter page title' },
      { key: 'slug', label: 'Page slug', required: true, maxLength: 120, placeholder: 'about-college', help: 'Lowercase letters, numbers and hyphens only.' },
      { key: 'seoDescription', label: 'Search description', type: 'textarea', rows: 3, maxLength: 320, wide: true },
      { key: 'body', label: 'Page body', type: 'textarea', rows: 10, maxLength: 50000, required: true, wide: true },
      { key: 'imageUrl', label: 'Page image URL', type: 'url', maxLength: 2048, placeholder: 'https://example.com/image.jpg', wide: true },
    ],
  },
};

function displayDate(record) {
  const timestamp = record.updatedAt || record.createdAt;
  if (!timestamp || typeof timestamp.toDate !== 'function') return 'Not available';
  try {
    return timestamp.toDate().toLocaleDateString('en-US', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch {
    return 'Not available';
  }
}

function getSnippet(item, kind) {
  if (kind === 'news') return item.excerpt || '';
  if (['events', 'societies', 'sports', 'extracurricular', 'leadership'].includes(kind)) return item.description || '';
  return item.seoDescription || item.slug || '';
}

function copyRecord(item, defaults) {
  const result = { ...defaults };
  Object.keys(result).forEach(key => {
    if (Object.prototype.hasOwnProperty.call(item, key)) result[key] = item[key];
  });
  return result;
}

function formatError(error) {
  const message = error && typeof error.message === 'string' ? error.message : '';
  if (error?.code === 'permission-denied') {
    return 'Firestore denied this action. Check admin role permissions.';
  }
  return message || 'Something went wrong. Please try again.';
}

export default function ContentManager({ kind, onDirtyChange }) {
  const config = collections[kind];
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(() => ({ ...config.defaults }));
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionId, setActionId] = useState(null);

  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};
    setLoading(true);
    setLoadError('');
    try {
      unsubscribe = config.subscribe(
        results => {
          if (!active) return;
          setItems(results);
          setLoadError('');
          setLoading(false);
        },
        error => {
          if (!active) return;
          setLoadError(formatError(error));
          setLoading(false);
        },
      );
    } catch (error) {
      if (active) {
        setLoadError(formatError(error));
        setLoading(false);
      }
    }
    return () => {
      active = false;
      unsubscribe();
    };
  }, [config]);

  const totals = useMemo(() => ({
    all: items.length,
    published: items.filter(item => item.published === true).length,
    drafts: items.filter(item => item.published !== true).length,
  }), [items]);

  const visible = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return items.filter(item => {
      if (status === 'published' && item.published !== true) return false;
      if (status === 'drafts' && item.published === true) return false;
      if (!term) return true;
      return [
        item.title, item.slug, item.category, item.location, item.eventDate,
        item.excerpt, item.description, item.websiteUrl, item.role, item.achievements,
      ].some(value => typeof value === 'string' && value.toLocaleLowerCase().includes(term));
    });
  }, [items, search, status]);

  function openNew() {
    setForm({ ...config.defaults });
    setEditingId(null);
    setDirty(false);
    setNotice(null);
    setEditorOpen(true);
  }

  function openExisting(item) {
    setForm(copyRecord(item, config.defaults));
    setEditingId(item.id);
    setDirty(false);
    setNotice(null);
    setEditorOpen(true);
  }

  function leaveEditor() {
    if (busy) return;
    if (dirty && !window.confirm('Discard unsaved changes?')) return;
    setEditorOpen(false);
    setEditingId(null);
    setDirty(false);
  }

  function updateField(key, value) {
    setForm(previous => ({ ...previous, [key]: value }));
    setDirty(true);
  }

  async function save(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const payload = { ...form };
      if (kind === 'events') {
        const itemIndex = editingId
          ? items.findIndex((i) => i.id === editingId)
          : items.length;
        const itemNumber = itemIndex >= 0 ? itemIndex + 1 : 1;
        payload.color = itemNumber % 2 !== 0 ? '#7B1C1C' : '#1a3a6b';
      }
      if (editingId) {
        await config.update(editingId, payload);
      } else {
        await config.create(payload);
      }
      setDirty(false);
      setEditorOpen(false);
      setEditingId(null);
      setNotice({
        type: 'success',
        text: 'Saved successfully.',
      });
    } catch (error) {
      setNotice({ type: 'error', text: formatError(error) });
    } finally {
      setBusy(false);
    }
  }

  async function togglePublished(item) {
    if (actionId !== null) return;
    setActionId(item.id);
    setNotice(null);
    try {
      const next = item.published !== true;
      await config.update(item.id, { published: next });
      setNotice({ type: 'success', text: next ? 'Published live.' : 'Moved to drafts.' });
    } catch (error) {
      setNotice({ type: 'error', text: formatError(error) });
    } finally {
      setActionId(null);
    }
  }

  async function remove(item) {
    if (actionId !== null) return;
    if (!window.confirm('Permanently delete "' + (item.title || 'item') + '"?')) return;
    setActionId(item.id);
    setNotice(null);
    try {
      await config.remove(item.id);
      setNotice({ type: 'success', text: 'Deleted successfully.' });
    } catch (error) {
      setNotice({ type: 'error', text: formatError(error) });
    } finally {
      setActionId(null);
    }
  }

  const slugSuggestion = form.title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);

  return (
    <div className="admin-cm-wrap">
      {notice && (
        <div
          role={notice.type === 'error' ? 'alert' : 'status'}
          className={`admin-notice ${notice.type}`}
        >
          {notice.text}
        </div>
      )}

      {!editorOpen ? (
        <>
          {/* Action Row */}
          <div className="admin-toolbar-row">
            <div className="admin-search-wrap">
              <svg className="admin-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${kind}...`}
                className="admin-search-input"
              />
            </div>

            <div className="admin-filter-wrap">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="admin-select"
              >
                <option value="all">All status ({totals.all})</option>
                <option value="published">Published ({totals.published})</option>
                <option value="drafts">Drafts ({totals.drafts})</option>
              </select>

              <button type="button" onClick={openNew} className="admin-btn-primary">
                + New {config.singular}
              </button>
            </div>
          </div>

          {/* List Content */}
          <div className="admin-table-card">
            {loadError ? (
              <p role="alert" className="admin-state-msg error">{loadError}</p>
            ) : loading ? (
              <p className="admin-state-msg">Loading content...</p>
            ) : visible.length === 0 ? (
              <div className="admin-empty-state">
                <p className="admin-empty-title">No records found</p>
                <p className="admin-empty-sub">
                  {items.length ? 'Try adjusting your search query or status filter.' : `Create your first ${config.singular} to get started.`}
                </p>
                {!items.length && (
                  <button type="button" onClick={openNew} className="admin-btn-primary">
                    Create {config.singular}
                  </button>
                )}
              </div>
            ) : (
              <div className="admin-list-container">
                {visible.map((item, index) => {
                  return (
                    <article key={item.id} className="admin-row">
                      <div className="admin-row-main">
                        <div className="admin-thumb">
                          {item.imageUrl && item.imageUrl.startsWith('https://') ? (
                            <img src={item.imageUrl} alt="" loading="lazy" />
                          ) : (
                            <span>{(item.title || 'U').charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="admin-row-details">
                          <h3 className="admin-row-title">{item.title || 'Untitled'}</h3>
                          <p className="admin-row-snippet">{getSnippet(item, kind) || 'No text summary.'}</p>
                          <div className="admin-row-meta">
                            <span>Updated {displayDate(item)}</span>
                            {item.eventDate && <span> • Date: {item.eventDate}</span>}
                            {item.category && <span> • {item.category}</span>}
                            {item.slug && <span> • /{item.slug}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="admin-row-actions">
                        <span className={`admin-status-badge ${item.published ? 'published' : 'draft'}`}>
                          <span className="admin-status-dot" />
                          {item.published ? 'Published' : 'Draft'}
                        </span>

                        <button
                          type="button"
                          disabled={actionId !== null}
                          onClick={() => openExisting(item)}
                          className="admin-btn-ghost"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          disabled={actionId !== null}
                          onClick={() => togglePublished(item)}
                          className="admin-btn-ghost"
                        >
                          {actionId === item.id ? '...' : item.published ? 'Unpublish' : 'Publish'}
                        </button>

                        <button
                          type="button"
                          disabled={actionId !== null}
                          onClick={() => remove(item)}
                          className="admin-btn-ghost-danger"
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        /* Form Editor */
        <div className="admin-editor-card">
          <div className="admin-editor-header">
            <h2 className="admin-editor-title">
              {editingId ? `Edit ${config.singular}` : `New ${config.singular}`}
            </h2>
            <button type="button" onClick={leaveEditor} disabled={busy} className="admin-btn-ghost">
              Cancel
            </button>
          </div>

          <form onSubmit={save} className="admin-editor-form">
            <div className="admin-form-grid">
              {config.fields.map((field) => (
                <div key={field.key} className={`admin-field-wrap ${field.wide ? 'wide' : ''}`}>
                  <label className="admin-label">
                    {field.label}
                    {field.required && <span className="admin-required">*</span>}
                  </label>

                  {field.type === 'textarea' ? (
                    <textarea
                      rows={field.rows || 4}
                      value={form[field.key] ?? ''}
                      onChange={(e) => updateField(field.key, e.target.value)}
                      required={Boolean(field.required)}
                      maxLength={field.maxLength}
                      className="admin-input textarea"
                      placeholder={field.placeholder}
                    />
                  ) : field.type === 'select' ? (
                    <select
                      value={form[field.key] ?? ''}
                      onChange={(e) => updateField(field.key, e.target.value)}
                      className="admin-input"
                    >
                      {field.options.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type || 'text'}
                      value={form[field.key] ?? ''}
                      onChange={(e) => updateField(field.key, e.target.value)}
                      required={Boolean(field.required)}
                      maxLength={field.maxLength}
                      disabled={field.key === 'slug' && Boolean(editingId)}
                      pattern={field.key === 'slug' ? '[a-z0-9]+(-[a-z0-9]+)*' : undefined}
                      className="admin-input"
                      placeholder={field.placeholder}
                    />
                  )}

                  {field.help && <span className="admin-help-text">{field.help}</span>}
                  {kind === 'pages' && field.key === 'slug' && !editingId && (
                    <button
                      type="button"
                      disabled={!slugSuggestion}
                      onClick={() => updateField('slug', slugSuggestion)}
                      className="admin-slug-btn"
                    >
                      Generate slug from title
                    </button>
                  )}
                </div>
              ))}
            </div>

            {form.imageUrl && /^https:\/\//i.test(form.imageUrl) && (
              <div className="admin-preview-box">
                <span className="admin-label">Image Preview</span>
                <img src={form.imageUrl} alt="Preview" className="admin-preview-img" />
              </div>
            )}

            <div className="admin-publish-row">
              <div>
                <span className="admin-publish-title">Publishing Status</span>
                <p className="admin-publish-desc">
                  {form.published
                    ? 'Visible live on the public website.'
                    : 'Saved as draft (hidden from public website).'}
                </p>
              </div>
              <label className="admin-toggle-label">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => updateField('published', e.target.checked)}
                  className="admin-toggle-input"
                />
                <span>Published</span>
              </label>
            </div>

            <div className="admin-editor-footer">
              <button type="button" onClick={leaveEditor} disabled={busy} className="admin-btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={busy} className="admin-btn-primary">
                {busy ? 'Saving...' : editingId ? 'Save Changes' : `Create ${config.singular}`}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}