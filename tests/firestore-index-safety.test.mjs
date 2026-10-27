import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {checkIndexSafety} from '../scripts/check-firestore-index-safety.mjs';

const proposed = JSON.parse(readFileSync(new URL('../firestore.indexes.json',import.meta.url),'utf8'));
const deep = x => JSON.parse(JSON.stringify(x));

test('unchanged index inventory is safe when scheduler index is included', () => {
  const result = checkIndexSafety(proposed,proposed);
  assert.equal(result.safe,true);
  assert.equal(result.cmsJobIndexPresent,true);
});
test('an existing index absent from source blocks index deployment', () => {
  const baseline = deep(proposed);
  baseline.indexes.push({
    collectionGroup:'news',queryScope:'COLLECTION',
    fields:[{fieldPath:'published',order:'ASCENDING'},{fieldPath:'createdAt',order:'DESCENDING'}],
  });
  const result = checkIndexSafety(baseline,proposed);
  assert.equal(result.safe,false);
  assert.equal(result.missingIndexes.length,1);
});
test('dropping field override or TTL configuration is blocked', () => {
  const baseline = deep(proposed);
  baseline.fieldOverrides = [{
    collectionGroup:'cmsAudit',fieldPath:'expiresAt',
    ttl:true,indexes:[],
  }];
  const result = checkIndexSafety(baseline,proposed);
  assert.equal(result.safe,false);
  assert.equal(result.missingOverrides.length,1);
});
test('a missing CMS scheduler composite index blocks deployment', () => {
  const result = checkIndexSafety(proposed,{indexes:[],fieldOverrides:[]});
  assert.equal(result.safe,false);
  assert.equal(result.cmsJobIndexPresent,false);
});
test('incomplete inventory fails closed', () => {
  assert.throws(()=>checkIndexSafety({},proposed),/must include indexes/);
  assert.throws(()=>checkIndexSafety({indexes:[],fieldOverrides:[]},{}),/must include indexes/);
  assert.throws(()=>checkIndexSafety({indexes:[{}],fieldOverrides:[]},proposed),/invalid composite/);
});
