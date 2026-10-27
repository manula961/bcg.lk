import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import {
  collection, doc, getDoc, getDocs, query, where, setDoc, updateDoc, deleteDoc, serverTimestamp, writeBatch
} from 'firebase/firestore';
import { ref, uploadBytes, getBytes, listAll, deleteObject } from 'firebase/storage';

const sample = {
  news: { title: 'New', excerpt: 'Summary', category: 'News', published: false },
  events: { title: 'New', description: 'Event details', eventDate: '2026-10-18', location: 'Main Hall', published: false },
  pages: { title: 'New', slug: 'integration-pages', body: 'Page body', published: false },
  societies: { title: 'New', description: 'Society details', published: false },
  sports: { title: 'New', description: 'Sport details', published: false },
  leadership: { title: 'New', role: 'Principal', published: false },
  pastPapers: { title: 'New', exam: 'Grade 10', subject: 'Mathematics', year: '2025', language: 'English', term: 'First', url: 'https://example.org/paper.pdf', published: false },
};

let environment;
let admin, editor, publisher, superAdmin, auditor, visitor;

const firestoreRules = readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8');
const storageRules = readFileSync(new URL('../../storage.rules', import.meta.url), 'utf8');
const projectId = 'demo-bcg-verification';

before(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
    throw new Error('Both Firestore and Storage emulators must run for integration tests.');
  }
  environment = await initializeTestEnvironment({
    projectId,
    firestore: { rules: firestoreRules },
    storage: { rules: storageRules },
  });
  await environment.clearFirestore();
  admin = environment.authenticatedContext('verified-admin');
  editor = environment.authenticatedContext('ordinary-editor');
  publisher = environment.authenticatedContext('verified-publisher');
  superAdmin = environment.authenticatedContext('verified-owner');
  auditor = environment.authenticatedContext('security-auditor');
  visitor = environment.unauthenticatedContext();
  await environment.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'admins/verified-admin'), { role: 'admin' });
    await setDoc(doc(context.firestore(), 'admins/ordinary-editor'), { role: 'editor' });
    await setDoc(doc(context.firestore(), 'admins/verified-publisher'), { role: 'publisher' });
    await setDoc(doc(context.firestore(), 'admins/verified-owner'), { role: 'super_admin' });
    await setDoc(doc(context.firestore(), 'admins/security-auditor'), { role: 'auditor' });
    await setDoc(doc(context.firestore(), 'admins/other-owner'), { role: 'super_admin' });
    await setDoc(doc(context.firestore(), 'news/published-news'), {
      title: 'Published', excerpt: 'Visible', category: 'News', published: true,
    });
    await setDoc(doc(context.firestore(), 'news/draft-news'), {
      title: 'Draft', excerpt: 'Private', category: 'News', published: false,
    });
    for (const name of ['events', 'pages', 'societies', 'sports', 'leadership', 'pastPapers']) {
      await setDoc(doc(context.firestore(), name + '/public-item'), { title: 'Public', published: true });
      await setDoc(doc(context.firestore(), name + '/draft-item'), { title: 'Private', published: false });
    }
  });
});
after(async () => { if (environment) await environment.cleanup(); });

test('only owner can inspect their admin document; nobody can promote themselves', async () => {
  await assertSucceeds(getDoc(doc(admin.firestore(), 'admins/verified-admin')));
  await assertFails(getDoc(doc(editor.firestore(), 'admins/verified-admin')));
  await assertFails(getDoc(doc(visitor.firestore(), 'admins/verified-admin')));
  await assertFails(setDoc(doc(editor.firestore(), 'admins/ordinary-editor'), { role: 'admin' }));
  await assertFails(getDocs(collection(admin.firestore(), 'admins')));
});

