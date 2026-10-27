import { createSign, randomUUID, createHash, timingSafeEqual } from 'node:crypto';
import { validateCmsPatch, validateCmsRecord } from './cms-schema.mjs';

/**
 * BCG editorial workflow, additive to existing browser-side CMS.
 * All privileged mutations use a service account, optimistic concurrency
 * preconditions, immutable audit/revision documents, and live Auth+role checks.
 * It never changes the public CMS schema or its visual presentation.
 */
const KINDS = Object.freeze(['news', 'events', 'pages', 'societies', 'sports', 'leadership', 'pastPapers']);
const ROLES = Object.freeze(['super_admin', 'admin', 'publisher', 'editor', 'auditor']);
const WRITE = new Set(['super_admin', 'admin', 'publisher', 'editor']);
const PUBLISH = new Set(['super_admin', 'admin', 'publisher']);
const ADMIN = new Set(['super_admin', 'admin']);
const FIELDS = Object.freeze({
  news: { title:180, excerpt:500, body:30000, category:32, tag:80, imageUrl:2048 },
  events: { title:180, description:3000, eventDate:10, location:200, color:7, imageUrl:2048 },
  pages: { title:180, body:50000, seoDescription:320, imageUrl:2048 },
  societies: { title:180, description:1200, category:80, imageUrl:2048, websiteUrl:2048 },
  sports: { title:180, description:3000, category:80, achievements:2000, imageUrl:2048 },
  leadership: { title:180, description:1200, role:80, imageUrl:2048 },
  pastPapers: { title:180, exam:40, subject:120, year:4, language:20, term:80, url:2048 },
});
const UID = /^[A-Za-z0-9_-]{1,128}$/;
const ID = /^[A-Za-z0-9_-]{1,150}$/;
const BASE = 'https://firestore.googleapis.com/v1/';
const MAX_BODY = 65000;
let cachedToken = null;
let expiresAt = 0;
const fstr = value => ({ stringValue: String(value) });
const ftime = value => ({ timestampValue: value });
const fbool = value => ({ booleanValue: Boolean(value) });
const isoNow = () => new Date().toISOString();

export function failure(status, message) {
  return Object.assign(new Error(message), { status });
}
export function validateTarget(kind, id) {
  if (!KINDS.includes(kind) || !ID.test(id || ''))
    throw failure(400, 'Invalid collection or document ID.');
  return { kind, id };
}
export function validateEdit(kind, patch) {
  return validateCmsPatch(kind, patch);
}
export function validateSchedule(value, now = Date.now()) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value))
    throw failure(400, 'Use an ISO 8601 UTC publish time.');
  const time = Date.parse(value);
  if (!Number.isFinite(time)) throw failure(400, 'Invalid calendar date.');
  const canonical = new Date(time).toISOString();
  if ((canonical !== value && canonical !== value.replace(/Z$/, '.000Z')) ||
      time < now + 120000 || time > now + 90 * 86400000)
    throw failure(400, 'Schedule publication from 2 minutes to 90 days ahead.');
  return new Date(time).toISOString();
}
function config() {
  const project = process.env.FIREBASE_PROJECT_ID;
  const apiKey = process.env.FIREBASE_WEB_API_KEY || process.env.VITE_FIREBASE_API_KEY;
  if (!project || !/^[a-z][a-z0-9-]{3,62}$/.test(project) || !apiKey)
    throw failure(503, 'Firebase workflow is not configured.');
  return { project, apiKey };
}
function root() {
  return BASE + 'projects/' + encodeURIComponent(config().project) + '/databases/(default)/documents';
}
function name(path) {
  return 'projects/' + config().project + '/databases/(default)/documents/' + path;
}
function safeId(value) {
  if (!ID.test(value || '')) throw failure(400, 'Invalid document ID.');
  return value;
}
function keyFor(kind, id) { return kind + '_' + id; }
function targetPath(kind, id) { return kind + '/' + id; }
function workflowPath(kind,id) { return 'cmsWorkflow/' + keyFor(kind,id); }
function trashPath(kind,id) { return 'cmsTrash/' + keyFor(kind,id); }
function historyPath(kind,id) { return 'cmsHistory/' + keyFor(kind,id) + '/revisions'; }

