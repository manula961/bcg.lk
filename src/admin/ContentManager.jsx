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
import { cloudinaryUploadConfigured, uploadAdminImage } from '../lib/cloudinaryUpload';
import { getDriveStatus, connectDrive, disconnectDrive, uploadDriveImage } from '../lib/googleDriveUpload';
import './Admin.css';

const collections = {
  news: {
    title: 'News & Announcements',
    singular: 'article',
    description: 'Write announcements, keep drafts, and manage published articles.',
    subscribe: subscribeAdminNews, create: createNews, update: updateNews, remove: deleteNews,
    defaults: { title: '', category: 'News', tag: '', excerpt: '', body: '', imageUrl: '', published: false },
    fields: [
      { key: 'title', label: 'Article title', required: true, maxLength: 180, placeholder: 'Enter the headline', wide: true },
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
    description: 'Manage dates, venues, and event details. Event accent colors are auto-assigned (odd: red, even: blue).',
    subscribe: subscribeAdminEvents, create: createEvent, update: updateEvent, remove: deleteEvent,
    defaults: { title: '', eventDate: '', location: '', description: '', imageUrl: '', published: false },
    fields: [
      { key: 'title', label: 'Event title', required: true, maxLength: 180, wide: true, placeholder: 'Enter the event name' },
      { key: 'eventDate', label: 'Event date', type: 'date', required: true },
      { key: 'location', label: 'Location / venue', required: true, maxLength: 200, placeholder: 'e.g. Main Hall, BCG' },
      { key: 'description', label: 'Event description', type: 'textarea', rows: 7, maxLength: 3000, required: true, wide: true },
      { key: 'imageUrl', label: 'Event image URL', type: 'url', maxLength: 2048, placeholder: 'https://example.com/photo.jpg', wide: true },
    ],
  },
  societies: {
    title: 'College Societies',
    singular: 'society',
    description: 'Add society names, descriptions and logo URLs, then publish them on the Societies page.',
    subscribe: subscribeAdminSocieties, create: createSociety, update: updateSociety, remove: deleteSociety,
    defaults: { title: '', category: '', description: '', imageUrl: '', websiteUrl: '', published: false },
    fields: [
      { key: 'title', label: 'Society name', required: true, maxLength: 180, wide: true, placeholder: 'e.g. Computer Society' },
      { key: 'category', label: 'Category', maxLength: 80, placeholder: 'e.g. Science & Technology' },
      { key: 'description', label: 'Description', required: true, type: 'textarea', rows: 5, maxLength: 1200, wide: true },
      { key: 'imageUrl', label: 'Society logo URL', type: 'url', maxLength: 2048, wide: true, placeholder: 'https://example.com/society-logo.png', help: 'Paste an HTTPS image URL. The existing preview shows the logo before publishing.' },
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
      { key: 'description', label: 'Description', required: true, type: 'textarea', rows: 6, maxLength: 3000, wide: true },
      { key: 'imageUrl', label: 'Activity image URL', type: 'url', maxLength: 2048, wide: true, placeholder: 'https://example.com/photo.jpg' },
    ],
  },
  leadership: {
    title: 'School Leadership',
    singular: 'leader',
    description: 'Manage verified senior administrative staff and their display order. Do not publish unconfirmed appointments.',
    subscribe: subscribeAdminLeadership, create: createLeader, update: updateLeader, remove: deleteLeader,
    defaults: { title: '', role: 'Principal', rank: '1', description: '', imageUrl: '', published: false },
    fields: [
      { key: 'title', label: 'Staff member name', required: true, maxLength: 180, wide: true, placeholder: 'Enter the verified full name' },
      { key: 'role', label: 'Position', type: 'select', options: ['Principal', 'Deputy Principal', 'Assistant Principal', 'Sectional Head', 'Other Senior Staff'] },
      { key: 'rank', label: 'Display order (1 first)', type: 'select', options: Array.from({ length: 20 }, (_, i) => String(i + 1)) },
      { key: 'description', label: 'Profile / responsibilities', type: 'textarea', rows: 5, maxLength: 1200, wide: true },
      { key: 'imageUrl', label: 'Official portrait URL', type: 'url', maxLength: 2048, wide: true, placeholder: 'https://example.com/portrait.jpg' },
    ],
  },
  pages: {
    title: 'Website Pages',
    singular: 'page',
    description: 'Prepare page content and search descriptions for public-site integrations.',
    subscribe: subscribeAdminPages, create: createPage, update: updatePage, remove: deletePage,
    defaults: { title: '', slug: '', seoDescription: '', body: '', imageUrl: '', published: false },
    fields: [
      { key: 'title', label: 'Page title', required: true, maxLength: 180, wide: true, placeholder: 'Enter the page title' },
      { key: 'slug', label: 'Page slug', required: true, maxLength: 120, placeholder: 'about-college',
        help: 'Lowercase letters, numbers and hyphens only. Cannot be changed later.' },
      { key: 'seoDescription', label: 'Search description', type: 'textarea', rows: 3, maxLength: 320, wide: true },
      { key: 'body', label: 'Page body', type: 'textarea', rows: 12, maxLength: 50000, required: true, wide: true,
        help: 'Plain text content. Publishing does not automatically create a public website route.' },
      { key: 'imageUrl', label: 'Page image URL', type: 'url', maxLength: 2048, placeholder: 'https://example.com/image.jpg', wide: true },
    ],
  },
};

function displayDate(record) {
  const timestamp = record.updatedAt || record.createdAt;
  if (!timestamp || typeof timestamp.toDate !== 'function') return 'Not available';
  try {
    return timestamp.toDate().toLocaleDateString(undefined, {
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
    return 'Firestore denied this action. Confirm that your account has the admin role and the deployed Firestore rules are correct.';
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
  const [uploadingImage, setUploadingImage] = useState(false);
  const [drive, setDrive] = useState({ configured: false, connected: false });

  useEffect(() => {
    let active = true;
    getDriveStatus().then(status => { if (active) setDrive(status); }).catch(() => {});
    return () => { active = false; };
  }, []);

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
    if (busy || uploadingImage) return;
    if (dirty && !window.confirm('Discard your unsaved changes?')) return;
    setEditorOpen(false);
    setEditingId(null);
    setDirty(false);
  }

  function updateField(key, value) {
    setForm(previous => ({ ...previous, [key]: value }));
    setDirty(true);
  }

  async function handleImageUpload(event) {
    const file = event.target.files?.[0];
    // Permit selecting the same file again if an upload fails.
    event.target.value = '';
    if (!file || uploadingImage) return;
    setUploadingImage(true);
    setNotice(null);
    try {
      const url = await uploadAdminImage(file);
      updateField('imageUrl', url);
      setNotice({ type: 'success', text: 'Image uploaded. Save this record to keep the new image URL.' });
    } catch (error) {
      setNotice({ type: 'error', text: formatError(error) });
    } finally {
      setUploadingImage(false);
    }
  }

  async function startDriveConnection() {
    if (dirty && !window.confirm('Connecting Google Drive reloads the editor. Continue without saving changes?')) return;
    setNotice(null);
    try { await connectDrive(); }
    catch (error) { setNotice({ type: 'error', text: formatError(error) }); }
  }

  async function handleDriveUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || busy || uploadingImage) return;
    setUploadingImage(true);
    setNotice(null);
    try {
      const url = await uploadDriveImage(file);
      updateField('imageUrl', url);
      setNotice({ type: 'success', text: 'Uploaded to Google Drive. Save this record to keep the image URL. Confirm that the image preview loads.' });
    } catch (error) {
      setNotice({ type: 'error', text: formatError(error) });
    } finally { setUploadingImage(false); }
  }

  async function stopDriveConnection() {
    if (uploadingImage) return;
    try {
      await disconnectDrive();
      setDrive(previous => ({ ...previous, connected: false }));
      setNotice({ type: 'success', text: 'Google Drive disconnected in this browser.' });
    } catch (error) { setNotice({ type: 'error', text: formatError(error) }); }
  }

  async function save(event) {
    event.preventDefault();
    if (busy || uploadingImage) return;
    setBusy(true);
    setNotice(null);

    try {
      const payload = { ...form };

      // Automatic event color assignment: Odd = Red (#7B1C1C), Even = Blue (#1a3a6b)
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
        text: config.singular === 'article' ? 'Article saved successfully.' : 'Content saved successfully.',
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
      setNotice({ type: 'success', text: next ? 'Published successfully.' : 'Moved to drafts.' });
    } catch (error) {
      setNotice({ type: 'error', text: formatError(error) });
    } finally {
      setActionId(null);
    }
  }

  async function remove(item) {
    if (actionId !== null) return;
    if (!window.confirm('Permanently delete "' + item.title + '"? This cannot be undone.')) return;
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
    <section aria-label={config.title} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="admin-subtitle text-xs font-semibold uppercase tracking-widest text-[#C9A84C]">
            Content Management
          </p>
          <h2 className="admin-title text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {config.title}
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-white/55">{config.description}</p>
        </div>

        {!editorOpen && (
          <button type="button" onClick={openNew} className="admin-btn-primary">
            + New {config.singular}
          </button>
        )}
      </div>

      {notice && (
        <div
          role={notice.type === 'error' ? 'alert' : 'status'}
          className={
            notice.type === 'error'
              ? 'rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-xs text-red-200'
              : 'rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-4 py-3 text-xs text-emerald-200'
          }
        >
          {notice.text}
        </div>
      )}

      {!editorOpen ? (
        <>
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { label: 'Total Records', value: totals.all, accent: 'border-t-[#C9A84C]' },
              { label: 'Published Live', value: totals.published, accent: 'border-t-emerald-400' },
              { label: 'Draft Mode', value: totals.drafts, accent: 'border-t-amber-400' },
            ].map((item) => (
              <div
                key={item.label}
                className={`rounded-2xl border border-white/10 border-t-2 ${item.accent} bg-[#0d0f13] p-5 shadow-lg`}
              >
                <p className="admin-subtitle text-[10px] font-semibold uppercase tracking-widest text-white/45">
                  {item.label}
                </p>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-3xl font-extrabold text-white">
                    {loading ? '—' : item.value}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* List Table */}
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d0f13] shadow-xl">
            <div className="flex flex-wrap items-center gap-3 border-b border-white/10 p-4 sm:p-5">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={'Search ' + kind + '...'}
                className="admin-input !mt-0 min-w-[200px] flex-1"
              />

              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="admin-input !mt-0 !w-auto"
              >
                <option value="all">All statuses</option>
                <option value="published">Published</option>
                <option value="drafts">Drafts</option>
              </select>
            </div>

            {loadError ? (
              <p role="alert" className="px-6 py-10 text-xs text-red-300">
                {loadError}
              </p>
            ) : loading ? (
              <div className="px-6 py-12 text-center text-xs text-white/50">
                Loading {kind} from Firestore...
              </div>
            ) : visible.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <h3 className="text-base font-semibold text-white">
                  {items.length ? 'No matching records' : 'No content created'}
                </h3>
                <p className="mt-1 text-xs text-white/50">
                  {items.length
                    ? 'Try adjusting search terms or filters.'
                    : 'Create your first ' + config.singular + ' to get started.'}
                </p>
                {!items.length && (
                  <button type="button" onClick={openNew} className="admin-btn-primary mt-4">
                    Create {config.singular}
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {visible.map((item, index) => {
                  const eventNumber = index + 1;
                  const autoColor = eventNumber % 2 !== 0 ? '#7B1C1C' : '#1a3a6b';

                  return (
                    <article key={item.id} className="admin-item-row">
                      <div className="flex min-w-0 items-start gap-4">
                        <div
                          className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[#171a21] text-base font-bold"
                          style={{ color: kind === 'events' ? autoColor : '#C9A84C' }}
                        >
                          {item.imageUrl && item.imageUrl.startsWith('https://') ? (
                            <img src={item.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                          ) : (
                            config.singular.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="break-words text-sm font-semibold text-white sm:text-base">
                            {item.title || 'Untitled'}
                          </h3>
                          <p className="mt-0.5 line-clamp-1 text-xs text-white/50">
                            {getSnippet(item, kind) || 'No snippet content'}
                          </p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/40">
                            <span>Updated: {displayDate(item)}</span>
                            {item.eventDate && <span>• Date: {item.eventDate}</span>}
                            {item.category && <span>• {item.category}</span>}
                            {item.slug && <span>• /{item.slug}</span>}
                            {kind === 'events' && (
                              <span style={{ color: autoColor }}>
                                • Auto Color: {eventNumber % 2 !== 0 ? 'Red' : 'Blue'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                        <span className={item.published ? 'admin-badge-published' : 'admin-badge-draft'}>
                          {item.published ? 'Published' : 'Draft'}
                        </span>

                        <button
                          type="button"
                          disabled={actionId !== null}
                          onClick={() => openExisting(item)}
                          className="admin-btn-secondary"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          disabled={actionId !== null}
                          onClick={() => togglePublished(item)}
                          className="admin-btn-secondary"
                        >
                          {actionId === item.id ? 'Saving...' : item.published ? 'Unpublish' : 'Publish'}
                        </button>

                        <button
                          type="button"
                          disabled={actionId !== null}
                          onClick={() => remove(item)}
                          className="admin-btn-danger"
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
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d0f13] shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-5">
            <div>
              <p className="admin-subtitle text-[10px] font-semibold uppercase tracking-widest text-[#C9A84C]">
                {editingId ? 'Edit Record' : 'New Record'}
              </p>
              <h3 className="admin-title text-lg font-bold text-white">
                {editingId ? 'Update ' : 'Create '}{config.singular}
              </h3>
            </div>
            <button type="button" onClick={leaveEditor} disabled={busy || uploadingImage} className="admin-btn-secondary">
              ← Back to List
            </button>
          </div>

          <form onSubmit={save} className="space-y-6 p-5 sm:p-7">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {config.fields.map((field) => (
                <React.Fragment key={field.key}>
                <label className={'block min-w-0 ' + (field.wide ? 'md:col-span-2' : '')}>
                  <span className="admin-input-label">
                    {field.label}
                    {field.required && <span className="ml-1 text-[#C9A84C]">*</span>}
                  </span>

                  {field.type === 'textarea' ? (
                    <textarea
                      rows={field.rows || 4}
                      value={form[field.key] ?? ''}
                      onChange={(e) => updateField(field.key, e.target.value)}
                      required={Boolean(field.required)}
                      maxLength={field.maxLength}
                      className="admin-input resize-y"
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

                  {field.help && <span className="mt-1 block text-[11px] text-white/45">{field.help}</span>}

                  {kind === 'pages' && field.key === 'slug' && !editingId && (
                    <button
                      type="button"
                      disabled={!slugSuggestion}
                      onClick={() => updateField('slug', slugSuggestion)}
                      className="mt-1 text-xs font-semibold text-[#C9A84C] hover:underline disabled:opacity-40"
                    >
                      Auto-generate slug from title
                    </button>
                  )}
                </label>
                {field.key === 'imageUrl' && drive.configured && (
                  <div className="md:col-span-2 flex flex-wrap items-center gap-3">
                    {drive.connected ? (
                      <>
                        <label className="admin-btn-secondary cursor-pointer">
                          {uploadingImage ? 'Uploading image...' : 'Upload to Google Drive'}
                          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif"
                            disabled={uploadingImage || busy} onChange={handleDriveUpload}
                            className="sr-only" aria-label="Upload image to Google Drive" />
                        </label>
                        <button type="button" className="admin-btn-secondary" disabled={uploadingImage || busy}
                          onClick={stopDriveConnection}>Disconnect Drive</button>
                      </>
                    ) : (
                      <button type="button" className="admin-btn-secondary" disabled={uploadingImage || busy}
                        onClick={startDriveConnection}>Connect Google Drive</button>
                    )}
                    <span className="text-[11px] text-white/45">JPG, PNG, WebP or GIF • maximum 4 MB</span>
                  </div>
                )}
                {field.key === 'imageUrl' && cloudinaryUploadConfigured && (
                  <div className="md:col-span-2 flex flex-wrap items-center gap-3">
                    <label className="admin-btn-secondary cursor-pointer">
                      {uploadingImage ? 'Uploading image...' : 'Upload image'}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        disabled={uploadingImage || busy}
                        onChange={handleImageUpload}
                        className="sr-only"
                        aria-label="Upload an image to Cloudinary"
                      />
                    </label>
                    <span className="text-[11px] text-white/45">JPG, PNG, WebP or GIF • up to 5 MB</span>
                  </div>
                )}
                </React.Fragment>
              ))}
            </div>

            {form.imageUrl && /^https:\/\//i.test(form.imageUrl) && (
              <div className="max-w-sm rounded-xl border border-white/10 bg-[#07080a] p-3 space-y-2">
                <p className="admin-subtitle text-[10px] font-semibold uppercase tracking-widest text-white/50">
                  Image Preview
                </p>
                <img
                  src={form.imageUrl}
                  alt="Preview"
                  className="max-h-48 w-full rounded-lg object-cover"
                />
              </div>
            )}

            <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-[#07080a] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="admin-subtitle text-xs font-bold text-white uppercase tracking-wider">
                  Publication Status
                </h4>
                <p className="mt-0.5 text-xs text-white/50">
                  {form.published
                    ? 'This item will be visible to public users on the website.'
                    : 'This item will remain as a draft visible only to admins.'}
                </p>
              </div>

              <label className="flex shrink-0 cursor-pointer items-center gap-3 text-xs font-semibold text-white">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => updateField('published', e.target.checked)}
                  className="h-5 w-5 rounded border-white/20 bg-black accent-[#C9A84C]"
                />
                Publish Item
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-white/10 pt-5">
              <button type="button" onClick={leaveEditor} disabled={busy} className="admin-btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={busy || uploadingImage} className="admin-btn-primary">
                {busy ? 'Saving...' : editingId ? 'Save Changes' : 'Create ' + config.singular}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}