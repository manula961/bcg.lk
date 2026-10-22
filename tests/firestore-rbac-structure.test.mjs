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

test('role audit entries must be tied to a role write in the same transaction', () => {
  assert.match(rules, /existsAfter\(\/databases\/\$\(database\)\/documents\/admins/);
  assert.match(rules, /getAfter\(\/databases\/\$\(database\)\/documents\/admins/);
  assert.match(rules, /!existsAfter\(\/databases\/\$\(database\)\/documents\/admins/);
});
