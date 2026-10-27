import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildTrashListQuery} from '../api/_lib/cms-workflow.mjs';

const project = 'staging-bcg-school';
const client = readFileSync(new URL('../src/lib/cmsWorkflowClient.js',import.meta.url),'utf8');

test('first archive page selects only the matching kind and stable document order', () => {
  const query = buildTrashListQuery('news','',project);
  assert.equal(query.limit,200);
  assert.deepEqual(query.from,[{collectionId:'cmsTrash'}]);
  assert.equal(query.where.fieldFilter.value.stringValue,'news');
  assert.equal(query.orderBy[0].field.fieldPath,'__name__');
  assert.equal(query.startAt,undefined);
});

test('archive pagination resumes strictly after the matching composite document ID', () => {
  const query = buildTrashListQuery('pastPapers','pastPapers_abc-123',project);
  assert.equal(query.startAt.before,false);
  assert.equal(query.startAt.values[0].referenceValue,
    'projects/' + project + '/databases/(default)/documents/cmsTrash/pastPapers_abc-123');
});

test('long valid record IDs are valid archive cursors', () => {
  const query = buildTrashListQuery('leadership','leadership_' + 'a'.repeat(150),project);
  assert.equal(query.startAt.values[0].referenceValue.endsWith('leadership_'+'a'.repeat(150)),true);
});

test('cursor injection, invalid kind and cross-kind cursors are rejected', () => {
  for (const cursor of ['news_../../admins','../news_abc','events_abc','news_','news_💥','news_'+ 'a'.repeat(151)]) {
    assert.throws(() => buildTrashListQuery('news',cursor,project),
      /Invalid archive pagination cursor/);
  }
  assert.throws(() => buildTrashListQuery('adminUsers','',project),
    /Invalid CMS collection/);
  assert.throws(() => buildTrashListQuery('news','news_abc',''),
    /Archive pagination project is not configured/);
});

test('archive client fetches all pages, detects duplicates and fails closed on errors', () => {
  assert.match(client,/for \(let page = 0; page < 40; page \+= 1\)/);
  assert.match(client,/visited\.has\(data\.nextCursor\)/);
  assert.match(client,/ids\.add\(id\)/);
  assert.match(client,/if \(data\.nextCursor == null\) return \[\.\.\.ids\]/);
  assert.match(client,/Admin session changed while checking deleted records/);
  assert.match(client,/More than 8,000 archived records require/);
  assert.doesNotMatch(client,/data\.truncated/);
});