async function request(url, options = {}) {
  const result = await fetch(url, { ...options, redirect:'error', signal:AbortSignal.timeout(12000) });
  const data = await result.json().catch(() => ({}));
  if (!result.ok) {
    if (result.status === 404) throw failure(404, 'Record not found.');
    if ([409,412].includes(result.status)) throw failure(409, 'Record changed; reload and retry.');
    throw failure([401,403].includes(result.status) ? 503 : 502, 'The backend request failed.');
  }
  return data;
}
function credential() {
  let account;
  try { account = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || ''); }
  catch { throw failure(503, 'Service account is not configured.'); }
  if (account?.type !== 'service_account' ||
      account.project_id !== config().project ||
      !account.client_email?.endsWith('.iam.gserviceaccount.com') ||
      typeof account.private_key !== 'string' || !account.private_key.includes('PRIVATE KEY'))
    throw failure(503, 'Service account does not match Firebase project.');
  return account;
}
export async function accessToken() {
  if (cachedToken && expiresAt > Date.now() + 60000) return cachedToken;
  const account = credential();
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({alg:'RS256',typ:'JWT'})).toString('base64url');
  const claims = Buffer.from(JSON.stringify({
    iss:account.client_email,scope:'https://www.googleapis.com/auth/datastore',
    aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600
  })).toString('base64url');
  const signer = createSign('RSA-SHA256');
  signer.update(header+'.'+claims);
  signer.end();
  const assertion = header+'.'+claims+'.'+signer.sign(account.private_key).toString('base64url');
  const token = await request('https://oauth2.googleapis.com/token', {
    method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion}),
  });
  if (typeof token.access_token !== 'string' || !Number.isFinite(token.expires_in))
    throw failure(503, 'Service account authorization failed.');
  cachedToken = token.access_token;
  expiresAt = Date.now() + Math.min(token.expires_in,3500)*1000;
  return cachedToken;
}
async function authorized(path, options = {}) {
  const token = await accessToken();
  return request(root() + '/' + path, {
    ...options,
    headers: { Authorization:'Bearer '+token, ...(options.headers || {}) },
  });
}
async function find(path) {
  try { return await authorized(path); }
  catch (error) { if (error.status === 404) return null; throw error; }
}
async function commit(writes) {
  const token = await accessToken();
  return request(root() + ':commit', {
    method:'POST', headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({writes}),
  });
}
function change(path, previous, fields) {
  return {
    update:{name:name(path),fields},
    currentDocument:previous ? {updateTime:previous.updateTime} : {exists:false},
  };
}
function remove(path, previous) {
  return {delete:name(path),currentDocument:{updateTime:previous.updateTime}};
}
function audit(actor, kind, id, action, at, metadata = {}) {
  return change('cmsAudit/'+randomUUID(), null, {
    actorUid:fstr(actor),kind:fstr(kind),recordId:fstr(id),
    action:fstr(action),createdAt:ftime(at),
    metadata:fstr(JSON.stringify(metadata).slice(0,1800)),
  });
}
function revision(actor,kind,id,record,at,reason) {
  return change(historyPath(kind,id)+'/'+randomUUID(),null,{
    actorUid:fstr(actor),reason:fstr(reason),createdAt:ftime(at),
    sourceUpdatedAt:fstr(record.updateTime),
    snapshot:fstr(JSON.stringify(record.fields || {})),
  });
}
function mediaRef(kind,id,record,at) {
  const fields = record.fields || {};
  return { update:{name:name('cmsMediaRefs/'+keyFor(kind,id)),fields:{
    kind:fstr(kind),recordId:fstr(id),imageUrl:fields.imageUrl || {nullValue:null},
    documentUrl:fields.url || {nullValue:null},updatedAt:ftime(at)
  }} };
}
function wfFields(existing,kind,id,fields) {
  return {
    ...(existing?.fields || {}),
    kind:fstr(kind),recordId:fstr(id),
    ...fields,
  };
}
function updatedContent(record, at, actor, patch) {
  return {
    ...record.fields, ...patch,
    updatedAt:ftime(at),updatedBy:fstr(actor),
  };
}
function status(record) { return record?.fields?.status?.stringValue || null; }
function field(record,key) { return record?.fields?.[key]?.stringValue || null; }
function requireRole(role,allow) {
  if (!allow.has(role)) throw failure(403,'Your current role cannot perform this action.');
}
function requireTarget(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw failure(400,'Invalid request body.');
  return validateTarget(body.kind,body.id);
}
function requireLiveRevision(doc,wf) {
  if (!wf || !['approved','scheduled'].includes(status(wf)) ||
      field(wf,'contentUpdateTime') !== doc?.updateTime)
    throw failure(409,'Content is not approved at its current revision. Submit for review again.');
}
async function readTarget(kind,id) {
  const doc = await find(targetPath(kind,id));
  if (!doc) throw failure(404,'Content record not found.');
  return doc;
}
function safeError(error) {
  return error?.status ? error : failure(502,'Workflow temporarily unavailable.');
}

