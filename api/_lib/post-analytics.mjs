/**
 * Private, first-party BCG page-view rollups.
 *
 * A "qualified view" is counted at most once per 30-minute bucket for the
 * same post and pseudonymous network/user-agent combination. This is NOT an
 * exact unique-visitor measure. No cookies, referrers, IPs, or user-agent
 * strings are persisted. Hashes expire via two Firestore TTL policies.
 *
 * Raw telemetry is NEVER readable through Firestore client rules.
 */
import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import { accessToken, failure, verifyEditor } from './cms-workflow.mjs';

const PROJECT = /^[a-z][a-z0-9-]{3,62}$/;
const API = 'https://firestore.googleapis.com/v1/';
const MAX_ROWS = 12000;
const PAGE_SIZE = 300;
const AGE_DAYS = [7, 30, 90];
const PUBLIC_ORIGIN_FALLBACK = 'https://bcglk.devoraid.com';
const BOT = /bot|crawler|spider|headless|preview|prerender|lighthouse|facebookexternalhit|slackbot|discordbot|whatsapp|telegrambot|curl|wget|python|node-fetch|postman/i;
const sv = value => ({ stringValue: String(value) });
const tv = value => ({ timestampValue: value });

export function postRoute(path) {
  if (typeof path !== 'string' || path.length > 180 || !path.startsWith('/')) return null;
  const clean = path.endsWith('/') ? path.slice(0, -1) : path;
  const news = /^\/updates\/([A-Za-z0-9]{20})$/.exec(clean);
  if (news) return { kind: 'news', id: news[1], path: clean };
  const event = /^\/events\/([A-Za-z0-9]{20})$/.exec(clean);
  if (event) return { kind: 'events', id: event[1], path: clean };
  const page = /^\/pages\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(clean);
  if (page && page[1].length <= 120) return { kind: 'pages', id: page[1], path: clean };
  return null;
}

export function reportingDates(days, now = new Date()) {
  if (!AGE_DAYS.includes(days) || !Number.isFinite(now.getTime()))
    throw failure(400, 'Choose 7, 30 or 90 days.');
  const end = now.toISOString().slice(0, 10);
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(),
    now.getUTCDate() - days + 1)).toISOString().slice(0, 10);
  return { start, end };
}

export function viewKey(route, address, agent, time, salt) {
  if (!route || !isIP(address) || !agent || typeof salt !== 'string' || salt.length < 32)
    throw failure(503, 'View collection is not configured.');
  // 30-minute buckets reduce rapid reloads. IP/UA never leave this process.
  const bucket = Math.floor(time / 1800000);
  return createHmac('sha256', salt).update(
    [bucket, route.kind, route.id, address, agent.slice(0, 240)].join('\n')
  ).digest('hex');
}

function settings() {
  const project = process.env.FIREBASE_PROJECT_ID;
  if (!PROJECT.test(project || '')) throw failure(503, 'Analytics storage is not configured.');
  return { project, root: API + 'projects/' + project + '/databases/(default)/documents' };
}
function requiredOrigin() {
  const origin = process.env.BCG_ANALYTICS_ORIGIN ||
    process.env.USER_ADMIN_ORIGIN || PUBLIC_ORIGIN_FALLBACK;
  try {
    const url = new URL(origin);
    if (url.protocol === 'https:' && url.origin === origin && !url.username && !url.password)
      return origin;
  } catch {}
  throw failure(503, 'Analytics origin is not configured.');
}
function ipAddress(headers) {
  const raw = headers['x-vercel-forwarded-for'] || headers['x-forwarded-for'] || '';
  const value = (Array.isArray(raw) ? raw[0] : raw).split(',')[0]?.trim();
  return isIP(value) ? value : null;
}

export function checkViewRequest(req, now = Date.now()) {
  if (req.method !== 'POST') throw failure(405, 'Method not allowed.');
  if (process.env.BCG_ANALYTICS_ENABLED !== '1')
    throw failure(503, 'View collection is disabled.');
  if (req.headers.origin !== requiredOrigin() ||
      (req.headers['sec-fetch-site'] && req.headers['sec-fetch-site'] !== 'same-origin') ||
      req.headers['x-bcg-view'] !== '1')
    throw failure(403, 'Origin not allowed.');
  if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || ''))
    throw failure(415, 'Send JSON.');
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      Object.keys(body).length !== 1) throw failure(400, 'Invalid view request.');
  const route = postRoute(body.path);
  if (!route) throw failure(400, 'Unsupported public post URL.');
  const agent = req.headers['user-agent'];
  if (typeof agent !== 'string' || agent.length < 15 || agent.length > 512 ||
      BOT.test(agent)) throw failure(400, 'Non-browser request.');
  const address = ipAddress(req.headers);
  if (!address) throw failure(503, 'Verified network address is not available.');
  const key = viewKey(route, address, agent, now, process.env.BCG_ANALYTICS_HASH_KEY);
  return { route, key };
}

async function firestore(url, options = {}) {
  const response = await fetch(url, { ...options, redirect: 'error',
    signal: AbortSignal.timeout(12000) });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 404) throw failure(404, 'Post not found.');
    if ([409, 412].includes(response.status)) throw failure(409, 'Duplicate view.');
    throw failure(502, 'Analytics Firestore request failed.');
  }
  return data;
}
async function tokenHeaders(extra = {}) {
  return { Authorization: 'Bearer ' + await accessToken(), ...extra };
}

