/**
 * Read-only audit for the EXISTING Firebase project. Never writes records or rules.
 * Run locally with an OAuth access token scoped for Firestore/Rules read operations.
 * Required: FIREBASE_PROJECT_ID, FIREBASE_AUDIT_ACCESS_TOKEN,
 *           BCG_READONLY_AUDIT=YES
 * Optional: BCG_AUDIT_INCLUDE_IDS=YES (prints only document IDs for repairs)
 *           FIREBASE_STORAGE_BUCKET (also compare deployed Storage rules, read-only)
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { CMS_REQUIRED_FIELDS, validateCmsRecord } from './firestore-record-validation.mjs';
const project = process.env.FIREBASE_PROJECT_ID || '';
const token = process.env.FIREBASE_AUDIT_ACCESS_TOKEN || '';
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || '';
if (storageBucket && !/^[a-z0-9][a-z0-9.-]{1,250}[a-z0-9]$/.test(storageBucket)) {
  throw new Error('FIREBASE_STORAGE_BUCKET must be a valid bucket hostname.');
}
if (process.env.BCG_READONLY_AUDIT !== 'YES' ||
    !/^[a-z][a-z0-9-]{4,62}$/.test(project) || !token) {
  throw new Error('Explicit BCG_READONLY_AUDIT=YES, FIREBASE_PROJECT_ID, and FIREBASE_AUDIT_ACCESS_TOKEN are required.');
}
const authHeaders = { Authorization: 'Bearer ' + token };
async function getJson(url) {
  const response = await fetch(url, { method: 'GET', headers: authHeaders, redirect: 'error' });
  if (!response.ok) throw new Error('Read-only Firebase API request rejected (HTTP ' + response.status + '). Check IAM permissions.');
  return response.json();
}
const result = {};
for (const kind of Object.keys(CMS_REQUIRED_FIELDS)) {
  let count = 0, broken = 0, pageToken;
  const reasons = {};
  do {
    const endpoint = new URL('https://firestore.googleapis.com/v1/projects/' +
      encodeURIComponent(project) + '/databases/(default)/documents/' + kind);
    endpoint.searchParams.set('pageSize', '250');
    if (pageToken) endpoint.searchParams.set('pageToken', pageToken);
    const response = await getJson(endpoint);
    for (const doc of response.documents || []) {
      ++count;
      const id = decodeURIComponent(doc.name.split('/').pop());
      const problems = validateCmsRecord(kind, id, doc.fields || {});
      if (problems.length) {
        ++broken;
        for (const problem of problems) reasons[problem] = (reasons[problem] || 0) + 1;
        if (process.env.BCG_AUDIT_INCLUDE_IDS === 'YES')
          console.log(kind + '/' + id + ' : ' + problems.join('; '));
      }
    }
    pageToken = response.nextPageToken;
  } while (pageToken);
  result[kind] = { records: count, incompatible: broken, reasons };
}
console.log('Firestore compatibility summary (no document contents):');
console.log(JSON.stringify(result, null, 2));
const normalized = text => text.replace(/\r\n/g, '\n').trimEnd();
const hash = text => createHash('sha256').update(normalized(text)).digest('hex');
let rulesVerified = false;
try {
  const release = await getJson('https://firebaserules.googleapis.com/v1/projects/' +
    encodeURIComponent(project) + '/releases/cloud.firestore');
  if (!release.rulesetName) throw Error('Rules release did not contain rulesetName');
  const deployed = await getJson('https://firebaserules.googleapis.com/v1/' + release.rulesetName);
  const candidates = deployed.source?.files || [];
  const live = candidates.find(f => f.name?.endsWith('firestore.rules')) || candidates[0];
  if (typeof live?.content !== 'string') throw Error('No deployed Firestore rule source');
  rulesVerified = hash(live.content) === hash(readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'));
  console.log('Deployed Firestore rules match repository source:', rulesVerified);
} catch (error) {
  console.warn('Could not independently read deployed Firestore rules:', error.message);
}
// The Firebase Storage release is named firebase.storage/<bucket>. Keep this
// optional for projects where the read-only principal lacks Storage Rules
// access. A missing or mismatched release is reported as UNVERIFIED, not fixed.
let storageRulesVerified = null;
if (storageBucket) {
  storageRulesVerified = false;
  try {
    const endpoint = 'https://firebaserules.googleapis.com/v1/projects/' +
      encodeURIComponent(project) + '/releases/firebase.storage/' +
      encodeURIComponent(storageBucket);
    const release = await getJson(endpoint);
    if (!release.rulesetName) throw Error('Storage release did not contain rulesetName');
    const deployed = await getJson('https://firebaserules.googleapis.com/v1/' + release.rulesetName);
    const candidates = deployed.source?.files || [];
    const live = candidates.find(file => file.name?.endsWith('storage.rules')) || candidates[0];
    if (typeof live?.content !== 'string') throw Error('No deployed Storage rule source');
    storageRulesVerified = hash(live.content) === hash(readFileSync(new URL('../storage.rules', import.meta.url), 'utf8'));
    console.log('Deployed Storage rules match repository source:', storageRulesVerified);
  } catch (error) {
    console.warn('Could not independently verify deployed Storage rules:', error.message);
  }
} else {
  console.log('Storage rules parity: NOT CHECKED (set FIREBASE_STORAGE_BUCKET to verify).');
}
if (Object.values(result).some(section => section.incompatible > 0)) process.exitCode = 2;
if (!rulesVerified) process.exitCode = process.exitCode || 3;
if (storageBucket && !storageRulesVerified) process.exitCode = process.exitCode || 4;
