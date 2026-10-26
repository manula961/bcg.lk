import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ANALYTICS_COLLECTIONS, summarizeContentMetrics, analyticsCsv }
  from '../src/admin/analyticsMetrics.mjs';

const fill = () => ANALYTICS_COLLECTIONS.map(({ id }) => ({ id, total: 0, published: 0, recent: 0 }));
const read = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8');

test('content analytics summarizes each current Firestore collection without invented visitors', () => {
  const rows = fill();
  rows[0] = { id: 'news', total: 12, published: 7, recent: 4 };
  rows[1] = { id: 'events', total: 3, published: 3, recent: 1 };
  const summary = summarizeContentMetrics(rows);
  assert.deepEqual(summary.totals, { total: 15, published: 10, drafts: 5, recent: 5 });
  assert.equal(summary.publicationRate, 67);
  assert.equal(summary.items[0].label, 'News');
  assert.equal(summary.items[0].drafts, 5);
  assert.equal(summary.items.length, 7);
  assert.deepEqual(summarizeContentMetrics(fill()).totals,
    { total: 0, published: 0, drafts: 0, recent: 0 });
});

test('analytics rejects partial results, duplicates, negative, impossible or non-integer counts', () => {
  const rows = fill();
  for (const modified of [
    rows.slice(0, 6),
    rows.map((row, i) => i === 1 ? rows[0] : row),
    rows.map((row, i) => i === 0 ? { ...row, total: -1 } : row),
    rows.map((row, i) => i === 0 ? { ...row, total: 1, published: 2 } : row),
    rows.map((row, i) => i === 0 ? { ...row, total: 3, recent: 4 } : row),
    rows.map((row, i) => i === 0 ? { ...row, recent: NaN } : row),
  ]) {
    assert.throws(() => summarizeContentMetrics(modified), /Incomplete|inconsistent/);
  }
});

test('CSV export contains only aggregated editorial counts and selected interval', () => {
  const summary = summarizeContentMetrics(fill());
  const result = analyticsCsv(summary, 30);
  assert.match(result, /^Collection,Total,Published,Drafts,Added in last 30 days/m);
  assert.match(result, /^All content,0,0,0,0$/m);
  assert.doesNotMatch(result, /email|uid|password|visitor/i);
  assert.throws(() => analyticsCsv(summary, 365), /Unsupported date range/);
});

test('analytics stays behind existing verified admin session and uses Firestore count API', () => {
  const shell = read('src/admin/AdminApp.jsx');
  const nav = read('src/admin/AdminDashboard.jsx');
  const dashboard = read('src/admin/AnalyticsDashboard.jsx');
  assert.match(shell, /session.status === 'authorized'/);
  assert.match(nav, /<AnalyticsDashboard userId=\{user\?\.uid\} \/>/);
  assert.match(dashboard, /getCountFromServer\(/);
  assert.match(dashboard, /where\('published', '==', true\)/);
  assert.match(dashboard, /where\('createdAt', '>=', since\)/);
  assert.doesNotMatch(dashboard, /onSnapshot|localStorage|google-analytics\.com/);
});
