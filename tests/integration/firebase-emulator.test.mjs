import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import {
  collection, doc, getDoc, getDocs, query, where, setDoc, updateDoc, deleteDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getBytes, deleteObject } from 'firebase/storage';

let environment;
let admin, editor, visitor;

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
  visitor = environment.unauthenticatedContext();
  await environment.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'admins/verified-admin'), { role: 'admin' });
    await setDoc(doc(context.firestore(), 'admins/ordinary-editor'), { role: 'editor' });
    await setDoc(doc(context.firestore(), 'news/published-news'), {
      title: 'Published', excerpt: 'Visible', category: 'News', published: true,
    });
    await setDoc(doc(context.firestore(), 'news/draft-news'), {
      title: 'Draft', excerpt: 'Private', category: 'News', published: false,
    });
    for (const name of ['events', 'pages', 'societies', 'sports', 'extracurricular', 'leadership']) {
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
  for (const name of ['news', 'events', 'pages', 'societies', 'sports', 'extracurricular', 'leadership']) {
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
  for (const name of ['news', 'events', 'pages', 'societies', 'sports', 'extracurricular', 'leadership']) {
    const id = 'integration-' + name;
    const record = doc(admin.firestore(), name, id);
    await assertFails(setDoc(doc(visitor.firestore(), name, id), { title: 'Unauthorized', published: true }));
    await assertFails(setDoc(doc(editor.firestore(), name, id), { title: 'Unauthorized', published: true }));
    await assertSucceeds(setDoc(record, { title: 'New', published: false }));
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

test('unknown Firestore paths are denied by default', async () => {
  await assertFails(getDoc(doc(visitor.firestore(), 'internal/private')));
  await assertFails(setDoc(doc(admin.firestore(), 'internal/private'), { value: 1 }));
});

test('Storage enforces admin uploads, allowed image types and 10 MiB size limit', async () => {
  const image = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const path = 'public/integration-upload.png';
  await assertFails(uploadBytes(ref(visitor.storage(), path), image, { contentType: 'image/png' }));
  await assertFails(uploadBytes(ref(editor.storage(), path), image, { contentType: 'image/png' }));
  await assertFails(uploadBytes(ref(admin.storage(), 'private/no.png'), image, { contentType: 'image/png' }));
  await assertFails(uploadBytes(ref(admin.storage(), 'public/not-image.txt'), image, { contentType: 'text/plain' }));
  await assertFails(uploadBytes(ref(admin.storage(), 'public/oversized.png'), new Uint8Array(10 * 1024 * 1024 + 1), { contentType: 'image/png' }));
  await assertSucceeds(uploadBytes(ref(admin.storage(), path), image, { contentType: 'image/png' }));
  await assertSucceeds(getBytes(ref(visitor.storage(), path)));
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
  await assertSucceeds(setDoc(record, { title: 'Owned', createdBy: 'verified-admin', updatedBy: 'verified-admin', published: false }));
  await assertFails(updateDoc(record, { createdBy: 'another-user' }));
  await assertFails(updateDoc(record, { updatedBy: 'another-user' }));
  await assertSucceeds(updateDoc(record, { title: 'Legitimate edit' }));
  await assertSucceeds(deleteDoc(record));
});

test('auditor has read-only draft visibility without publication or role management', async () => {
  await environment.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'admins/security-auditor'), { role: 'auditor' });
  });
  const auditor = environment.authenticatedContext('security-auditor');
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
  await assertSucceeds(setDoc(doc(db, 'pages/valid-slug'), { title: 'Valid', slug: 'valid-slug', published: false }));
  await assertSucceeds(setDoc(doc(db, 'events/valid-date'), { title: 'Valid event', eventDate: '2026-10-18', color: '#7B1C1C', published: false }));
  await assertFails(updateDoc(doc(db, 'events/valid-date'), { eventDate: '2026-02-40' }));
  await assertSucceeds(deleteDoc(doc(db, 'pages/valid-slug')));
  await assertSucceeds(deleteDoc(doc(db, 'events/valid-date')));
});