test('public reads are published-only, and unrestricted queries are rejected', async () => {
  for (const name of ['news', 'events', 'pages', 'societies', 'sports', 'leadership', 'pastPapers']) {
    const publishedId = name === 'news' ? 'published-news' : 'public-item';
    const draftId = name === 'news' ? 'draft-news' : 'draft-item';
    await assertSucceeds(getDoc(doc(visitor.firestore(), name, publishedId)));
    await assertFails(getDoc(doc(visitor.firestore(), name, draftId)));
    const publicQuery = query(collection(visitor.firestore(), name), where('published', '==', true));
    const snapshot = await assertSucceeds(getDocs(publicQuery));
    assert.ok(snapshot.docs.every(record => record.data().published === true));
    await assertFails(getDocs(collection(visitor.firestore(), name)));
    await assertSucceeds(getDocs(collection(admin.firestore(), name)));
  }
});

test('non-admin writes fail; administrators publish but direct hard deletes are denied', async () => {
  for (const name of ['news', 'events', 'pages', 'societies', 'sports', 'leadership', 'pastPapers']) {
    const id = 'integration-' + name;
    const record = doc(admin.firestore(), name, id);
    await assertFails(setDoc(doc(visitor.firestore(), name, id), { title: 'Unauthorized', published: true }));
    await assertFails(setDoc(doc(editor.firestore(), name, id), { title: 'Unauthorized', published: true }));
    await assertSucceeds(setDoc(record, sample[name]));
    await assertFails(getDoc(doc(visitor.firestore(), name, id)));
    await assertFails(updateDoc(record, { title: 'Edited', published: true, publishedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(publisher.firestore(), name, id), { published: true, publishedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(record, { title: 'Draft edited' }));
    await assertFails(getDoc(doc(visitor.firestore(), name, id)));
    await assertFails(deleteDoc(doc(editor.firestore(), name, id)));
    await assertFails(deleteDoc(record));
  }
});

test('past papers enforce valid metadata, HTTPS links, and editor/publisher roles', async () => {
  const db = admin.firestore();
  const invalid = doc(db, 'pastPapers/invalid-metadata');
  await assertFails(setDoc(invalid, { ...sample.pastPapers, year: '202X' }));
  await assertFails(setDoc(invalid, { ...sample.pastPapers, language: 'French' }));
  await assertFails(setDoc(invalid, { ...sample.pastPapers, url: 'http://example.org/paper.pdf' }));
  const draft = doc(editor.firestore(), 'pastPapers/editor-draft');
  await assertSucceeds(setDoc(draft, sample.pastPapers));
  await assertSucceeds(updateDoc(draft, { subject: 'Science' }));
  await assertFails(updateDoc(draft, { published: true }));
  await assertFails(updateDoc(doc(publisher.firestore(), 'pastPapers/editor-draft'), { published: true, publishedAt: serverTimestamp() }));
  await assertFails(deleteDoc(doc(publisher.firestore(), 'pastPapers/editor-draft')));
  await assertFails(deleteDoc(doc(admin.firestore(), 'pastPapers/editor-draft')));
});

test('retired Extracurricular collection is not accessible to clients', async () => {
  const record = doc(admin.firestore(), 'extracurricular/archived-activity');
  await assertFails(setDoc(record, { title: 'Retired', description: 'Inactive collection', published: false }));
  await assertFails(getDoc(record));
  await assertFails(getDoc(doc(visitor.firestore(), 'extracurricular/archived-activity')));
});

test('all privileged workflow metadata paths deny direct client access', async () => {
  const names = [
    'cmsWorkflow/news_sample',
    'cmsTrash/news_sample',
    'cmsHistory/news_sample/revisions/example',
    'cmsAudit/example',
    'cmsJobs/example',
    'cmsMediaRefs/news_sample',
  ];
  for (const name of names) {
    // Even legitimate administrators must go through the authenticated server.
    for (const context of [visitor, editor, publisher, admin, superAdmin]) {
      await assertFails(getDoc(doc(context.firestore(), name)));
      await assertFails(setDoc(doc(context.firestore(), name), { status: 'published' }));
      await assertFails(deleteDoc(doc(context.firestore(), name)));
    }
  }
});

test('unknown Firestore paths are denied by default', async () => {
  await assertFails(getDoc(doc(visitor.firestore(), 'internal/private')));
  await assertFails(setDoc(doc(admin.firestore(), 'internal/private'), { value: 1 }));
});

test('Storage enforces authorized media uploads, allowed image types and 10 MiB size limit', async () => {
  const image = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const path = 'public/integration-upload.png';
  await assertFails(uploadBytes(ref(visitor.storage(), path), image, { contentType: 'image/png' }));
  await assertFails(uploadBytes(ref(auditor.storage(), path), image, { contentType: 'image/png' }));
  await assertFails(uploadBytes(ref(admin.storage(), 'private/no.png'), image, { contentType: 'image/png' }));
  await assertFails(uploadBytes(ref(admin.storage(), 'public/not-image.txt'), image, { contentType: 'text/plain' }));
  await assertFails(uploadBytes(ref(admin.storage(), 'public/oversized.png'), new Uint8Array(10 * 1024 * 1024 + 1), { contentType: 'image/png' }));
  await assertSucceeds(uploadBytes(ref(admin.storage(), path), image, { contentType: 'image/png' }));
  await assertSucceeds(getBytes(ref(visitor.storage(), path)));
  // Known public paths must not be replaceable by draft-only editors/publishers.
  await assertFails(uploadBytes(ref(editor.storage(), path), image, { contentType: 'image/png' }));
  await assertFails(uploadBytes(ref(publisher.storage(), path), image, { contentType: 'image/png' }));
  await assertSucceeds(uploadBytes(ref(admin.storage(), path), image, { contentType: 'image/png' }));
  // Preserve PR #44 privacy checks while exercising RBAC permissions.
  await assertFails(listAll(ref(visitor.storage(), 'public')));
  await assertFails(listAll(ref(editor.storage(), 'public')));
  await assertFails(listAll(ref(publisher.storage(), 'public')));
  const adminListing = await assertSucceeds(listAll(ref(admin.storage(), 'public')));
  assert.ok(adminListing.items.some(item => item.fullPath === path));
  const ownerListing = await assertSucceeds(listAll(ref(superAdmin.storage(), 'public')));
  assert.ok(ownerListing.items.some(item => item.fullPath === path));
  await assertFails(deleteObject(ref(editor.storage(), path)));
  await assertSucceeds(deleteObject(ref(admin.storage(), path)));
});

test('administrator cannot inject unsupported CMS fields or oversized text', async () => {
  await assertFails(setDoc(doc(admin.firestore(), 'news/invalid-extra'), {
    title: 'Injected', published: true, isSuperuser: true,
  }));
  await assertFails(setDoc(doc(admin.firestore(), 'news/invalid-size'), {
    title: 'x'.repeat(181), published: false,
  }));
  await assertFails(setDoc(doc(admin.firestore(), 'news/invalid-type'), {
    title: 'Wrong type', published: 'true',
  }));
});

test('administrator cannot forge or rewrite immutable creation metadata', async () => {
  const record = doc(admin.firestore(), 'news/ownership-check');
  await assertFails(setDoc(record, { title: 'Forgery', createdBy: 'another-user', published: false }));
  await assertSucceeds(setDoc(record, { title: 'Owned', excerpt: 'An authorized article', createdBy: 'verified-admin', updatedBy: 'verified-admin', published: false }));
  await assertFails(updateDoc(record, { createdBy: 'another-user' }));
  await assertFails(updateDoc(record, { updatedBy: 'another-user' }));
  await assertSucceeds(updateDoc(record, { title: 'Legitimate edit' }));
  await assertFails(deleteDoc(record));
});

test('auditor has read-only draft visibility without publication or role management', async () => {
  await assertSucceeds(getDoc(doc(auditor.firestore(), 'news/draft-news')));
  await assertSucceeds(getDocs(collection(auditor.firestore(), 'news')));
  await assertFails(setDoc(doc(auditor.firestore(), 'news/unauthorized'), { title: 'No', published: true }));
  await assertFails(updateDoc(doc(auditor.firestore(), 'news/draft-news'), { published: true }));
  await assertFails(setDoc(doc(auditor.firestore(), 'admins/security-auditor'), { role: 'admin' }));
});


test('Firestore validates slug, HTTPS media URLs, event dates, colors and allowed enums', async () => {
  const db = admin.firestore();
  await assertFails(setDoc(doc(db, 'pages/bad-slug'), { title: 'Bad slug', slug: 'Not Allowed!', published: false }));
  await assertFails(setDoc(doc(db, 'pages/bad-url'), { title: 'Bad URL', imageUrl: 'javascript:alert(1)', published: false }));
  await assertFails(setDoc(doc(db, 'news/bad-category'), { title: 'Bad category', category: 'Injected', published: false }));
  await assertFails(setDoc(doc(db, 'news/bad-image'), { title: 'Bad image', imageUrl: 'http://example.com/image.png', published: false }));
  await assertFails(setDoc(doc(db, 'societies/bad-website'), { title: 'Bad site', websiteUrl: 'http://example.org', published: false }));
  await assertFails(setDoc(doc(db, 'events/bad-date'), { title: 'Invalid date', eventDate: '2026-15-40', published: false }));
  await assertFails(setDoc(doc(db, 'events/bad-color'), { title: 'Invalid color', color: 'red', published: false }));
  await assertFails(setDoc(doc(db, 'leadership/bad-role'), { title: 'Invalid role', role: 'Administrator Supreme', published: false }));
  await assertSucceeds(setDoc(doc(db, 'pages/valid-slug'), { title: 'Valid', slug: 'valid-slug', body: 'Valid page body', published: false }));
  await assertSucceeds(setDoc(doc(db, 'events/valid-date'), { title: 'Valid event', description: 'Event details', location: 'Hall', eventDate: '2026-10-18', color: '#7B1C1C', published: false }));
  await assertFails(updateDoc(doc(db, 'events/valid-date'), { eventDate: '2026-02-40' }));
  await assertFails(deleteDoc(doc(db, 'pages/valid-slug')));
  await assertFails(deleteDoc(doc(db, 'events/valid-date')));
});

test('required CMS fields reject empty, whitespace-only and mismatched page identifiers', async () => {
  const db = admin.firestore();
  for (const [name, valid] of Object.entries(sample)) {
    const invalid = id => doc(db, name, name === 'pages' ? valid.slug : id);
    await assertFails(setDoc(invalid('missing-title'), { ...valid, title: '' }));
    await assertFails(setDoc(invalid('blank-title'), { ...valid, title: '   ' }));
    await assertFails(setDoc(invalid('missing-status'), Object.fromEntries(
      Object.entries(valid).filter(([key]) => key !== 'published')
    )));
    await assertFails(setDoc(invalid('invalid-status'), { ...valid, published: 'true' }));
    // Each collection must have all fields that its CMS editor marks required.
    const required = {
      news: ['excerpt'], events: ['description','eventDate','location'],
      pages: ['slug','body'], societies: ['description'], sports: ['description'],
      leadership: ['role'], pastPapers: ['exam', 'subject', 'year', 'language', 'url'],
    }[name];
    for (const key of required) {
      await assertFails(setDoc(invalid('missing-'+key), Object.fromEntries(
        Object.entries(valid).filter(([field]) => field !== key)
      )));
      await assertFails(setDoc(invalid('empty-'+key), { ...valid, [key]: '' }));
    }
  }
  await assertFails(setDoc(doc(db, 'pages/slug-not-equal-id'), {
    title: 'Page', body: 'Real body', slug: 'different-slug', published: true,
  }));
  await assertSucceeds(setDoc(doc(db, 'pages/matched-slug'), {
    title: 'Page', body: 'Real body', slug: 'matched-slug', published: false,
  }));
  await assertFails(deleteDoc(doc(db, 'pages/matched-slug')));
});

test('multiline editorial content is allowed, but whitespace-only bodies are rejected', async () => {
  const db = admin.firestore();
  const record = doc(db, 'pages/multiline-page');
  await assertSucceeds(setDoc(record, {
    title: 'Valid multi-line page', slug: 'multiline-page',
    body: 'First paragraph.\n\nSecond paragraph.', published: false,
  }));
  await assertFails(updateDoc(record, { body: ' \n \t ' }));
  await assertFails(deleteDoc(record));
});

test('RBAC: role writes are server-only, even for a signed-in Super Admin', async () => {
  const accounts = collection(superAdmin.firestore(), 'admins');
  await assertSucceeds(getDocs(accounts));
  await assertFails(getDocs(collection(publisher.firestore(), 'admins')));
  await assertFails(getDocs(collection(editor.firestore(), 'admins')));
  await assertFails(getDocs(collection(admin.firestore(), 'admins')));
  await assertFails(getDoc(doc(editor.firestore(), 'admins/verified-owner')));
  await assertSucceeds(getDoc(doc(superAdmin.firestore(), 'admins/verified-admin')));

  const target = doc(superAdmin.firestore(), 'admins/new-staff-uid');
  await assertFails(setDoc(doc(admin.firestore(), 'admins/another-staff'), { role: 'editor' }));
  await assertFails(setDoc(doc(superAdmin.firestore(), 'admins/other-elevated'), {
    role: 'super_admin', createdAt: serverTimestamp(), createdBy: 'verified-owner',
    updatedAt: serverTimestamp(), updatedBy: 'verified-owner',
  }));
  await assertFails(setDoc(doc(superAdmin.firestore(), 'admins/verified-owner'), {
    role: 'admin', createdAt: serverTimestamp(), createdBy: 'verified-owner',
    updatedAt: serverTimestamp(), updatedBy: 'verified-owner',
  }));
  await assertFails(setDoc(target, {
    role: 'editor', createdAt: serverTimestamp(), createdBy: 'verified-owner',
    updatedAt: serverTimestamp(), updatedBy: 'verified-owner',
  }));
  await assertFails(updateDoc(doc(superAdmin.firestore(), 'admins/verified-owner'), {
    role: 'admin', updatedAt: serverTimestamp(), updatedBy: 'verified-owner',
  }));
  await assertFails(updateDoc(doc(superAdmin.firestore(), 'admins/other-owner'), {
    role: 'admin', updatedAt: serverTimestamp(), updatedBy: 'verified-owner',
  }));
  await assertFails(deleteDoc(doc(superAdmin.firestore(), 'admins/other-owner')));
  await assertFails(updateDoc(target, { role: 'super_admin', updatedAt: serverTimestamp(), updatedBy: 'verified-owner' }));
  await assertFails(updateDoc(target, { role: 'admin', createdBy: 'forged-actor', updatedAt: serverTimestamp(), updatedBy: 'verified-owner' }));
  await assertFails(updateDoc(target, { role: 'publisher', updatedAt: serverTimestamp(), updatedBy: 'verified-owner' }));
  await assertFails(deleteDoc(doc(admin.firestore(), 'admins/new-staff-uid')));
  await assertFails(deleteDoc(target));
});

test('RBAC: editors manage drafts only, publishers publish but no client may hard delete', async () => {
  const id = 'draft-editor-rbac';
  const refEditor = doc(editor.firestore(), 'news', id);
  const refPublisher = doc(publisher.firestore(), 'news', id);
  const refAdmin = doc(admin.firestore(), 'news', id);
  await assertFails(setDoc(doc(editor.firestore(), 'news/editor-published'), {
    title: 'Cannot publish directly', excerpt: 'Draft only', published: true,
  }));
  await assertSucceeds(setDoc(refEditor, {
    title: 'Draft title', excerpt: 'Draft excerpt', published: false,
  }));
  await assertSucceeds(updateDoc(refEditor, { title: 'Edited draft' }));
  await assertFails(updateDoc(refEditor, { published: true }));
  await assertFails(updateDoc(refEditor, { rank: 7 }));
  await assertFails(updateDoc(refEditor, { publishedAt: serverTimestamp() }));
  await assertFails(deleteDoc(refEditor));
  await assertFails(updateDoc(refPublisher, { published: true, publishedAt: serverTimestamp() }));
  await environment.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'news', id), {
      title: 'Server-approved content', excerpt: 'Draft excerpt', published: true,
    });
  });
  await assertFails(updateDoc(refEditor, { title: 'Published content changed by editor' }));
  await assertFails(updateDoc(refPublisher, { title: 'Published content changed by publisher' }));
  await assertFails(updateDoc(refAdmin, { published: false, publishedAt: null }));
  await assertFails(deleteDoc(refPublisher));
  await assertFails(deleteDoc(refAdmin));
});

