/**
 * Cloudflare Web Analytics → read-only BCG.LK popular-post report.
 * There are no Firestore visitor writes, IP hashes, visitor cookies or TTL jobs.
 * Cloudflare RUM reports browser-observed pageviews, with adaptive sampling.
 *
 * GraphQL schema references:
 *   viewer.accounts.rumPageloadEventsAdaptiveGroups
 *   dimensions: date, requestHost, requestPath
 */
import { verifyEditor, failure } from './cms-workflow.mjs';

const GRAPHQL = 'https://api.cloudflare.com/client/v4/graphql';
const HEX32 = /^[a-f0-9]{32}$/i;
const MAX_GROUPS = 5000;
const VALID_DAYS = [7, 30, 90];
const DAY_MS = 86400000;
const POST_ID = '[A-Za-z0-9]{20}';
const routeMatchers = [
  { kind: 'news', regexp: new RegExp('^/updates/(' + POST_ID + ')/?$') },
  { kind: 'events', regexp: new RegExp('^/events/(' + POST_ID + ')/?$') },
  { kind: 'pages', regexp: /^\/pages\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/ },
];

export function postFromPath(path) {
  if (typeof path !== 'string' || path.length > 180 || !path.startsWith('/')) return null;
  for (const {kind, regexp} of routeMatchers) {
    const match = regexp.exec(path);
    if (match && match[1].length <= 120) return {
      kind, id: match[1], path: path.endsWith('/') ? path.slice(0, -1) : path,
    };
  }
  return null;
}

export function reportingWindow(days, now = new Date()) {
  if (!VALID_DAYS.includes(days) || !Number.isFinite(now.getTime()))
    throw failure(400, 'Choose 7, 30 or 90 days.');
  const utcToday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return {
    start: new Date(utcToday - (days - 1) * DAY_MS).toISOString().slice(0, 10),
    end: new Date(utcToday).toISOString().slice(0, 10),
    until: now.toISOString(),
  };
}

/** Each RUM query is at most 30 days; split 90-day reports for API compatibility. */
export function windows(days, now = new Date()) {
  const {start, until} = reportingWindow(days, now);
  const ranges = [];
  const end = Date.parse(until);
  let begin = Date.parse(start + 'T00:00:00Z');
  while (begin < end) {
    const next = Math.min(begin + 30 * DAY_MS, end);
    ranges.push({
      start: new Date(begin).toISOString(),
      end: new Date(next).toISOString(),
    });
    begin = next;
  }
  return ranges;
}

export function cloudflareConfig(env = process.env) {
  const accountTag = env.CLOUDFLARE_ACCOUNT_ID;
  const siteTag = env.CLOUDFLARE_WEB_ANALYTICS_SITE_TAG;
  const apiToken = env.CLOUDFLARE_ANALYTICS_API_TOKEN;
  const origin = env.BCG_CANONICAL_ORIGIN || 'https://bcglk.devoraid.com';
  let hostname = '';
  try {
    const url = new URL(origin);
    if (url.protocol === 'https:' && url.origin === origin &&
        !url.username && !url.password) hostname = url.hostname.toLowerCase();
  } catch {}
  if (!HEX32.test(accountTag || '') || !HEX32.test(siteTag || '') ||
      typeof apiToken !== 'string' || apiToken.length < 20 ||
      apiToken.length > 512 || !hostname)
    throw failure(503, 'Cloudflare Web Analytics is not configured.');
  return {accountTag, siteTag, apiToken, hostname};
}

export const CLOUD_FLARE_QUERY = [
  'query BcgPageViews($accountTag: string!, $siteTag: string!, $since: Time!, $until: Time!) {',
  '  viewer { accounts(filter: {accountTag: $accountTag}) {',
  '    rows: rumPageloadEventsAdaptiveGroups(',
  '      filter: {siteTag: $siteTag, datetime_geq: $since, datetime_lt: $until}',
  '      limit: 5000',
  '      orderBy: [count_DESC]',
  '    ) {',
  '      count',
  '      dimensions { date requestHost requestPath }',
  '    }',
  '  } }',
  '}',
].join('\n');

