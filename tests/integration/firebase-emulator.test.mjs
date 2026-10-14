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
    for (const name of ['events', 'pages', 'societies']) {
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
  for (const name of ['news', 'events', 'pages', 'societies']) {
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
  for (const name of ['news', 'events', 'pages']) {
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
