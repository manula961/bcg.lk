/**
 * Shared admin CMS list classification. "Delete" is a recoverable archive:
 * deleted records stay in Firestore but are excluded from active list views.
 * The server-owned archive endpoint enforces roles and unpublishes each record.
 */
export function summarizeCmsItems(items, archivedIds) {
  const totals = { all: 0, published: 0, drafts: 0, deleted: 0 };
  for (const item of items) {
    if (archivedIds.has(item.id)) {
      totals.deleted += 1;
    } else {
      totals.all += 1;
      if (item.published === true) totals.published += 1;
      else totals.drafts += 1;
    }
  }
  return totals;
}

export function filterCmsItems(items, { status = 'all', search = '', archivedIds = new Set() } = {}) {
  const term = search.trim().toLocaleLowerCase();
  return items.filter(item => {
    const deleted = archivedIds.has(item.id);
    if (status === 'deleted' ? !deleted : deleted) return false;
    if (status === 'published' && item.published !== true) return false;
    if (status === 'drafts' && item.published === true) return false;
    if (!term) return true;
    return [
      item.title, item.slug, item.category, item.location, item.eventDate,
      item.excerpt, item.description, item.websiteUrl, item.role,
      item.achievements, item.exam, item.subject, item.year, item.language,
    ].some(value => typeof value === 'string' && value.toLocaleLowerCase().includes(term));
  });
}