test('published ranking remains role-limited without permitting live content changes', async () => {
  const item = doc(admin.firestore(), 'news/published-news');
  await assertSucceeds(updateDoc(item, {
    rank: 3, updatedAt: serverTimestamp(), updatedBy: 'verified-admin',
  }));
  await assertFails(updateDoc(item, {
    title: 'Unreviewed live edit', updatedAt: serverTimestamp(), updatedBy: 'verified-admin',
  }));
  await assertFails(updateDoc(doc(editor.firestore(), 'news/published-news'), {
    rank: 1, updatedAt: serverTimestamp(), updatedBy: 'ordinary-editor',
  }));
});

test('RBAC: direct Firebase Storage writes are admin-only; editors use the Drive API', async () => {
  const image = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const adminId = 'public/rbac-admin-create.png';
  const ownerId = 'public/rbac-owner-create.png';
  const editorId = 'public/rbac-editor-create.png';
  const publisherId = 'public/rbac-publisher-create.png';
  // An emulator overwrite can be evaluated as CREATE; do not allow any
  // non-admin Storage write while that distinction is unreliable.
  await assertFails(uploadBytes(ref(editor.storage(), editorId), image, { contentType: 'image/png' }));
  await assertFails(uploadBytes(ref(publisher.storage(), publisherId), image, { contentType: 'image/png' }));
  await assertFails(uploadBytes(ref(auditor.storage(), 'public/rbac-auditor.png'), image, { contentType: 'image/png' }));
  await assertSucceeds(uploadBytes(ref(admin.storage(), adminId), image, { contentType: 'image/png' }));
  await assertSucceeds(uploadBytes(ref(superAdmin.storage(), ownerId), image, { contentType: 'image/png' }));
  for (const id of [adminId, ownerId]) {
    await assertFails(uploadBytes(ref(editor.storage(), id), image, { contentType: 'image/png' }));
    await assertFails(uploadBytes(ref(publisher.storage(), id), image, { contentType: 'image/png' }));
  }
  await assertSucceeds(uploadBytes(ref(superAdmin.storage(), adminId), image, { contentType: 'image/png' }));
  await assertFails(deleteObject(ref(editor.storage(), adminId)));
  await assertFails(deleteObject(ref(publisher.storage(), ownerId)));
  for (const id of [adminId, ownerId]) await assertSucceeds(deleteObject(ref(superAdmin.storage(), id)));
});

