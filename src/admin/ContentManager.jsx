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
    description: 'Manage dates, venues, details, and the publishing status of events.',
    subscribe: subscribeAdminEvents, create: createEvent, update: updateEvent, remove: deleteEvent,
    defaults: { title: '', eventDate: '', location: '', description: '', color: '#7B1C1C', imageUrl: '', published: false },
    fields: [
      { key: 'title', label: 'Event title', required: true, maxLength: 180, wide: true, placeholder: 'Enter the event name' },
      { key: 'eventDate', label: 'Event date', type: 'date', required: true },
      { key: 'location', label: 'Location / venue', required: true, maxLength: 200, placeholder: 'e.g. Main Hall, BCG' },
      { key: 'description', label: 'Event description', type: 'textarea', rows: 7, maxLength: 3000, required: true, wide: true },
      { key: 'color', label: 'Event accent color', type: 'color' },
      { key: 'imageUrl', label: 'Event image URL', type: 'url', maxLength: 2048, placeholder: 'https://example.com/photo.jpg', wide: true },
    ],
  },
  pages: {
    title: 'Website Pages',
    singular: 'page',
    description: 'Prepare page content and search descriptions for future public-site integrations.',
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

const fieldStyle = 'admin-input mt-2';
const secondaryButton = 'admin-secondary-button';
const primaryButton = 'admin-primary-button';

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
  if (kind === 'events') return item.description || '';
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
        item.excerpt, item.description,
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
    if (dirty && !window.confirm('Discard your unsaved changes?')) return;
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
      if (editingId) {
        await config.update(editingId, form);
      } else {
        await config.create(form);
      }
      setDirty(false);
      setEditorOpen(false);
      setEditingId(null);
      setNotice({ type: 'success', text: config.singular === 'article' ? 'Article saved successfully.' : 'Content saved successfully.' });
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
    <section aria-label={config.title} className="admin-content space-y-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="admin-eyebrow mb-2">Content management</p>
          <h2 className="admin-display admin-content-heading">{config.title}</h2>
          <p className="admin-content-description">{config.description}</p>
        </div>
        {!editorOpen && (
          <button type="button" onClick={openNew} className={primaryButton}>
            <span aria-hidden="true" className="mr-2 text-xl font-normal leading-none">+</span>
            New {config.singular}
          </button>
        )}
      </div>

      {notice && (
        <div
          role={notice.type === 'error' ? 'alert' : 'status'}
          className={notice.type === 'error'
            ? 'rounded-xl border border-red-400/30 bg-red-950/40 px-4 py-3 text-sm text-red-100'
            : 'rounded-xl border border-emerald-400/25 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200'}
        >
          {notice.text}
        </div>
      )}

      {!editorOpen ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { label: 'Total records', value: totals.all },
              { label: 'Published', value: totals.published },
              { label: 'Drafts', value: totals.drafts },
            ].map((item, index) => (
              <div key={item.label} className="admin-stat">
                <p className="admin-eyebrow">{item.label}</p>
                <div className="mt-3 flex items-end justify-between">
                  <span className="admin-stat-value">{loading ? '—' : item.value}</span>
                  <span className="admin-stat-marker" data-kind={index === 1 ? 'published' : index === 2 ? 'drafts' : 'all'} />
                </div>
              </div>
            ))}
          </div>

          <div className="admin-panel">
            <div className="admin-toolbar">
              <label className="min-w-[180px] flex-1">
                <span className="sr-only">Search {config.title}</span>
                <input
                  type="search"
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder={'Search ' + kind + '...'}
                  className="admin-input"
                />
              </label>
              <label>
                <span className="sr-only">Publication status</span>
                <select
                  value={status}
                  onChange={event => setStatus(event.target.value)}
                  className="admin-input"
                >
                  <option value="all">All statuses</option>
                  <option value="published">Published</option>
                  <option value="drafts">Drafts</option>
                </select>
              </label>
            </div>

            {loadError ? (
              <p role="alert" className="px-6 py-10 text-sm text-red-200">{loadError}</p>
            ) : loading ? (
              <p role="status" className="px-6 py-12 text-center text-sm text-white/60">Loading {kind} from Firestore…</p>
            ) : visible.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#C9A84C]/20 bg-[#C9A84C]/10 text-2xl text-[#C9A84C]">✦</div>
                <h3 className="text-lg font-semibold text-white">{items.length ? 'No matching records' : 'No content yet'}</h3>
                <p className="mt-2 text-sm text-white/50">
                  {items.length ? 'Try another search or publication filter.' : 'Create your first ' + config.singular + ' to get started.'}
                </p>
                {!items.length && <button type="button" onClick={openNew} className={primaryButton + ' mt-6'}>Create {config.singular}</button>}
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {visible.map(item => (
                  <article key={item.id} className="admin-list-row">
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="admin-item-thumb">
                        {item.imageUrl && item.imageUrl.startsWith('https://')
                          ? <img src={item.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                          : config.singular.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="admin-list-title">{item.title || 'Untitled'}</h3>
                        <p className="admin-list-desc mt-1 line-clamp-2">{getSnippet(item, kind) || 'No description'}</p>
                        <div className="admin-list-meta">
                          <span>{displayDate(item)}</span>
                          {item.eventDate && <span>Event: {item.eventDate}</span>}
                          {item.category && <span>{item.category}</span>}
                          {item.slug && <span>/{item.slug}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                      <span className="admin-badge" data-published={item.published === true}>
                        {item.published ? 'Published' : 'Draft'}
                      </span>
                      <button type="button" disabled={actionId !== null} onClick={() => openExisting(item)} className={secondaryButton}>Edit</button>
                      <button type="button" disabled={actionId !== null} onClick={() => togglePublished(item)} className={secondaryButton}>
                        {actionId === item.id ? 'Working…' : item.published ? 'Unpublish' : 'Publish'}
                      </button>
                      <button type="button" disabled={actionId !== null} onClick={() => remove(item)} className="admin-danger-button">
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs leading-5 text-white/40">
            Published News and Events update the existing public sections via Firestore. Pages remain stored until their public routes are integrated.
          </p>
        </>
      ) : (
        <div className="admin-panel">
          <div className="admin-panel-header flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="admin-eyebrow">{editingId ? 'Edit content' : 'New content'}</p>
              <h3 className="admin-display mt-2 text-xl">{editingId ? 'Update ' : 'Create '}{config.singular}</h3>
            </div>
            <button type="button" onClick={leaveEditor} disabled={busy} className={secondaryButton}>Back to list</button>
          </div>
          <form onSubmit={save} className="space-y-7 p-5 sm:p-7">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {config.fields.map(field => (
                <label key={field.key} className={'block min-w-0 ' + (field.wide ? 'md:col-span-2' : '')}>
                  <span className="admin-field-label">
                    {field.label}{field.required && <span className="ml-1 text-[#C9A84C]">*</span>}
                  </span>
                  {field.type === 'textarea' ? (
                    <textarea
                      rows={field.rows || 4}
                      value={form[field.key] ?? ''}
                      onChange={event => updateField(field.key, event.target.value)}
                      required={Boolean(field.required)}
                      maxLength={field.maxLength}
                      className={fieldStyle + ' resize-y'}
                      placeholder={field.placeholder}
                    />
                  ) : field.type === 'select' ? (
                    <select value={form[field.key] ?? ''} onChange={event => updateField(field.key, event.target.value)} className={fieldStyle}>
                      {field.options.map(option => <option key={option} value={option}>{option}</option>)}
                    </select>
                  ) : (
                    <input
                      type={field.type || 'text'}
                      value={form[field.key] ?? ''}
                      onChange={event => updateField(field.key, event.target.value)}
                      required={Boolean(field.required)}
                      maxLength={field.maxLength}
                      disabled={field.key === 'slug' && Boolean(editingId)}
                      pattern={field.key === 'slug' ? '[a-z0-9]+(-[a-z0-9]+)*' : undefined}
                      className={fieldStyle + (field.type === 'color' ? ' h-12 cursor-pointer p-1.5' : '')}
                      placeholder={field.placeholder}
                    />
                  )}
                  {field.help && <span className="admin-field-help">{field.help}</span>}
                  {kind === 'pages' && field.key === 'slug' && !editingId && (
                    <button type="button" disabled={!slugSuggestion} onClick={() => updateField('slug', slugSuggestion)}
                      className="mt-2 text-xs font-semibold text-[#C9A84C] hover:underline disabled:opacity-40">
                      Generate slug from title
                    </button>
                  )}
                </label>
              ))}
            </div>

            {form.imageUrl && /^https:\/\//i.test(form.imageUrl) && (
              <div className="max-w-sm">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">Image preview</p>
                <img src={form.imageUrl} alt="Content image preview" className="max-h-48 w-full rounded-xl border border-white/10 object-cover" />
              </div>
            )}

            <div className="admin-publish-area">
              <div>
                <h4 className="text-sm font-bold text-white">Publication status</h4>
                <p className="mt-1 text-xs leading-5 text-white/50">
                  {form.published ? 'This record will be publicly readable in Firestore.' : 'Only administrators can read this draft.'}
                </p>
              </div>
              <label className="flex shrink-0 cursor-pointer items-center gap-3 text-sm font-semibold text-white">
                <input type="checkbox" checked={form.published} onChange={event => updateField('published', event.target.checked)}
                  className="admin-publish-check" />
                Publish
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-white/10 pt-6">
              <button type="button" onClick={leaveEditor} disabled={busy} className={secondaryButton}>Cancel</button>
              <button type="submit" disabled={busy} className={primaryButton}>
                {busy ? 'Saving…' : editingId ? 'Save changes' : 'Create ' + config.singular}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
