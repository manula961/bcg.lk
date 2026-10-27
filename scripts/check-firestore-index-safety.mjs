/**
 * Fail-closed preflight before managing Firestore indexes.
 * Firebase deploy can delete indexes omitted from firestore.indexes.json.
 * Feed this the current project's owner-approved index inventory/export.
 * This program reads files only: it does not call Firebase or deploy anything.
 */
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

function parseInventory(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      !Array.isArray(value.indexes) || !Array.isArray(value.fieldOverrides))
    throw new Error(label + ' must include indexes[] and fieldOverrides[].');
  return value;
}
function indexKey(index) {
  if (typeof index.collectionGroup !== 'string' ||
      typeof index.queryScope !== 'string' || !Array.isArray(index.fields))
    throw new Error('Index inventory contains an invalid composite index.');
  return JSON.stringify({
    collectionGroup:index.collectionGroup,queryScope:index.queryScope,
    fields:index.fields.map(f=>({
      fieldPath:f.fieldPath,order:f.order || null,arrayConfig:f.arrayConfig || null,
      vectorConfig:f.vectorConfig || null,
    })),
  });
}
function overrideKey(value) {
  if (typeof value.fieldPath !== 'string' || !Array.isArray(value.indexes))
    throw new Error('Index inventory contains an invalid field override.');
  return JSON.stringify({fieldPath:value.fieldPath,indexes:value.indexes,ttl:value.ttl || null});
}
export function checkIndexSafety(deployed, proposed) {
  const previous = parseInventory(deployed,'Existing project index inventory');
  const next = parseInventory(proposed,'Proposed index inventory');
  const nextIndexes = new Set(next.indexes.map(indexKey));
  const nextOverrides = new Set(next.fieldOverrides.map(overrideKey));
  const missingIndexes = previous.indexes.filter(x=>!nextIndexes.has(indexKey(x)));
  const missingOverrides = previous.fieldOverrides.filter(x=>!nextOverrides.has(overrideKey(x)));
  const cmsJobIndexPresent = next.indexes.some(x =>
    x.collectionGroup === 'cmsJobs' && x.queryScope === 'COLLECTION' &&
    x.fields.length === 2 &&
    x.fields[0].fieldPath === 'status' && x.fields[0].order === 'ASCENDING' &&
    x.fields[1].fieldPath === 'runAt' && x.fields[1].order === 'ASCENDING'
  );
  return {
    safe:!missingIndexes.length && !missingOverrides.length && cmsJobIndexPresent,
    missingIndexes:missingIndexes.map(indexKey),
    missingOverrides:missingOverrides.map(overrideKey),
    cmsJobIndexPresent,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const baseline = process.argv[2];
  if (!baseline) {
    console.error('BLOCKED: provide an owner-verified current Firestore index JSON inventory as argument.');
    process.exitCode = 2;
  } else {
    try {
      const existing = JSON.parse(readFileSync(baseline,'utf8'));
      const proposed = JSON.parse(readFileSync(new URL('../firestore.indexes.json',import.meta.url),'utf8'));
      const result = checkIndexSafety(existing,proposed);
      if (!result.safe) {
        console.error('BLOCKED: proposed firestore.indexes.json could remove existing indexes or TTL/field overrides.');
        console.error('Missing composite definitions:',result.missingIndexes.length);
        console.error('Missing field overrides:',result.missingOverrides.length);
        console.error('Required CMS scheduler index present:',result.cmsJobIndexPresent);
        process.exitCode = 1;
      } else {
        console.log('PASS: existing index definitions and field overrides are retained.');
        console.log('NOTE: this does not verify that the index has finished building or that deployed rules match.');
      }
    } catch (error) {
      console.error('BLOCKED: invalid or unreadable index inventory:',error.message);
      process.exitCode = 2;
    }
  }
}
