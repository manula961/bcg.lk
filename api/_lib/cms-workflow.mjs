import { createSign, randomUUID, createHash, timingSafeEqual } from 'node:crypto';

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
  if (!KINDS.includes(kind) || !patch || typeof patch !== 'object' || Array.isArray(patch) ||
      Object.keys(patch).length === 0 || Object.keys(patch).length > 15)
    throw failure(400, 'Invalid content change.');
  const fields = {};
  for (const [key, value] of Object.entries(patch)) {
    if (!Object.hasOwn(FIELDS[kind], key) || typeof value !== 'string' ||
        value.trim().length > FIELDS[kind][key])
      throw failure(400, 'Invalid or oversized content field.');
    const clean = value.trim();
    if (({news:['title','excerpt'],events:['title','description','eventDate','location'],pages:['title','body'],societies:['title','description'],sports:['title','description'],leadership:['title','role'],pastPapers:['title','exam','subject','year','language','url']}[kind] || []).includes(key) && !clean)
      throw failure(400, 'Required content field cannot be empty.');
    if (['imageUrl','websiteUrl','url'].includes(key) && clean) {
      let url;
      try { url = new URL(clean); } catch { throw failure(400, 'Invalid HTTPS URL.'); }
      if (url.protocol !== 'https:' || url.username || url.password)
        throw failure(400, 'Invalid HTTPS URL.');
    }
    if (key === 'category' && kind === 'news' && !['News','Announcements'].includes(clean))
      throw failure(400, 'Invalid news category.');
    if (key === 'role' && kind === 'leadership' &&
        !['Principal','Deputy Principal','Assistant Principal','Sectional Head','Other Senior Staff'].includes(clean))
      throw failure(400, 'Invalid leadership role.');
    if (key === 'language' && !['Sinhala','Tamil','English'].includes(clean))
      throw failure(400, 'Invalid language.');
    if (key === 'year' && !/^(19|20)[0-9]{2}$/.test(clean))
      throw failure(400, 'Invalid examination year.');
    if (key === 'color' && clean && !/^#[0-9a-fA-F]{6}$/.test(clean))
      throw failure(400, 'Invalid color.');
    if (key === 'eventDate' && (!/^\d{4}-\d{2}-\d{2}$/.test(clean) ||
        !Number.isFinite(Date.parse(clean + 'T00:00:00Z')) ||
        new Date(clean + 'T00:00:00Z').toISOString().slice(0,10) !== clean))
      throw failure(400, 'Invalid event date.');
    fields[key] = fstr(clean);
  }
  return fields;
}
export function validateSchedule(value, now = Date.now()) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value))
    throw failure(400, 'Use an ISO 8601 UTC publish time.');
  const time = Date.parse(value);
  if (!Number.isFinite(time) || time < now + 120000 || time > now + 90 * 86400000)
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
async function accessToken() {
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
  if (!['submit','approve','publish','schedule','edit','archive','restore','rollback'].includes(act))
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
    if (existing.fields?.published?.booleanValue && actor.role === 'editor')
      throw failure(403,'Editors cannot modify published content.');
    const patch = validateEdit(kind,body.patch);
    const after = updatedContent(existing,at,actor.uid,patch);
    writes.push(change(path,existing,after));
    writes.push(revision(actor.uid,kind,id,existing,at,'before-edit'));
    writes.push(mediaRef(kind,id,{fields:after},at));
    if (state) writes.push(change(wfPath,state,wfFields(state,kind,id,{
      status:fstr('draft'),contentUpdateTime:fstr(''),approvedBy:{nullValue:null}
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
    if (!existing || existing.fields?.published?.booleanValue ||
        status(state) !== 'submitted' ||
        field(state,'contentUpdateTime') !== existing.updateTime)
      throw failure(409,'Submission is no longer current.');
    if (field(state,'submittedBy') === actor.uid)
      throw failure(403,'A different administrator must approve this submission.');
    writes.push(change(wfPath,state,wfFields(state,kind,id,{
      status:fstr('approved'),approvedBy:fstr(actor.uid),approvedAt:ftime(at),
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
    writes.push(change(path,existing,after));
    writes.push(revision(actor.uid,kind,id,existing,at,'before-publish'));
    writes.push(mediaRef(kind,id,{fields:after},at));
    writes.push(change(wfPath,state,wfFields(state,kind,id,{status:fstr('published'),publishedAt:ftime(at)})));
  } else if (act === 'archive') {
    requireRole(actor.role,ADMIN);
    if (!existing) throw failure(404,'Content not found.');
    const previousTrash = await find(trashPath(kind,id));
    if (previousTrash) throw failure(409,'Content is already in trash.');
    const after = updatedContent(existing,at,actor.uid,{published:fbool(false),publishedAt:{nullValue:null}});
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
    if (existing && (existing.fields?.updatedAt?.timestampValue !== trash.fields?.archivedAt?.timestampValue ||
        existing.fields?.published?.booleanValue !== false))
      throw failure(409,'Archived record was changed; review it before restoration.');
    if (!existing) {
      const saved = JSON.parse(field(trash,'snapshot') || '{}');
      if (!saved || typeof saved !== 'object' || !saved.title || saved.published === undefined)
        throw failure(409,'Archive snapshot is invalid.');
      const restored = {...saved,published:fbool(false),publishedAt:{nullValue:null},
        updatedAt:ftime(at),updatedBy:fstr(actor.uid)};
      writes.push(change(path,null,restored));
      writes.push(mediaRef(kind,id,{fields:restored},at));
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
      createdAt:existing.fields.createdAt || snapshot.createdAt,
      createdBy:existing.fields.createdBy || snapshot.createdBy,
    });
    writes.push(change(path,existing,after));
    writes.push(revision(actor.uid,kind,id,existing,at,'before-rollback'));
    writes.push(mediaRef(kind,id,{fields:after},at));
    writes.push(change(wfPath,state,wfFields(state,kind,id,{status:fstr('draft'),contentUpdateTime:fstr('')})));
  }
  writes.push(audit(actor.uid,kind,id,act,at,act === 'schedule' ? {runAt:body.runAt} : {}));
  await commit(writes);
  return {ok:true,action:act,kind,id,at};
}

export async function workflowRead(query,actor) {
  const action = query.action || 'status';
  if (action === 'audit') {
    requireRole(actor.role,new Set(['super_admin','auditor']));
    const logs = await authorized('cmsAudit?pageSize=50&orderBy=createdAt%20desc');
    return {items:(logs.documents || []).map(x=>({id:x.name.split('/').at(-1),fields:x.fields}))};
  }
  const {kind,id} = validateTarget(query.kind,query.id);
  if (action === 'status') {
    const doc = await find(workflowPath(kind,id));
    return {status:status(doc) || 'unsubmitted',
      submittedBy:field(doc,'submittedBy'),approvedBy:field(doc,'approvedBy'),
      contentUpdateTime:field(doc,'contentUpdateTime')};
  }
  if (action === 'history') {
    const docs = await authorized(historyPath(kind,id)+'?pageSize=30&orderBy=createdAt%20desc')
      .catch(e=>{if(e.status===404)return {documents:[]};throw e;});
    return {items:(docs.documents || []).map(x=>({
      id:x.name.split('/').at(-1),actorUid:field(x,'actorUid'),
      reason:field(x,'reason'),createdAt:x.fields?.createdAt?.timestampValue,
    }))};
  }
  if (action === 'trash') {
    requireRole(actor.role,ADMIN);
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
  const token = await accessToken();
  const response = await request(root()+':runQuery', {
    method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({structuredQuery:{
      from:[{collectionId:'cmsJobs'}],
      where:{fieldFilter:{field:{fieldPath:'status'},op:'EQUAL',value:fstr('queued')}},
      limit:250,
    }}),
  });
  if (!Array.isArray(response)) throw failure(502,'Invalid scheduler query response.');
  let published = 0, stale = 0, skipped = 0;
  for (const row of response) {
    const job = row.document;
    if (!job || job.fields?.runAt?.timestampValue > now) {skipped++;continue;}
    const id = job.name.split('/').at(-1);
    const kind = job.fields?.kind?.stringValue;
    const recordId = job.fields?.recordId?.stringValue;
    try {
      validateTarget(kind,recordId);
      const existing = await find(targetPath(kind,recordId));
      const state = await find(workflowPath(kind,recordId));
      if (status(state) !== 'scheduled' || field(state,'jobId') !== id ||
          !existing || existing.fields?.published?.booleanValue ||
          existing.updateTime !== field(job,'contentUpdateTime')) {
        await commit([change('cmsJobs/'+id,job,{...job.fields,status:fstr('stale'),
          completedAt:ftime(now)}),audit('scheduler',kind,recordId,'stale',now)]);
        stale++;
        continue;
      }
      const after = updatedContent(existing,now,'scheduler',{published:fbool(true),publishedAt:ftime(now)});
      await commit([
        change(targetPath(kind,recordId),existing,after),
        change(workflowPath(kind,recordId),state,wfFields(state,kind,recordId,{status:fstr('published'),publishedAt:ftime(now)})),
        change('cmsJobs/'+id,job,{...job.fields,status:fstr('published'),completedAt:ftime(now)}),
        revision('scheduler',kind,recordId,existing,now,'before-scheduled-publish'),
        mediaRef(kind,recordId,{fields:after},now),
        audit('scheduler',kind,recordId,'scheduled-publish',now),
      ]);
      published++;
    } catch(error) {
      // Transient failures and concurrent runners leave the job queued for safe retry.
      console.error('[CMS scheduler] Job deferred:',error?.status || 502);
    }
  }
  return {published,stale,skipped,scanned:response.length,truncated:response.length>=250};
}

export async function handleWorkflow(req) {
  const method = req.method;
  if (!['GET','POST'].includes(method)) throw failure(405,'Method not allowed.');
  const actor = await verifyEditor(req,method);
  if (method === 'GET') return workflowRead(req.query || {},actor);
  const body = req.body;
  if (!body || JSON.stringify(body).length > MAX_BODY)
    throw failure(413,'Workflow request is too large.');
  return workflowAction(body,actor);
}

export function responseError(error) {
  const err = safeError(error);
  return {status:err.status, message:[400,401,403,404,405,409,413].includes(err.status)
    ? err.message : 'Workflow service is unavailable.'};
}
