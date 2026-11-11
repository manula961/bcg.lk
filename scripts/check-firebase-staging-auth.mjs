/**
 * Read-only Firebase staging authentication and Firestore security-rules audit.
 * All HTTP requests are identity-toolkit login or Firestore GET; no writes.
 * Intended for manually approved GitHub Actions environment "staging".
 * Refuses to run without distinct approved staging and production project IDs.
 */
import assert from 'node:assert/strict';

const required = name => {
  const v = process.env[name];
  if (!v || !v.trim()) throw Error('Missing required staging input: ' + name);
  return v.trim();
};
const staging = required('BCG_STAGING_PROJECT_ID');
const production = required('BCG_PRODUCTION_PROJECT_ID');
const supplied = required('BCG_STAGING_APPROVED_PROJECT_ID');
const consent = required('BCG_STAGING_READONLY_CONFIRMATION');
assert.match(staging, /^[a-z][a-z0-9-]{3,62}$/);
assert.equal(staging, supplied, 'The approved staging project ID must match exactly.');
assert.notEqual(staging, production, 'Staging and production must be separate projects.');
assert.notEqual(staging, 'demo-bcg-e2e', 'Cloud tests must not use the emulator ID.');
assert.equal(consent, 'RUN_READONLY_STAGING_AUTH', 'Explicit read-only staging approval is required.');
const apiKey = required('BCG_STAGING_WEB_API_KEY');
const roles = ['editor', 'publisher', 'admin', 'super_admin'];
const credentials = roles.map(role => ({
  role,
  email: required('BCG_STAGING_' + role.toUpperCase() + '_EMAIL'),
  password: required('BCG_STAGING_' + role.toUpperCase() + '_PASSWORD'),
}));
assert.equal(new Set(credentials.map(c => c.email.toLowerCase())).size, roles.length,
  'Each staging role must use a distinct test-only account.');

const fetchJson = async (url, opts={}) => {
  const response = await fetch(url, { ...opts, redirect: 'error', signal: AbortSignal.timeout(12000) });
  const json = await response.json().catch(() => ({}));
  return { status: response.status, json };
};
const root = 'https://firestore.googleapis.com/v1/projects/' + encodeURIComponent(staging) +
 '/databases/(default)/documents';
const authUrl = 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' +
 encodeURIComponent(apiKey);
const identity = [];
for (const {role,email,password} of credentials) {
  const response = await fetchJson(authUrl, {
    method: 'POST',
    headers: { 'content-type':'application/json' },
    body: JSON.stringify({email,password,returnSecureToken:true}),
  });
  assert.equal(response.status, 200, 'Staging Firebase Auth sign-in failed for role ' + role);
  const {idToken,localId,registered} = response.json;
  assert.ok(typeof idToken === 'string' && idToken.length > 50 && typeof localId === 'string');
  assert.notEqual(registered, false);
  const me = await fetchJson(root + '/admins/' + encodeURIComponent(localId),
    {headers:{authorization:'Bearer '+idToken}});
  assert.equal(me.status, 200, 'Own staging role document unavailable for '+role);
  assert.equal(me.json.fields?.role?.stringValue, role, 'Staging role mismatch for '+role);
  identity.push({role,localId,idToken});
  console.log('PASS staging Firebase sign-in and own role:',role);
}
const editor = identity.find(x=>x.role==='editor');
const other = identity.find(x=>x.role==='admin');
const stranger = await fetchJson(root+'/admins/'+encodeURIComponent(editor.localId));
assert.ok([401,403].includes(stranger.status), 'Anonymous role read must be denied.');
const crossRole = await fetchJson(root+'/admins/'+encodeURIComponent(other.localId),
  {headers:{authorization:'Bearer '+editor.idToken}});
assert.ok([401,403].includes(crossRole.status), 'Editor cannot read another admin role record.');
const adminListing = await fetchJson(root+'/admins?pageSize=1',
  {headers:{authorization:'Bearer '+editor.idToken}});
assert.ok([401,403].includes(adminListing.status), 'Editor cannot list administrator identities.');
console.log('PASS anonymous, cross-role and admin-list restrictions.');
console.log('READ-ONLY STAGING AUTH VERIFIED for approved project ID. No documents or users modified.');
