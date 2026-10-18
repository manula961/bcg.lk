/**
 * Read-only audit for the EXISTING Firebase project. Never writes records or rules.
 * Run locally with an OAuth access token scoped for Firestore/Rules read operations.
 * Required: FIREBASE_PROJECT_ID, FIREBASE_AUDIT_ACCESS_TOKEN,
 *           BCG_READONLY_AUDIT=YES
 * Optional: BCG_AUDIT_INCLUDE_IDS=YES (prints only document IDs for repairs)
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const collections = {
  news: ['title', 'excerpt'],
  events: ['title', 'eventDate', 'location', 'description'],
  pages: ['title', 'slug', 'body'],
  societies: ['title', 'description'],
  sports: ['title', 'description'],
  extracurricular: ['title', 'description'],
  leadership: ['title', 'role'],
};
const project = process.env.FIREBASE_PROJECT_ID || '';
const token = process.env.FIREBASE_AUDIT_ACCESS_TOKEN || '';
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
const field = (fields, key) => fields?.[key];
const value = entry => {
  if (!entry) return undefined;
  if ('stringValue' in entry) return entry.stringValue;
  if ('booleanValue' in entry) return entry.booleanValue;
  return undefined;
};
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
function violations(kind, id, fields) {
  const failures = [];
  if (value(field(fields, 'published')) !== true &&
      value(field(fields, 'published')) !== false) failures.push('published must be a boolean');
  for (const key of collections[kind]) {
    if (!nonempty(value(field(fields, key)))) failures.push(key + ' must be nonempty');
  }
  if (kind === 'pages') {
    const slug = value(field(fields, 'slug'));
    if (slug !== id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug || ''))
      failures.push('slug must equal the document ID');
  }
  if (kind === 'events') {
    const dateText = value(field(fields, 'eventDate'));
    if (nonempty(dateText)) {
      const date = new Date(dateText + 'T00:00:00.000Z');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText) || !Number.isFinite(date.getTime()) ||
          date.toISOString().slice(0, 10) !== dateText) failures.push('invalid calendar date');
    }
  }
  for (const key of ['imageUrl', 'websiteUrl']) {
    const url = value(field(fields, key));
    if (url && (!/^https:\/\//i.test(url) || /\s|@/.test(url))) failures.push(key + ' must be HTTPS without credentials');
  }
  return failures;
}

const result = {};
for (const kind of Object.keys(collections)) {
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
      const problems = violations(kind, id, doc.fields || {});
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
let rulesVerified = false;
try {
  const release = await getJson('https://firebaserules.googleapis.com/v1/projects/' +
    encodeURIComponent(project) + '/releases/cloud.firestore');
  if (!release.rulesetName) throw Error('Rules release did not contain rulesetName');
  const deployed = await getJson('https://firebaserules.googleapis.com/v1/' + release.rulesetName);
  const candidates = deployed.source?.files || [];
  const live = candidates.find(f => f.name?.endsWith('firestore.rules')) || candidates[0];
  if (typeof live?.content !== 'string') throw Error('No deployed Firestore rule source');
  const normalized = text => text.replace(/\r\n/g, '\n').trimEnd();
  const hash = text => createHash('sha256').update(normalized(text)).digest('hex');
  rulesVerified = hash(live.content) === hash(readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'));
  console.log('Deployed Firestore rules match repository source:', rulesVerified);
} catch (error) {
  console.warn('Could not independently read deployed Firestore rules:', error.message);
}
if (Object.values(result).some(section => section.incompatible > 0)) process.exitCode = 2;
if (!rulesVerified) process.exitCode = process.exitCode || 3;
