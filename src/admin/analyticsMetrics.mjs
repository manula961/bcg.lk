/** Read-only analytics labels and aggregation helpers.
 * These values describe editorial Firestore documents, not site visitors.
 */
export const ANALYTICS_COLLECTIONS = Object.freeze([
  { id: 'news', label: 'News' },
  { id: 'events', label: 'Events' },
  { id: 'pages', label: 'Pages' },
  { id: 'societies', label: 'Societies' },
  { id: 'sports', label: 'Sports' },
  { id: 'leadership', label: 'Leadership' },
  { id: 'pastPapers', label: 'Past Papers' },
]);

const safeCount = value => Number.isSafeInteger(value) && value >= 0;

export function summarizeContentMetrics(rows) {
  if (!Array.isArray(rows) || rows.length !== ANALYTICS_COLLECTIONS.length)
    throw new Error('Incomplete analytics results.');
  const seen = new Set();
  const items = rows.map(item => {
    if (!ANALYTICS_COLLECTIONS.some(c => c.id === item?.id) ||
        seen.has(item.id) ||
        ![item.total, item.published, item.recent].every(safeCount) ||
        item.published > item.total || item.recent > item.total)
      throw new Error('Analytics counts are incomplete or inconsistent; refresh to retry.');
    seen.add(item.id);
    return {
      id: item.id,
      label: ANALYTICS_COLLECTIONS.find(c => c.id === item.id).label,
      total: item.total,
      published: item.published,
      drafts: item.total - item.published,
      recent: item.recent,
    };
  });
  const totals = items.reduce((value, item) => ({
    total: value.total + item.total,
    published: value.published + item.published,
    drafts: value.drafts + item.drafts,
    recent: value.recent + item.recent,
  }), { total: 0, published: 0, drafts: 0, recent: 0 });
  return { items, totals, publicationRate: totals.total
    ? Math.round(100 * totals.published / totals.total) : 0 };
}

export function analyticsCsv(summary, periodDays) {
  if (![7, 30, 90].includes(periodDays)) throw new Error('Unsupported date range.');
  const lines = [
    'Collection,Total,Published,Drafts,Added in last ' + periodDays + ' days',
    ...summary.items.map(row => [row.label, row.total, row.published, row.drafts, row.recent].join(',')),
    ['All content', summary.totals.total, summary.totals.published,
      summary.totals.drafts, summary.totals.recent].join(','),
  ];
  return lines.join('\n') + '\n';
}