export async function verifyEditor(req, method) {
  if (method === 'POST') {
    const allowed = process.env.USER_ADMIN_ORIGIN;
    if (!allowed || !/^https:\/\/[^/]+$/.test(allowed))
      throw failure(503,'Set USER_ADMIN_ORIGIN to the HTTPS console origin.');
    if (req.headers.origin !== allowed) throw failure(403,'Origin not permitted.');
  }
  const token = /^Bearer ([A-Za-z0-9._-]{20,5000})$/.exec(req.headers.authorization || '')?.[1];
  if (!token) throw failure(401,'Sign in to the admin console.');
  const {apiKey} = config();
  const auth = await request('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key='+
    encodeURIComponent(apiKey), {
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({idToken:token}),
    }).catch(()=>{throw failure(401,'Firebase session invalid or expired.');});
  const person = auth.users;
  if (!Array.isArray(person) || person.length !== 1 || !UID.test(person[0]?.localId || '') ||
      person[0].disabled === true) throw failure(401,'Firebase account disabled or invalid.');
  const response = await fetch(root() + '/admins/' + encodeURIComponent(person[0].localId), {
    headers:{Authorization:'Bearer '+token},redirect:'error',signal:AbortSignal.timeout(12000),
  });
  if (!response.ok) throw failure(403,'Admin role is not available.');
  const admin = await response.json();
  const role = admin.fields?.role?.stringValue;
  if (!ROLES.includes(role)) throw failure(403,'Admin role is not authorized.');
  return {uid:person[0].localId,role};
}

