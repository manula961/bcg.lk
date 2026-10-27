import React, { useEffect, useMemo, useState } from 'react';
import {
  subscribeAdminNews, createNews, updateNews, deleteNews, reorderNews,
} from '../lib/newsService';
import {
  subscribeAdminEvents, createEvent, updateEvent, deleteEvent, reorderEvents,
} from '../lib/eventsService';
import {
  subscribeAdminSocieties, createSociety, updateSociety, deleteSociety, reorderSocieties,
} from '../lib/societiesService';
import {
  subscribeAdminSports, createSport, updateSport, deleteSport, reorderSports,
} from '../lib/sportsService';
import {
  subscribeAdminLeadership, createLeader, updateLeader, deleteLeader, reorderLeadership,
} from '../lib/leadershipService';
import { getDriveStatus, connectDrive, disconnectDrive, uploadDriveImage, uploadDrivePaper } from '../lib/googleDriveUpload';
import { subscribeAdminPastPapers, createPastPaper, updatePastPaper, deletePastPaper, reorderPastPapers } from '../lib/pastPapersService';
import { hasPermission, canEditRecord } from '../lib/rbac.mjs';
import { getArchiveStatus, archiveCmsRecord, restoreCmsRecord } from '../lib/cmsWorkflowClient';
import './Admin.css';

