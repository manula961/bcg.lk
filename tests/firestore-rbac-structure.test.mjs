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

test('client SDK cannot modify roles or forge role-audit history', () => {
  assert.match(rules, /match \/admins\/\{uid\}/);
  assert.match(rules, /match \/roleAudit\/\{eventId\}/);
  const policies = [...rules.matchAll(/allow create, update, delete: if false;/g)];
  assert.ok(policies.length >= 2, 'Roles and audit writes must be server-only');
});
