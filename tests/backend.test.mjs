import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('Firestore denies unknown paths and protects administrator records', () => {
  const rules = read('firestore.rules');
  assert.match(rules, /match \/admins\/\{uid\}/);
  assert.match(rules, /allow list, create, update, delete: if false;/);
  assert.match(rules, /match \/\{document=\*\*\} \{ allow read, write: if false; \}/);
});

test('Firestore content writes require administrator authorization', () => {
  const rules = read('firestore.rules');
  for (const name of ['news', 'events', 'pages']) {
    assert.match(rules, new RegExp('match /' + name + '/\\{id\\} \\{[\\s\\S]*?allow create, update, delete: if isAdmin\\(\\);'));
  }
});

test('Storage only permits limited images to admins and denies all other paths', () => {
  const rules = read('storage.rules');
  assert.match(rules, /request\.resource\.size < 10 \* 1024 \* 1024/);
  assert.match(rules, /image\/\(jpeg\|png\|webp\|gif\)/);
  assert.match(rules, /match \/\{allPaths=\*\*\} \{ allow read, write: if false; \}/);
});

test('Firebase credentials are loaded from environment, not embedded in source', () => {
  const source = read('src/lib/firebase.js');
  for (const key of ['API_KEY', 'AUTH_DOMAIN', 'PROJECT_ID', 'STORAGE_BUCKET', 'MESSAGING_SENDER_ID', 'APP_ID']) {
    assert.ok(source.includes('import.meta.env.VITE_FIREBASE_' + key));
  }
});