const collections = {
  pastPapers: {
    title: 'Past Papers', singular: 'paper', description: 'Publish school examination PDFs from Google Drive.',
    subscribe: subscribeAdminPastPapers, create: createPastPaper, update: updatePastPaper, remove: deletePastPaper, reorder: reorderPastPapers,
    defaults: { title:'', exam:'O/L', subject:'', year:'', language:'Sinhala', term:'', url:'', published:false },
    fields: [
      { key:'title', label:'Paper title', required:true, maxLength:180, wide:true },
      { key:'exam', label:'Exam', type:'select', options:['O/L','A/L','Grade 6-9','Term Test','Other'] },
      { key:'subject', label:'Subject', required:true, maxLength:120 },
      { key:'year', label:'Year', type:'text', required:true, maxLength:4, help:'Four-digit examination year' },
      { key:'language', label:'Medium', type:'select', options:['Sinhala','Tamil','English'] },
      { key:'term', label:'Term / session', maxLength:80 },
      { key:'url', label:'Public PDF URL', type:'url', required:true, maxLength:2048, wide:true, help:'Use the Drive upload below or a trusted HTTPS PDF URL.' },
    ],
  },
  news: {
    title: 'News & Announcements',
    singular: 'article',
    description: 'Write announcements, keep drafts, and manage published articles.',
    subscribe: subscribeAdminNews, create: createNews, update: updateNews, remove: deleteNews, reorder: reorderNews,
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
    subscribe: subscribeAdminEvents, create: createEvent, update: updateEvent, remove: deleteEvent, reorder: reorderEvents,
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
    subscribe: subscribeAdminSocieties, create: createSociety, update: updateSociety, remove: deleteSociety, reorder: reorderSocieties,
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
    subscribe: subscribeAdminSports, create: createSport, update: updateSport, remove: deleteSport, reorder: reorderSports,
    defaults: { title: '', category: '', description: '', achievements: '', imageUrl: '', published: false },
    fields: [
      { key: 'title', label: 'Sport or team name', required: true, maxLength: 180, wide: true, placeholder: 'e.g. Cricket' },
      { key: 'category', label: 'Category', maxLength: 80, placeholder: 'e.g. Team Sports' },
      { key: 'description', label: 'Description', required: true, type: 'textarea', rows: 5, maxLength: 3000, wide: true },
      { key: 'achievements', label: 'Achievements', type: 'textarea', rows: 4, maxLength: 2000, wide: true },
      { key: 'imageUrl', label: 'Photo URL', type: 'url', maxLength: 2048, wide: true, placeholder: 'https://example.com/photo.jpg' },
    ],
  },
  leadership: {
    title: 'School Leadership',
    singular: 'leader',
    description: 'Manage verified senior administrative staff and display order.',
    subscribe: subscribeAdminLeadership, create: createLeader, update: updateLeader, remove: deleteLeader, reorder: reorderLeadership,
    defaults: { title: '', role: 'Principal', description: '', imageUrl: '', published: false },
    fields: [
      { key: 'title', label: 'Staff member name', required: true, maxLength: 180, wide: true, placeholder: 'Enter full name' },
      { key: 'role', label: 'Position', type: 'select', options: ['Principal', 'Deputy Principal', 'Assistant Principal', 'Sectional Head', 'Other Senior Staff'] },
      { key: 'description', label: 'Profile / responsibilities', type: 'textarea', rows: 5, maxLength: 1200, wide: true },
      { key: 'imageUrl', label: 'Official portrait URL', type: 'url', maxLength: 2048, wide: true, placeholder: 'https://example.com/portrait.jpg' },
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
  if (kind === 'pastPapers') return [item.exam, item.subject, item.year, item.language].filter(Boolean).join(' · ');
  if (['events', 'societies', 'sports', 'leadership'].includes(kind)) return item.description || '';
  return '';
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

export default function ContentManager({ kind, onDirtyChange, role }) {
  const config = collections[kind];
  const canCreate = hasPermission(role, 'content.create');
  const canPublish = hasPermission(role, 'content.publish');
  const canDelete = hasPermission(role, 'content.delete');
  const canUpload = hasPermission(role, 'media.upload');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingRevision, setEditingRevision] = useState(null);
  const [form, setForm] = useState(() => ({ ...config.defaults }));
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [knownArchived, setKnownArchived] = useState(() => new Set());
  const [uploadingImage, setUploadingImage] = useState(false);
  const [drive, setDrive] = useState({ configured: false, connected: false });

  // Drag and Drop State
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  useEffect(() => {
    let active = true;
    if (canUpload) getDriveStatus().then(status => { if (active) setDrive(status); }).catch(() => {});
    return () => { active = false; };
  }, [canUpload]);

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

  // Avoid assigning duplicate ranks while items are filtered.
  const canReorder = status === 'all' && search.trim() === '' && actionId === null && hasPermission(role, 'content.reorder');

  const visible = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return items.filter(item => {
      if (status === 'published' && item.published !== true) return false;
      if (status === 'drafts' && item.published === true) return false;
      if (!term) return true;
      return [
        item.title, item.slug, item.category, item.location, item.eventDate,
        item.excerpt, item.description, item.websiteUrl, item.role, item.achievements, item.exam, item.subject, item.year, item.language,
      ].some(value => typeof value === 'string' && value.toLocaleLowerCase().includes(term));
    });
  }, [items, search, status]);

  function openNew() {
    if (!canCreate) return;
    setForm({ ...config.defaults, rank: items.length + 1 });
    setEditingId(null);
    setEditingRevision(null);
    setDirty(false);
    setNotice(null);
    setEditorOpen(true);
  }

  function openExisting(item) {
    if (!canEditRecord(role, item)) return;
    setForm(copyRecord(item, config.defaults));
    setEditingId(item.id);
    setEditingRevision(item.updatedAt ?? null);
    setDirty(false);
    setNotice(null);
    setEditorOpen(true);
  }

  function leaveEditor() {
    if (busy || uploadingImage) return;
    if (dirty && !window.confirm('Discard unsaved changes?')) return;
    setEditorOpen(false);
    setEditingId(null);
    setDirty(false);
  }

  function updateField(key, value) {
    setForm(previous => ({ ...previous, [key]: value }));
    setDirty(true);
  }

  // Drag and Drop Event Handlers
  function handleDragStart(index) {
    setDraggedIndex(index);
  }

  function handleDragOver(e, index) {
    e.preventDefault();
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  }

  async function reorderPositions(startIndex, targetIndex) {
    if (!canReorder || startIndex === null || startIndex === targetIndex ||
        startIndex < 0 || targetIndex < 0 || targetIndex >= items.length) return;
    const reordered = [...items];
    const [moved] = reordered.splice(startIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    setActionId('reordering');
    try {
      await config.reorder(reordered.map(item => item.id), {
        expectedUpdatedAtById: Object.fromEntries(items.map(item => [item.id, item.updatedAt ?? null])),
      });
      setNotice({ type: 'success', text: 'Item positions updated.' });
    } catch (error) {
      setNotice({ type: 'error', text: formatError(error) });
    } finally {
      setActionId(null);
    }
  }

  async function handleDrop(targetIndex) {
    const sourceIndex = draggedIndex;
    setDraggedIndex(null);
    setDragOverIndex(null);
    await reorderPositions(sourceIndex, targetIndex);
  }

  async function startDriveConnection() {
    if (!canUpload) return;
    if (dirty && !window.confirm('Connecting Google Drive reloads the editor. Continue without saving changes?')) return;
    setNotice(null);
    try { await connectDrive(); }
    catch (error) { setNotice({ type: 'error', text: formatError(error) }); }
  }

  async function handleDriveUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!canUpload || !file || busy || uploadingImage) return;
    // Google Drive gives every uploaded image an anyone-with-link public grant.
    // Explicitly obtain confirmation before putting student/staff images online.
    if (!window.confirm('This image will be publicly accessible on Google Drive immediately, even before the content is published. Confirm it is approved for public use.')) return;
    setUploadingImage(true);
    setNotice(null);
    try {
      const url = await uploadDriveImage(file);
      updateField('imageUrl', url);
      setNotice({ type: 'success', text: 'Image uploaded to Drive. Verify the preview, then save the record.' });
    } catch (error) { setNotice({ type: 'error', text: formatError(error) }); }
    finally { setUploadingImage(false); }
  }

  async function handlePaperUpload(event) {
    const file=event.target.files?.[0]; event.target.value='';
    if (!canUpload || !file || busy || uploadingImage) return;
    if (!window.confirm('This PDF will become publicly accessible immediately on Google Drive. Confirm it is approved for publication and contains no private student information.')) return;
    setUploadingImage(true); setNotice(null);
    try { const url=await uploadDrivePaper(file); updateField('url',url); setNotice({type:'success',text:'PDF uploaded. Save or publish this paper to list it on the website.'}); }
    catch(error){setNotice({type:'error',text:formatError(error)});} finally{setUploadingImage(false);}
  }

  async function stopDriveConnection() {
    if (uploadingImage) return;
    try {
      await disconnectDrive();
      setDrive(previous => ({ ...previous, connected: false }));
      setNotice({ type: 'success', text: 'Google Drive disconnected from this browser.' });
    } catch (error) { setNotice({ type: 'error', text: formatError(error) }); }
  }

  async function save(event) {
    event.preventDefault();
    if (busy || uploadingImage) return;
    if (editingId ? !hasPermission(role, 'content.edit') : !canCreate) return;
    if (!canPublish && (form.published || (editingId && items.find(item => item.id === editingId)?.published))) {
      setNotice({ type: 'error', text: 'Editors can save drafts only.' });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const payload = { ...form };
      if (kind === 'pastPapers' && !/^(19|20)\d{2}$/.test(form.year)) throw new Error('Enter a four-digit year (1900–2099).');
      if (kind === 'events') {
        const itemIndex = editingId
          ? items.findIndex((i) => i.id === editingId)
          : items.length;
        const itemNumber = itemIndex >= 0 ? itemIndex + 1 : 1;
        payload.color = itemNumber % 2 !== 0 ? '#7B1C1C' : '#1a3a6b';
      }
      if (editingId) {
        await config.update(editingId, payload, { expectedUpdatedAt: editingRevision });
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
    if (!canPublish || actionId !== null) return;
    setActionId(item.id);
    setNotice(null);
    try {
      const next = item.published !== true;
      await config.update(item.id, { published: next }, { expectedUpdatedAt: item.updatedAt ?? null });
      setNotice({ type: 'success', text: next ? 'Published live.' : 'Moved to drafts.' });
    } catch (error) {
      setNotice({ type: 'error', text: formatError(error) });
    } finally {
      setActionId(null);
    }
  }

  async function remove(item) {
    if (!canDelete || actionId !== null) return;
    setActionId(item.id);
    setNotice(null);
    try {
      const archived = await getArchiveStatus(kind, item.id);
      if (archived) {
        if (!window.confirm('Restore "' + (item.title || 'item') +
          '" as an unpublished draft?')) return;
        await restoreCmsRecord(kind, item.id);
        setKnownArchived(previous => {
          const next = new Set(previous);
          next.delete(item.id);
          return next;
        });
        setNotice({ type: 'success', text: 'Restored to drafts. Review before republishing.' });
      } else {
        if (!window.confirm('Archive "' + (item.title || 'item') +
          '"? This removes it from the public website, preserves its history, and allows restoration. Publicly shared Drive files remain accessible.')) return;
        await archiveCmsRecord(kind, item.id);
        setKnownArchived(previous => new Set(previous).add(item.id));
        setNotice({ type: 'success', text: 'Archived safely. Use Archive / Restore to restore this draft.' });
      }
    } catch (error) {
      setNotice({ type: 'error', text: formatError(error) });
    } finally {
      setActionId(null);
    }
  }

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
          {/* Action Toolbar */}
          <div className="admin-toolbar-row">
            <div className="admin-search-wrap">
              <svg className="admin-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="search"
                aria-label={`Search ${config.title}`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${kind}...`}
                className="admin-search-input"
              />
            </div>
            <div className="admin-filter-wrap">
              <select
                aria-label={`Filter ${config.title} by publication status`}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="admin-select"
              >
                <option value="all">All status ({totals.all})</option>
                <option value="published">Published ({totals.published})</option>
                <option value="drafts">Drafts ({totals.drafts})</option>
              </select>
              {canCreate && <button type="button" onClick={openNew} className="admin-btn-primary">
                + New {config.singular}
              </button>}
            </div>
          </div>

          {/* Item Table */}
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
                {!items.length && canCreate && (
                  <button type="button" onClick={openNew} className="admin-btn-primary">
                    Create {config.singular}
                  </button>
                )}
              </div>
            ) : (
              <div className="admin-list-container">
                {visible.map((item, index) => {
                  const isBeingDragged = draggedIndex === index;
                  const isDragTarget = dragOverIndex === index;

                  return (
                    <article
                      key={item.id}
                      draggable={canReorder}
                      onDragStart={() => { if (canReorder) handleDragStart(index); }}
                      onDragOver={(e) => { if (canReorder) handleDragOver(e, index); }}
                      onDrop={() => { if (canReorder) handleDrop(index); }}
                      className={`admin-row ${isBeingDragged ? 'dragging' : ''} ${isDragTarget ? 'drag-target' : ''}`}
                    >
                      {/* Drag Handle (Far Left) */}
                      <div className="admin-drag-handle" title={canReorder ? "Drag to reorder" : "Clear filters to reorder"} aria-hidden="true">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="9" cy="5" r="2" />
                          <circle cx="15" cy="5" r="2" />
                          <circle cx="9" cy="12" r="2" />
                          <circle cx="15" cy="12" r="2" />
                          <circle cx="9" cy="19" r="2" />
                          <circle cx="15" cy="19" r="2" />
                        </svg>
                      </div>

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
                            {item.eventDate && <span>   Date: {item.eventDate}</span>}
                            {item.category && <span>   {item.category}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="admin-row-actions">
                        <button type="button" className="admin-btn-ghost" disabled={!canReorder || index === 0}
                          aria-label={`Move ${item.title || 'item'} up`}
                          onClick={() => reorderPositions(index, index - 1)}>↑</button>
                        <button type="button" className="admin-btn-ghost" disabled={!canReorder || index === items.length - 1}
                          aria-label={`Move ${item.title || 'item'} down`}
                          onClick={() => reorderPositions(index, index + 1)}>↓</button>
                        <span className={`admin-status-badge ${item.published ? 'published' : 'draft'}`}>
                          <span className="admin-status-dot" />
                          {item.published ? 'Published' : 'Draft'}
                        </span>
                        {canEditRecord(role, item) && <button
                          type="button"
                          disabled={actionId !== null}
                          onClick={() => openExisting(item)}
                          className="admin-btn-ghost"
                        >
                          Edit
                        </button>}
                        {canPublish && <button
                          type="button"
                          disabled={actionId !== null}
                          onClick={() => togglePublished(item)}
                          className="admin-btn-ghost"
                        >
                          {actionId === item.id ? '...' : item.published ? 'Unpublish' : 'Publish'}
                        </button>}
                        {canDelete && <button
                          type="button"
                          disabled={actionId !== null}
                          onClick={() => remove(item)}
                          className="admin-btn-ghost-danger"
                        >
                          {knownArchived.has(item.id) ? 'Restore' : 'Archive / Restore'}
                        </button>}
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
            <button type="button" onClick={leaveEditor} disabled={busy || uploadingImage} className="admin-btn-ghost">
              Cancel
            </button>
          </div>
          <form onSubmit={save} className="admin-editor-form">
            <div className="admin-form-grid">
              {config.fields.map((field) => (
                <div key={field.key} className={`admin-field-wrap ${field.wide ? 'wide' : ''}`}>
                  <label className="admin-label" htmlFor={`admin-field-${kind}-${field.key}`}>
                    {field.label}
                    {field.required && <span className="admin-required">*</span>}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea
                      id={`admin-field-${kind}-${field.key}`}
                      aria-describedby={field.help ? `admin-help-${kind}-${field.key}` : undefined}
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
                      id={`admin-field-${kind}-${field.key}`}
                      aria-describedby={field.help ? `admin-help-${kind}-${field.key}` : undefined}
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
                      id={`admin-field-${kind}-${field.key}`}
                      aria-describedby={field.help ? `admin-help-${kind}-${field.key}` : undefined}
                      type={field.type || 'text'}
                      value={form[field.key] ?? ''}
                      onChange={(e) => updateField(field.key, e.target.value)}
                      required={Boolean(field.required)}
                      maxLength={field.maxLength}
                      className="admin-input"
                      placeholder={field.placeholder}
                    />
                  )}
                  {field.help && <span id={`admin-help-${kind}-${field.key}`} className="admin-help-text">{field.help}</span>}
                  {(field.key === 'imageUrl' || (kind === 'pastPapers' && field.key === 'url')) && canUpload && drive.configured && (
                    <div className="flex flex-wrap items-center gap-3">
                      {drive.connected ? (
                        <>
                          <label className="admin-btn-secondary cursor-pointer">
                            {uploadingImage ? 'Uploading...' : kind === 'pastPapers' ? 'Upload PDF to Google Drive' : 'Upload to Google Drive'}
                            <input type="file" accept={kind === 'pastPapers' ? 'application/pdf,.pdf' : 'image/jpeg,image/png,image/webp,image/gif'}
                              disabled={uploadingImage || busy} onChange={kind === 'pastPapers' ? handlePaperUpload : handleDriveUpload}
                              className="sr-only" aria-label={kind === 'pastPapers' ? 'Upload PDF to Google Drive' : 'Upload image to Google Drive'} />
                          </label>
                          <button type="button" className="admin-btn-secondary" disabled={uploadingImage || busy}
                            onClick={stopDriveConnection}>Disconnect Drive</button>
                        </>
                      ) : (
                        <button type="button" className="admin-btn-secondary" disabled={uploadingImage || busy}
                          onClick={startDriveConnection}>Connect Google Drive</button>
                      )}
                      <span className="admin-help-text">{kind === 'pastPapers' ? 'PDF · up to 10 MB · public on upload' : 'JPG, PNG, WebP or GIF · up to 4 MB'}</span>
                    </div>
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
            {canPublish && <div className="admin-publish-row">
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
            </div>}
            <div className="admin-editor-footer">
              <button type="button" onClick={leaveEditor} disabled={busy || uploadingImage} className="admin-btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={busy || uploadingImage} className="admin-btn-primary">
                {busy ? 'Saving...' : editingId ? 'Save Changes' : `Create ${config.singular}`}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}