test('role audit records cannot be forged or changed by client SDK', async () => {
  const record = doc(superAdmin.firestore(), 'roleAudit/integration-role-grant');
  const sampleAudit = {
    actorUid: 'verified-owner', targetUid: 'verified-admin', action: 'grant',
    beforeRole: null, afterRole: 'editor', createdAt: serverTimestamp(),
  };
  await assertFails(getDocs(collection(admin.firestore(), 'roleAudit')));
  await assertFails(setDoc(doc(admin.firestore(), 'roleAudit/forged'), sampleAudit));
  await assertFails(setDoc(doc(superAdmin.firestore(), 'roleAudit/impersonated'), {
    ...sampleAudit, actorUid: 'other-owner',
  }));
  await assertFails(setDoc(doc(superAdmin.firestore(), 'roleAudit/invalid-promotion'), {
    ...sampleAudit, afterRole: 'super_admin',
  }));
  // An audit record without the corresponding role change must be rejected.
  await assertFails(setDoc(record, sampleAudit));
  const batch = writeBatch(superAdmin.firestore());
  const target = doc(superAdmin.firestore(), 'admins/audit-tested-staff');
  batch.set(target, {
    role: 'editor', createdAt: serverTimestamp(), createdBy: 'verified-owner',
    updatedAt: serverTimestamp(), updatedBy: 'verified-owner',
  });
  batch.set(record, { ...sampleAudit, targetUid: 'audit-tested-staff' });
  await assertFails(batch.commit());
  await assertSucceeds(getDocs(collection(superAdmin.firestore(), 'roleAudit')));
  await assertFails(updateDoc(record, { afterRole: 'admin' }));
  await assertFails(deleteDoc(record));
});

