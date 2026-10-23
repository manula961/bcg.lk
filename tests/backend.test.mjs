import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('Firestore denies unknown paths and protects administrator records', () => {
  const rules = read('firestore.rules');
  assert.match(rules, /match \/admins\/\{uid\}/);
  assert.match(rules, /allow list: if isSuperAdmin\(\);/);
  assert.match(rules, /allow create, update, delete: if false;/);
  assert.match(rules, /match \/roleAudit\/\{eventId\}/);
  assert.match(rules, /match \/\{document=\*\*\} \{ allow read, write: if false; \}/);
});

test('Firestore content writes require administrator authorization and schema validation', () => {
  const rules = read('firestore.rules');
  assert.match(rules, /function isAdmin\(\)/);
  assert.match(rules, /function validRecord\(data, collectionName, id\)/);
  assert.match(rules, /allow create: if collectionName in/);
  assert.match(rules, /&& canWriteContent\(\) && validRecord\(request\.resource\.data, collectionName, id\)/);
  assert.match(rules, /canPublishContent\(\) \|\| editorDraftUpdateOnly\(\)/);
  assert.match(rules, /allow update: if collectionName in/);
  assert.match(rules, /&& validUpdateOwnership\(\)/);
  for (const name of ['news', 'events', 'pages', 'societies', 'sports', 'leadership']) {
    assert.ok(rules.includes("collectionName == '" + name + "'"), 'Missing collection policy: ' + name);
  }
  assert.doesNotMatch(rules, /extracurricular/);
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

// Prevent accidentally committed conflict markers from breaking builds.
test('source files must not contain unresolved Git conflict markers', async () => {
  const { readdirSync, readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const root = fileURLToPath(new URL('../src/', import.meta.url));
  const conflicts = [];
  function visit(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const location = join(dir, entry.name);
      if (entry.isDirectory()) visit(location);
      else if (entry.isFile() && /\.(?:js|jsx|ts|tsx|css|json)$/.test(entry.name)) {
        const content = readFileSync(location, 'utf8');
        content.split(/\r?\n/).forEach((line, index) => {
          if (/^(?:<{7}|={7}|>{7})(?: |$)/.test(line)) conflicts.push(location + ':' + (index + 1));
        });
      }
    }
  }
  visit(root);
  assert.deepEqual(conflicts, [], 'Unresolved merge markers detected in: ' + conflicts.join(', '));
});


test('Firestore validates important content formats beyond text lengths', () => {
  const rules = read('firestore.rules');
  for (const policy of ['validHttpsUrl', 'validSlug', 'validEventDate', 'validHexColor', 'validNewsCategory', 'validLeaderRole']) {
    assert.ok(rules.includes('function ' + policy + '('), 'Missing validation: ' + policy);
  }
});