export async function workflowAction(body,actor) {
  const {kind,id} = requireTarget(body);
  const act = body.action;
  if (!['submit','approve','publish','unpublish','schedule','edit','proposeEdit','applyEdit','archive','restore','rollback'].includes(act))
    throw failure(400,'Unknown workflow action.');
  const at = isoNow();
  const path = targetPath(kind,id);
  const wfPath = workflowPath(kind,id);
  const existing = await find(path);
  const state = await find(wfPath);
  const writes = [];
  if (act === 'edit') {
    requireRole(actor.role,WRITE);
    if (!existing) throw failure(404,'Content not found.');
    if (existing.fields?.published?.booleanValue)
      throw failure(409,'Published content requires a separately approved edit proposal.');
    const patch = validateEdit(kind,body.patch);
    const after = updatedContent(existing,at,actor.uid,patch);
    validateCmsRecord(kind,id,after);
    writes.push(change(path,existing,after));
    writes.push(revision(actor.uid,kind,id,existing,at,'before-edit'));
    writes.push(mediaRef(kind,id,{fields:after},at));
    if (state) writes.push(change(wfPath,state,wfFields(state,kind,id,{
      status:fstr('draft'),contentUpdateTime:fstr(''),approvedBy:{nullValue:null}
    })));
  } else if (act === 'proposeEdit') {
    requireRole(actor.role,WRITE);
    if (!existing || existing.fields?.published?.booleanValue !== true)
      throw failure(409,'Only published content accepts edit proposals.');
    if (['submitted-edit','approved-edit','scheduled'].includes(status(state)))
      throw failure(409,'An editorial request is already pending.');
    const patch = validateEdit(kind,body.patch);
    validateCmsRecord(kind,id,{...existing.fields,...patch});
    writes.push(change(wfPath,state,wfFields(state,kind,id,{
      status:fstr('submitted-edit'),submittedBy:fstr(actor.uid),submittedAt:ftime(at),
      contentUpdateTime:fstr(existing.updateTime),pendingPatch:fstr(JSON.stringify(patch)),
      approvedBy:{nullValue:null},approvedAt:{nullValue:null}
    })));
  } else if (act === 'submit') {
    requireRole(actor.role,WRITE);
    if (!existing || existing.fields?.published?.booleanValue)
      throw failure(409,'Only existing drafts can be submitted.');
    if (status(state) === 'scheduled') throw failure(409,'Cancel the scheduled publication first.');
    writes.push(change(wfPath,state,wfFields(state,kind,id,{
      status:fstr('submitted'),submittedBy:fstr(actor.uid),submittedAt:ftime(at),
      contentUpdateTime:fstr(existing.updateTime),approvedBy:{nullValue:null},
      approvedAt:{nullValue:null},
    })));
  } else if (act === 'approve') {
    requireRole(actor.role,PUBLISH);
    const proposedEdit = status(state) === 'submitted-edit';
    if (!existing || !['submitted','submitted-edit'].includes(status(state)) ||
        (proposedEdit ? existing.fields?.published?.booleanValue !== true : existing.fields?.published?.booleanValue !== false) ||
        field(state,'contentUpdateTime') !== existing.updateTime)
      throw failure(409,'Submission is no longer current.');
    if (field(state,'submittedBy') === actor.uid)
      throw failure(403,'A different administrator must approve this submission.');
    writes.push(change(wfPath,state,wfFields(state,kind,id,{
      status:fstr(proposedEdit ? 'approved-edit' : 'approved'),approvedBy:fstr(actor.uid),approvedAt:ftime(at),
    })));
  } else if (act === 'applyEdit') {
    requireRole(actor.role,PUBLISH);
    if (!existing || existing.fields?.published?.booleanValue !== true ||
        status(state) !== 'approved-edit' ||
        field(state,'contentUpdateTime') !== existing.updateTime)
      throw failure(409,'Published edit approval is stale or missing.');
    let patch;
    try { patch = JSON.parse(field(state,'pendingPatch') || 'null'); }
    catch { throw failure(409,'Edit proposal is invalid.'); }
    if (!patch || typeof patch !== 'object' || Array.isArray(patch))
      throw failure(409,'Edit proposal is invalid.');
    const allowed = Object.entries(patch).every(([key,value]) =>
      typeof value?.stringValue === 'string' && Object.keys(value).length === 1);
    if (!allowed) throw failure(409,'Edit proposal is invalid.');
    // Validate the proposal again because it is durable storage, not trusted input.
    const validated = validateEdit(kind,Object.fromEntries(Object.entries(patch).map(([k,v])=>[k,v.stringValue])));
    const after = updatedContent(existing,at,actor.uid,validated);
    validateCmsRecord(kind,id,after);
    writes.push(change(path,existing,after));
    writes.push(revision(actor.uid,kind,id,existing,at,'before-approved-edit'));
    writes.push(mediaRef(kind,id,{fields:after},at));
    writes.push(change(wfPath,state,wfFields(state,kind,id,{
      status:fstr('published'),pendingPatch:{nullValue:null},approvedAt:ftime(at)
    })));
  } else if (act === 'schedule') {
    requireRole(actor.role,PUBLISH);
    requireLiveRevision(existing,state);
    if (status(state) !== 'approved') throw failure(409,'Already scheduled.');
    const runAt = validateSchedule(body.runAt);
    const jobId = randomUUID();
    writes.push(change('cmsJobs/'+jobId,null,{
      kind:fstr(kind),recordId:fstr(id),status:fstr('queued'),
      runAt:ftime(runAt),createdAt:ftime(at),createdBy:fstr(actor.uid),
      contentUpdateTime:fstr(existing.updateTime),
    }));
    writes.push(change(wfPath,state,wfFields(state,kind,id,{
      status:fstr('scheduled'),jobId:fstr(jobId),scheduledFor:ftime(runAt),
    })));
  } else if (act === 'publish') {
    requireRole(actor.role,PUBLISH);
    if (!existing || existing.fields?.published?.booleanValue)
      throw failure(409,'Only unpublished content can be published.');
    requireLiveRevision(existing,state);
    if (status(state) !== 'approved') throw failure(409,'Scheduled content must be handled by the scheduler.');
    const after = updatedContent(existing,at,actor.uid,{published:fbool(true),publishedAt:ftime(at)});
    validateCmsRecord(kind,id,after);
    writes.push(change(path,existing,after));
    writes.push(revision(actor.uid,kind,id,existing,at,'before-publish'));
    writes.push(mediaRef(kind,id,{fields:after},at));
    writes.push(change(wfPath,state,wfFields(state,kind,id,{status:fstr('published'),publishedAt:ftime(at)})));
  } else if (act === 'unpublish') {
    requireRole(actor.role,PUBLISH);
    if (!existing || existing.fields?.published?.booleanValue !== true)
      throw failure(409,'Only published content can be unpublished.');
    if (await find(trashPath(kind,id))) throw failure(409,'Archived records cannot be unpublished.');
    const after = updatedContent(existing,at,actor.uid,{published:fbool(false),publishedAt:{nullValue:null}});
    validateCmsRecord(kind,id,after);
    writes.push(change(path,existing,after));
    writes.push(revision(actor.uid,kind,id,existing,at,'before-unpublish'));
    writes.push(mediaRef(kind,id,{fields:after},at));
    writes.push(change(wfPath,state,wfFields(state,kind,id,{
      status:fstr('draft'),contentUpdateTime:fstr(''),approvedBy:{nullValue:null},
      pendingPatch:{nullValue:null},approvedAt:{nullValue:null}
    })));
  } else if (act === 'archive') {
    requireRole(actor.role,ADMIN);
    if (!existing) throw failure(404,'Content not found.');
    const previousTrash = await find(trashPath(kind,id));
    if (previousTrash) throw failure(409,'Content is already in trash.');
    const after = updatedContent(existing,at,actor.uid,{published:fbool(false),publishedAt:{nullValue:null}});
    validateCmsRecord(kind,id,after);
    writes.push(change(path,existing,after));
    writes.push(revision(actor.uid,kind,id,existing,at,'before-archive'));
    writes.push(change(trashPath(kind,id),null,{
      kind:fstr(kind),recordId:fstr(id),archivedBy:fstr(actor.uid),
      archivedAt:ftime(at),snapshot:fstr(JSON.stringify(existing.fields || {})),
    }));
    writes.push(mediaRef(kind,id,{fields:after},at));
    writes.push(change(wfPath,state,wfFields(state,kind,id,{status:fstr('archived'),contentUpdateTime:fstr('')})));
  } else if (act === 'restore') {
    requireRole(actor.role,ADMIN);
    const trash = await find(trashPath(kind,id));
    if (!trash) throw failure(404,'Trash record not found.');
    if (existing && (Date.parse(existing.fields?.updatedAt?.timestampValue || '') !==
        Date.parse(trash.fields?.archivedAt?.timestampValue || '') ||
        existing.fields?.published?.booleanValue !== false))
      throw failure(409,'Archived record was changed; review it before restoration.');
    if (!existing) {
      const saved = JSON.parse(field(trash,'snapshot') || '{}');
      if (!saved || typeof saved !== 'object' || !saved.title || saved.published === undefined)
        throw failure(409,'Archive snapshot is invalid.');
      const restored = {...saved,published:fbool(false),publishedAt:{nullValue:null},
        updatedAt:ftime(at),updatedBy:fstr(actor.uid)};
      validateCmsRecord(kind,id,restored);
      writes.push(change(path,null,restored));
      writes.push(mediaRef(kind,id,{fields:restored},at));
    }
    if (existing) {
      validateCmsRecord(kind,id,existing.fields);
      // Firestore verify write prevents concurrent edits between read and restore.
      writes.push({verify:name(path),currentDocument:{updateTime:existing.updateTime}});
    }
    writes.push(remove(trashPath(kind,id),trash));
    writes.push(change(wfPath,state,wfFields(state,kind,id,{status:fstr('draft'),contentUpdateTime:fstr('')})));
  } else if (act === 'rollback') {
    requireRole(actor.role,ADMIN);
    if (!existing) throw failure(404,'Content not found.');
    safeId(body.revisionId);
    const old = await find(historyPath(kind,id)+'/'+body.revisionId);
    if (!old) throw failure(404,'Revision not found.');
    const snapshot = JSON.parse(field(old,'snapshot') || '{}');
    if (!snapshot?.title?.stringValue || typeof snapshot !== 'object')
      throw failure(409,'Revision snapshot is invalid.');
    const after = updatedContent(existing,at,actor.uid,{
      ...snapshot,published:fbool(false),publishedAt:{nullValue:null},
      ...(existing.fields.createdAt || snapshot.createdAt
        ? {createdAt:existing.fields.createdAt || snapshot.createdAt} : {}),
      ...(existing.fields.createdBy || snapshot.createdBy
        ? {createdBy:existing.fields.createdBy || snapshot.createdBy} : {}),
    });
    validateCmsRecord(kind,id,after);
    writes.push(change(path,existing,after));
    writes.push(revision(actor.uid,kind,id,existing,at,'before-rollback'));
    writes.push(mediaRef(kind,id,{fields:after},at));
    writes.push(change(wfPath,state,wfFields(state,kind,id,{status:fstr('draft'),contentUpdateTime:fstr('')})));
  }
  writes.push(audit(actor.uid,kind,id,act,at,act === 'schedule' ? {runAt:body.runAt} : {}));
  await commit(writes);
  return {ok:true,action:act,kind,id,at};
}