/** The API can return HTTP 200 with a GraphQL errors array — never treat it as zero. */
export async function fetchCloudflareGroups(config, range, fetcher = fetch) {
  let response;
  try {
    response = await fetcher(GRAPHQL, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + config.apiToken,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query: CLOUD_FLARE_QUERY,
        variables: {
          accountTag: config.accountTag, siteTag: config.siteTag,
          since: range.start, until: range.end,
        },
      }),
      redirect: 'error',
      signal: AbortSignal.timeout(12000),
    });
  } catch {
    throw failure(502, 'Cloudflare analytics service is unavailable.');
  }
  if (!response?.ok)
    throw failure(502, 'Cloudflare analytics service rejected the report.');
  let result;
  try { result = await response.json(); }
  catch { throw failure(502, 'Cloudflare returned an invalid analytics response.'); }
  const accounts = result?.data?.viewer?.accounts;
  const rows = accounts?.[0]?.rows;
  if (result?.errors?.length || !Array.isArray(accounts) || accounts.length !== 1 ||
      !Array.isArray(rows) || rows.length >= MAX_GROUPS)
    throw failure(502, 'Cloudflare analytics data is unavailable or incomplete.');
  return rows;
}

const countOk = count => typeof count === 'number' &&
  Number.isSafeInteger(count) && count >= 0;

/** Reduce Cloudflare RUM groups into the existing dashboard contract. */
export function summarizeCloudflareGroups(groups, days, now = new Date(), hostname) {
  const range = reportingWindow(days, now);
  if (!Array.isArray(groups) || typeof hostname !== 'string' || !hostname)
    throw failure(502, 'Invalid analytics report.');
  const dailyCounts = new Map();
  const firstDay = Date.parse(range.start + 'T00:00:00Z');
  for (let offset = 0; offset < days; offset++) {
    const date = new Date(firstDay + offset * DAY_MS)
      .toISOString().slice(0, 10);
    dailyCounts.set(date, 0);
  }
  const posts = new Map();
  let totalViews = 0;
  for (const row of groups) {
    const dimension = row?.dimensions;
    const count = row?.count;
    if (!countOk(count) || typeof dimension?.requestHost !== 'string' ||
        typeof dimension?.requestPath !== 'string' ||
        typeof dimension?.date !== 'string')
      throw failure(502, 'Cloudflare analytics response has invalid groups.');
    if (dimension.requestHost.toLowerCase() !== hostname) continue;
    if (!dailyCounts.has(dimension.date)) continue;
    const route = postFromPath(dimension.requestPath);
    if (!route) continue;
    const key = route.kind + ':' + route.id;
    const existing = posts.get(key) || {
      kind: route.kind, id: route.id, path: route.path,
      title: route.kind === 'pages'
        ? route.id.replace(/-/g, ' ')
        : (route.kind === 'news' ? 'News article · ' : 'Event · ') + route.id.slice(0, 8),
      views: 0,
    };
    existing.views += count;
    if (!Number.isSafeInteger(existing.views)) throw failure(502, 'Analytics count exceeds range.');
    posts.set(key, existing);
    dailyCounts.set(dimension.date, dailyCounts.get(dimension.date) + count);
    totalViews += count;
    if (!Number.isSafeInteger(totalViews)) throw failure(502, 'Analytics count exceeds range.');
  }
  const ranked = [...posts.values()].sort((a, b) =>
    b.views - a.views || a.path.localeCompare(b.path));
  const collections = ['news','events','pages'].map(kind => ({
    kind, views: ranked.filter(x => x.kind === kind)
      .reduce((sum, entry) => sum + entry.views, 0),
  }));
  return {
    days, range: { start: range.start, end: range.end },
    totalViews, postsTracked: ranked.length, posts: ranked,
    collections, daily: [...dailyCounts].map(([date, views]) => ({date, views})),
    measured: 'Cloudflare Web Analytics browser pageviews (may be sampled)',
    source: 'cloudflare-rum',
  };
}

/** Bounded daily queries; no Firestore writes or client-accessible Cloudflare keys. */
export async function cloudflareReport(days, {now = new Date(), env = process.env, fetcher = fetch} = {}) {
  const config = cloudflareConfig(env);
  const allGroups = [];
  for (const range of windows(days, now)) {
    const groups = await fetchCloudflareGroups(config, range, fetcher);
    allGroups.push(...groups);
  }
  return summarizeCloudflareGroups(allGroups, days, now, config.hostname);
}

export async function readViews(req) {
  if (req.method !== 'GET') throw failure(405, 'Method not allowed.');
  await verifyEditor(req, 'GET');
  const days = Number(req.query?.days || 30);
  return cloudflareReport(days);
}