export function viewWrites({ project, route, title, key, now }) {
  const date = new Date(now).toISOString().slice(0, 10);
  const stamp = new Date(now).toISOString();
  const doc = 'projects/' + project + '/databases/(default)/documents/';
  const dedupe = doc + 'analyticsDedupe/' + key;
  const daily = doc + 'analyticsViewsDaily/' +
    date.replaceAll('-', '') + '_' + route.kind + '_' + route.id;
  return [
    { update: { name: dedupe, fields: {
      // No raw IP, user-agent or referring website. Hash is pseudonymous.
      expiresAt: tv(new Date(now + 48 * 3600000).toISOString()),
      createdAt: tv(stamp),
    } }, currentDocument: { exists: false } },
    { update: { name: daily, fields: {
      date: sv(date), kind: sv(route.kind), recordId: sv(route.id),
      title: sv(title.slice(0, 180)), path: sv(route.path),
      expiresAt: tv(new Date(now + 100 * 86400000).toISOString()),
    } }, updateMask: { fieldPaths: ['date','kind','recordId','title','path','expiresAt'] },
    updateTransforms: [{ fieldPath: 'views', increment: { integerValue: '1' } }] },
  ];
}

export async function recordView(req) {
  const now = Date.now();
  const { route, key } = checkViewRequest(req, now);
  const { project, root } = settings();
  const target = await firestore(root + '/' + route.kind + '/' +
    encodeURIComponent(route.id), { headers: await tokenHeaders() });
  if (target?.fields?.published?.booleanValue !== true ||
      typeof target?.fields?.title?.stringValue !== 'string')
    throw failure(404, 'Published post not found.');
  const title = target.fields.title.stringValue.trim();
  if (!title) throw failure(404, 'Published post not found.');
  try {
    await firestore(root + ':commit', {
      method: 'POST', headers: await tokenHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ writes: viewWrites({ project, route, title, key, now }) }),
    });
    return { counted: true };
  } catch (error) {
    if (error.status === 409) return { counted: false };
    throw error;
  }
}

export function summarizeViews(docs, days, now = new Date()) {
  const { start, end } = reportingDates(days, now);
  const daily = new Map();
  for (let offset = 0; offset < days; offset++) {
    const day = new Date(Date.parse(start + 'T00:00:00Z') + offset * 86400000)
      .toISOString().slice(0, 10);
    daily.set(day, 0);
  }
  const byPost = new Map();
  let views = 0;
  for (const doc of docs) {
    const f = doc?.fields;
    const date = f?.date?.stringValue;
    const route = postRoute(f?.path?.stringValue);
    const kind = f?.kind?.stringValue;
    const id = f?.recordId?.stringValue;
    const title = f?.title?.stringValue;
    const count = Number(f?.views?.integerValue);
    if (!daily.has(date) || !route || route.kind !== kind || route.id !== id ||
        typeof title !== 'string' || !title.trim() ||
        !Number.isSafeInteger(count) || count < 0)
      throw failure(502, 'Analytics records are incomplete.');
    daily.set(date, daily.get(date) + count);
    const key = kind + '/' + id;
    const prev = byPost.get(key) || { kind, id, path: route.path, title, views: 0 };
    prev.title = title;
    prev.views += count;
    byPost.set(key, prev);
    views += count;
  }
  const posts = [...byPost.values()].sort((a,b) => b.views - a.views ||
    a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
  const collections = ['news','events','pages'].map(kind => ({
    kind, views: posts.filter(p=>p.kind===kind).reduce((total,p)=>total+p.views,0),
  }));
  return {
    days, range: { start, end }, totalViews: views, postsTracked: posts.length,
    posts, collections, daily: [...daily].map(([date, views]) => ({ date, views })),
    measured: 'Qualified post views, deduplicated per 30-minute network/browser bucket',
  };
}

async function fetchDailyRows(days) {
  const { root } = settings();
  const { start } = reportingDates(days);
  const data = [];
  let cursor;
  while (data.length < MAX_ROWS) {
    const structuredQuery = {
      from: [{ collectionId: 'analyticsViewsDaily' }],
      where: { fieldFilter: { field: { fieldPath: 'date' },
        op: 'GREATER_THAN_OR_EQUAL', value: sv(start) } },
      orderBy: [
        { field: { fieldPath: 'date' }, direction: 'ASCENDING' },
        { field: { fieldPath: '__name__' }, direction: 'ASCENDING' },
      ],
      limit: PAGE_SIZE,
    };
    if (cursor) structuredQuery.startAt = { values: [
      sv(cursor.fields.date.stringValue), { referenceValue: cursor.name },
    ], before: false };
    const page = await firestore(root + ':runQuery', {
      method: 'POST', headers: await tokenHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ structuredQuery }),
    });
    if (!Array.isArray(page)) throw failure(502, 'Analytics query returned invalid data.');
    const docs = page.map(row => row.document).filter(Boolean);
    if (docs.length === 0) break;
    data.push(...docs);
    if (docs.length < PAGE_SIZE) break;
    if (cursor && cursor.name === docs.at(-1).name)
      throw failure(502, 'Analytics pagination did not advance.');
    cursor = docs.at(-1);
  }
  if (data.length >= MAX_ROWS) throw failure(503, 'Analytics dataset needs a scalable rollup.');
  return data;
}

export async function readViews(req) {
  if (req.method !== 'GET') throw failure(405, 'Method not allowed.');
  await verifyEditor(req, 'GET');
  const days = Number(req.query?.days || '30');
  if (!AGE_DAYS.includes(days)) throw failure(400, 'Choose 7, 30 or 90 days.');
  const rows = await fetchDailyRows(days);
  return summarizeViews(rows, days);
}