test('server-owned CMS timestamps cannot be forged with client-controlled dates', async () => {
  const record = doc(admin.firestore(), 'news/audit-timestamp-integrity');
  const backdate = new Date('2020-01-01T00:00:00.000Z');
  await assertFails(setDoc(record, {
    title: 'Backdated record', excerpt: 'Invalid', published: false, createdAt: backdate,
  }));
  await assertSucceeds(setDoc(record, {
    title: 'Valid record', excerpt: 'Current', published: false,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(), publishedAt: null,
  }));
  await assertFails(updateDoc(record, { updatedAt: backdate }));
  await assertFails(updateDoc(record, { createdAt: backdate }));
  await assertSucceeds(updateDoc(record, { title: 'Legitimate update', updatedAt: serverTimestamp() }));
  await assertFails(deleteDoc(record));
});

test('publication transitions require a trusted server timestamp', async () => {
  const record = doc(admin.firestore(), 'news/audit-publication-integrity');
  await assertSucceeds(setDoc(record, {
    title: 'Unpublished', excerpt: 'Draft', published: false,
  }));
  await assertFails(updateDoc(record, { published: true }));
  await assertSucceeds(updateDoc(record, { published: true, publishedAt: serverTimestamp() }));
  await assertFails(updateDoc(record, { published: false }));
  await assertSucceeds(updateDoc(record, { published: false, publishedAt: null }));
  await assertFails(deleteDoc(record));
});

test('archived CMS records cannot be recreated, edited, published or deleted through the client SDK', async () => {
  const id = 'archived-write-guard';
  const record = doc(admin.firestore(), 'news', id);
  await assertSucceeds(setDoc(record, { title:'Safe', excerpt:'Archived draft', published:false }));
  await environment.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'cmsTrash/news_' + id), {
      kind:'news', recordId:id, archivedBy:'verified-admin',
    });
  });
  await assertFails(updateDoc(record, { title:'Tampered while archived' }));
  await assertFails(updateDoc(record, { published:true, publishedAt:serverTimestamp() }));
  await assertFails(deleteDoc(record));
  await assertFails(setDoc(record, { title:'Recreated', excerpt:'Bypassed archive', published:false }));
  // Trusted archive restoration removes cmsTrash before normal draft editing.
  await environment.withSecurityRulesDisabled(async context => {
    await deleteDoc(doc(context.firestore(), 'cmsTrash/news_' + id));
  });
  await assertSucceeds(updateDoc(record, { title:'Restored draft' }));
});