function paginationToken(input) {
  if (input === undefined || input === null || input === '') return '';
  if (typeof input !== 'string' || input.length > 2048 ||
      !/^[A-Za-z0-9_+\/-]+={0,2}$/.test(input))
    throw failure(400,'Invalid pagination token.');
  return input;
}
function pageParams(size, token) {
  const params = new URLSearchParams({pageSize:String(size),orderBy:'createdAt desc'});
  if (token) params.set('pageToken',token);
  return params.toString();
}
export async function workflowRead(query,actor) {
  const action = query.action || 'status';
  if (action === 'audit') {
    requireRole(actor.role,new Set(['super_admin','auditor']));
    const pageToken = paginationToken(query.pageToken);
    const logs = await authorized('cmsAudit?'+pageParams(50,pageToken));
    return {items:(logs.documents || []).map(x=>({id:x.name.split('/').at(-1),fields:x.fields})),
      nextPageToken:logs.nextPageToken || null};
  }
  if (action === 'trashList') {
    requireRole(actor.role, new Set(ROLES));
    if (!KINDS.includes(query.kind)) throw failure(400, 'Invalid CMS collection.');
    const token = await accessToken();
    const rows = await request(root() + ':runQuery', {
      method:'POST',
      headers:{Authorization:'Bearer ' + token,'Content-Type':'application/json'},
      body:JSON.stringify({structuredQuery:{
        from:[{collectionId:'cmsTrash'}],
        where:{fieldFilter:{field:{fieldPath:'kind'},op:'EQUAL',value:fstr(query.kind)}},
        limit:1000,
      }}),
    });
    if (!Array.isArray(rows)) throw failure(502, 'Archive list response invalid.');
    const ids = rows.map(row => row.document?.fields?.recordId?.stringValue)
      .filter(id => typeof id === 'string' && ID.test(id));
    return { ids, truncated: ids.length >= 1000 };
  }
  const {kind,id} = validateTarget(query.kind,query.id);
  if (action === 'status') {
    const [state, current] = await Promise.all([find(workflowPath(kind,id)),find(targetPath(kind,id))]);
    if (!current) throw failure(404, 'Content not found.');
    const workflowStatus = status(state) || 'unsubmitted';
    // Any browser draft edit invalidates the old approval revision; surface
    // "draft" so the operator can submit for a fresh independent review.
    const stale = ['submitted','approved','submitted-edit','approved-edit'].includes(workflowStatus) &&
      field(state,'contentUpdateTime') !== current.updateTime;
    return {status:stale ? 'draft' : workflowStatus, stale,
      submittedBy:stale ? null : field(state,'submittedBy'),
      approvedBy:stale ? null : field(state,'approvedBy'),
      contentUpdateTime:field(state,'contentUpdateTime')};
  }
  if (action === 'history') {
    const pageToken = paginationToken(query.pageToken);
    const docs = await authorized(historyPath(kind,id)+'?'+pageParams(30,pageToken))
      .catch(e=>{if(e.status===404)return {documents:[]};throw e;});
    return {items:(docs.documents || []).map(x=>({
      id:x.name.split('/').at(-1),actorUid:field(x,'actorUid'),
      reason:field(x,'reason'),createdAt:x.fields?.createdAt?.timestampValue,
    })),nextPageToken:docs.nextPageToken || null};
  }
  if (action === 'trash') {
    requireRole(actor.role,new Set(ROLES));
    const trash = await find(trashPath(kind,id));
    return {archived:Boolean(trash),archivedAt:trash?.fields?.archivedAt?.timestampValue || null};
  }
  throw failure(400,'Unknown read action.');
}

