import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import {
  collection, doc, getDoc, getDocs, query, where, setDoc, updateDoc, deleteDoc, serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getBytes, listAll, deleteObject } from 'firebase/storage';

const sample = {
  news: { title: 'New', excerpt: 'Summary', category: 'News', published: false },
  events: { title: 'New', description: 'Event details', eventDate: '2026-10-18', location: 'Main Hall', published: false },
  pages: { title: 'New', slug: 'integration-pages', body: 'Page body', published: false },
  societies: { title: 'New', description: 'Society details', published: false },
  sports: { title: 'New', description: 'Sport details', published: false },
  leadership: { title: 'New', role: 'Principal', published: false },
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
    for (const name of ['events', 'pages', 'societies', 'sports', 'leadership']) {
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
  for (const name of ['news', 'events', 'pages', 'societies', 'sports', 'leadership']) {
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

test('non-admin writes fail; administrator can create, edit, publish, unpublish, delete', async () => {
  for (const name of ['news', 'events', 'pages', 'societies', 'sports', 'leadership']) {
    const id = 'integration-' + name;
    const record = doc(admin.firestore(), name, id);
    await assertFails(setDoc(doc(visitor.firestore(), name, id), { title: 'Unauthorized', published: true }));
    await assertFails(setDoc(doc(editor.firestore(), name, id), { title: 'Unauthorized', published: true }));
    await assertSucceeds(setDoc(record, sample[name]));
    await assertFails(getDoc(doc(visitor.firestore(), name, id)));
    await assertSucceeds(updateDoc(record, { title: 'Edited', published: true }));
    await assertSucceeds(getDoc(doc(visitor.firestore(), name, id)));
    await assertFails(updateDoc(doc(editor.firestore(), name, id), { published: false }));
    await assertSucceeds(updateDoc(record, { published: false }));
    await assertFails(getDoc(doc(visitor.firestore(), name, id)));
    await assertFails(deleteDoc(doc(editor.firestore(), name, id)));
    await assertSucceeds(deleteDoc(record));
  }
});

test('retired Extracurricular collection is not accessible to clients', async () => {
  const record = doc(admin.firestore(), 'extracurricular/archived-activity');
  await assertFails(setDoc(record, { title: 'Retired', description: 'Inactive collection', published: false }));
  await assertFails(getDoc(record));
  await assertFails(getDoc(doc(visitor.firestore(), 'extracurricular/archived-activity')));
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
  await assertSucceeds(deleteDoc(record));
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
  await assertSucceeds(deleteDoc(doc(db, 'pages/valid-slug')));
  await assertSucceeds(deleteDoc(doc(db, 'events/valid-date')));
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
      leadership: ['role'],
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
    title: 'Page', body: 'Real body', slug: 'matched-slug', published: true,
  }));
  await assertSucceeds(deleteDoc(doc(db, 'pages/matched-slug')));
});

test('multiline editorial content is allowed, but whitespace-only bodies are rejected', async () => {
  const db = admin.firestore();
  const record = doc(db, 'pages/multiline-page');
  await assertSucceeds(setDoc(record, {
    title: 'Valid multi-line page', slug: 'multiline-page',
    body: 'First paragraph.\n\nSecond paragraph.', published: true,
  }));
  await assertFails(updateDoc(record, { body: ' \n \t ' }));
  await assertSucceeds(deleteDoc(record));
});

test('RBAC: super-admin alone can manage nonprivileged role grants', async () => {
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
  await assertSucceeds(setDoc(target, {
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
  await assertSucceeds(updateDoc(target, { role: 'publisher', updatedAt: serverTimestamp(), updatedBy: 'verified-owner' }));
  await assertFails(deleteDoc(doc(admin.firestore(), 'admins/new-staff-uid')));
  await assertSucceeds(deleteDoc(target));
});

test('RBAC: editors manage drafts only, publishers can publish but cannot delete', async () => {
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
  await assertSucceeds(updateDoc(refPublisher, { published: true }));
  await assertFails(updateDoc(refEditor, { title: 'Published content changed by editor' }));
  await assertFails(deleteDoc(refPublisher));
  await assertSucceeds(deleteDoc(refAdmin));
});

test('Storage restricts all direct media writes to administrators', async () => {
  const image = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const adminId = 'public/rbac-admin-create.png';
  const ownerId = 'public/rbac-owner-create.png';
  await assertFails(uploadBytes(ref(editor.storage(), 'public/rbac-editor-create.png'), image, { contentType: 'image/png' }));
  await assertFails(uploadBytes(ref(publisher.storage(), 'public/rbac-publisher-create.png'), image, { contentType: 'image/png' }));
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
  await assertSucceeds(deleteObject(ref(admin.storage(), adminId)));
  await assertSucceeds(deleteObject(ref(superAdmin.storage(), ownerId)));
});

test('role audit records are append-only, actor-bound and super-admin readable', async () => {
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
  await assertSucceeds(setDoc(record, sampleAudit));
  await assertSucceeds(getDocs(collection(superAdmin.firestore(), 'roleAudit')));
  await assertFails(updateDoc(record, { afterRole: 'admin' }));
  await assertFails(deleteDoc(record));
});
