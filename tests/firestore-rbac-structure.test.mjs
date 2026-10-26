import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');

test('Firestore rules have one policy block for each RBAC collection', () => {
  for (const path of ['admins/{uid}', 'roleAudit/{eventId}', '{document=**}']) {
    const escaped = path.replace(/[.*+?^\u0024{}()|[\]\\]/g, '\\$&');
    assert.equal((rules.match(new RegExp('match /' + escaped, 'g')) || []).length, 1,
      'Expected a single policy for ' + path);
  }
  assert.ok(rules.trimEnd().endsWith('}\n}'));
});

test('past-paper year and language schema remains complete', () => {
  assert.match(rules, /data\.year\.matches\('\^\(19\|20\)\[0-9\]\{2\}\$'\)/);
  assert.match(rules, /data\.language in \['Sinhala','Tamil','English'\]/);
});

test('every CMS collection is authorized consistently for reads and writes', () => {
  const expected = ['news', 'events', 'pages', 'societies', 'sports', 'leadership', 'pastPapers'];
  for (const action of ['get, list', 'create', 'update']) {
    const match = rules.match(new RegExp('allow ' + action + ': if collectionName in \\[([^\\]]+)\\]'));
    assert.ok(match, 'Missing collection policy for ' + action);
    const collections = [...match[1].matchAll(/'([^']+)'/g)].map(part => part[1]);
    assert.deepEqual(collections, expected, 'Mismatched CMS collections for ' + action);
  }
  assert.match(rules, /allow delete: if false;/);
  assert.match(rules, /notArchived\(collectionName,id\)/);
});

test('client SDK cannot modify roles or forge role-audit history', () => {
  assert.match(rules, /match \/admins\/\{uid\}/);
  assert.match(rules, /match \/roleAudit\/\{eventId\}/);
  const policies = [...rules.matchAll(/allow create, update, delete: if false;/g)];
  assert.ok(policies.length >= 2, 'Roles and audit writes must be server-only');
});
