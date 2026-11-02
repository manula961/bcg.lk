import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('CMS documentation matches the actual draft-only SDK and server-owned publishing rules',()=>{
  const rules=source('firestore.rules');
  const ui=source('src/admin/ContentManager.jsx');
  const docs=source('docs/CMS-WORKFLOW-IMPLEMENTATION.md');
  assert.match(rules,/request\.resource\.data\.published == false/);
  assert.match(rules,/resource\.data\.published == true/);
  assert.match(ui,/performEditorialAction/);
  assert.match(ui,/submit.*Review.*Publish|Submit \/ Review \/ Publish/);
  assert.match(docs,/Browser SDK writes remain available for \*\*draft creation and draft editing\*\*/);
  assert.match(docs,/production Firestore rule releases \*\*may still be older\*\*/);
  assert.doesNotMatch(docs,/legacy direct Firebase SDK writes are still authorized.*bypass editorial approval/i);
});

test('role recovery docs no longer give false advice about current browser writes',()=>{
  const rules=source('firestore.rules');
  const role=source('src/admin/RoleManager.jsx');
  const docs=source('docs/RELEASE-RECOVERY.md');
  assert.match(rules,/match \/admins\/\{uid\}/);
  assert.match(rules,/allow create, update, delete: if false/);
  assert.match(role,/fetch\('\/api\/admin\/users'/);
  assert.match(docs,/before merging/i);
  assert.match(docs,/server-owned \/api\/admin\/users/);
  assert.doesNotMatch(docs,/still uses client Firestore role writes/);
});