export function authorizeCron(value,expected = process.env.CMS_CRON_SECRET) {
  const presented = /^Bearer ([A-Za-z0-9_-]{32,256})$/.exec(value || '')?.[1];
  if (!presented || typeof expected !== 'string' || !/^[A-Za-z0-9_-]{32,256}$/.test(expected))
    throw failure(401,'Scheduler not authorized.');
  const a = createHash('sha256').update(presented).digest();
  const b = createHash('sha256').update(expected).digest();
  if (!timingSafeEqual(a,b)) throw failure(401,'Scheduler not authorized.');
}
export async function processDueJobs(now = isoNow()) {
  const nowMs = Date.parse(now);
  if (!Number.isFinite(nowMs)) throw failure(400,'Invalid scheduler date.');
  const token = await accessToken();
  // Only scan eligible jobs. A compound (status, runAt) Firestore index
  // prevents future schedules from starving already-due publications.
  const response = await request(root()+':runQuery', {
    method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({structuredQuery:{
      from:[{collectionId:'cmsJobs'}],
      where:{compositeFilter:{op:'AND',filters:[
        {fieldFilter:{field:{fieldPath:'status'},op:'EQUAL',value:fstr('queued')}},
        {fieldFilter:{field:{fieldPath:'runAt'},op:'LESS_THAN_OR_EQUAL',value:ftime(now)}},
      ]}},
      orderBy:[{field:{fieldPath:'runAt'},direction:'ASCENDING'}],
      limit:251,
    }}),
  });
  if (!Array.isArray(response)) throw failure(502,'Invalid scheduler query response.');
  let published = 0, stale = 0, skipped = 0, failed = 0, deferred = 0;
  for (const row of response.slice(0,250)) {
    const job = row.document;
    if (!job) { skipped++; continue; }
    const jobId = job.name.split('/').at(-1);
    if (!ID.test(jobId)) { skipped++; continue; }
    const kind = job.fields?.kind?.stringValue;
    const recordId = job.fields?.recordId?.stringValue;
    const attempts = Number(job.fields?.attempts?.integerValue || 0);
    try {
      validateTarget(kind,recordId);
      if (!Number.isFinite(Date.parse(job.fields?.runAt?.timestampValue || '')) ||
          Date.parse(job.fields.runAt.timestampValue) > nowMs) {
        throw failure(409,'Invalid job due time.');
      }
      const existing = await find(targetPath(kind,recordId));
      const state = await find(workflowPath(kind,recordId));
      if (status(state) !== 'scheduled' || field(state,'jobId') !== jobId ||
          !existing || existing.fields?.published?.booleanValue ||
          existing.updateTime !== field(job,'contentUpdateTime')) {
        await commit([change('cmsJobs/'+jobId,job,{...job.fields,status:fstr('stale'),
          completedAt:ftime(now)}),audit('scheduler',kind,recordId,'stale',now)]);
        stale++;
        continue;
      }
      const after = updatedContent(existing,now,'scheduler',{published:fbool(true),publishedAt:ftime(now)});
      validateCmsRecord(kind,recordId,after);
      // Job, content, workflow, revision and audit commit together. A second
      // scheduler cannot publish twice because updateTime guards are atomic.
      await commit([
        change(targetPath(kind,recordId),existing,after),
        change(workflowPath(kind,recordId),state,wfFields(state,kind,recordId,{
          status:fstr('published'),publishedAt:ftime(now)
        })),
        change('cmsJobs/'+jobId,job,{...job.fields,status:fstr('published'),completedAt:ftime(now)}),
        revision('scheduler',kind,recordId,existing,now,'before-scheduled-publish'),
        mediaRef(kind,recordId,{fields:after},now),
        audit('scheduler',kind,recordId,'scheduled-publish',now),
      ]);
      published++;
    } catch(error) {
      // Concurrency conflicts are expected when a second runner wins the race.
      if (error?.status === 409 && error.message === 'Record changed; reload and retry.') {
        deferred++;
        continue;
      }
      const nextAttempts = Number.isSafeInteger(attempts) && attempts >= 0 ? attempts + 1 : 5;
      const statusText = nextAttempts >= 5 ? 'failed' : 'queued';
      try {
        await commit([
          change('cmsJobs/'+jobId,job,{
            ...job.fields,status:fstr(statusText),attempts:{integerValue:String(nextAttempts)},
            lastAttemptAt:ftime(now)
          }),
          ...(KINDS.includes(kind) && ID.test(recordId || '')
            ? [audit('scheduler',kind,recordId,statusText === 'failed' ? 'job-failed' : 'job-retry',now)]
            : []),
        ]);
        if (statusText === 'failed') failed++;
        else deferred++;
      } catch {
        // A concurrent worker or unavailable Firestore leaves the job unchanged.
        deferred++;
      }
      console.error('[CMS scheduler] Publication attempt failed:',error?.status || 502);
    }
  }
  return {
    published,stale,skipped,failed,deferred,scanned:Math.min(response.length,250),
    truncated:response.length>250
  };
}

export async function handleWorkflow(req) {
  const method = req.method;
  if (!['GET','POST'].includes(method)) throw failure(405,'Method not allowed.');
  const actor = await verifyEditor(req,method);
  if (method === 'GET') return workflowRead(req.query || {},actor);
  if (!/^application\/json(?:\s*;|$)/i.test(req.headers?.['content-type'] || ''))
    throw failure(415,'Send a JSON request.');
  let body = req.body;
  if (typeof body === 'string') {
    if (body.length > MAX_BODY) throw failure(413,'Workflow request is too large.');
    try { body = JSON.parse(body); }
    catch { throw failure(400,'Invalid JSON body.'); }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      JSON.stringify(body).length > MAX_BODY)
    throw failure(413,'Workflow request is too large.');
  return workflowAction(body,actor);
}

export function responseError(error) {
  const err = safeError(error);
  return {status:err.status, message:[400,401,403,404,405,409,413,415].includes(err.status)
    ? err.message : 'Workflow service is unavailable.'};
}
