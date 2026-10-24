/**
 * Pure, read-only compatibility validation for existing Firestore CMS records.
 * Never requests credentials, writes database data or logs private field values.
 */
export const CMS_REQUIRED_FIELDS = Object.freeze({
  news: ['title', 'excerpt'],
  events: ['title', 'description', 'eventDate', 'location'],
  pages: ['title', 'slug', 'body'],
  societies: ['title', 'description'],
  sports: ['title', 'description'],
  leadership: ['title', 'role'],
  pastPapers: ['title', 'exam', 'subject', 'year', 'language', 'url'],
});

function fieldValue(fields, key) {
  const entry = fields?.[key];
  if (entry && Object.hasOwn(entry, 'stringValue')) return entry.stringValue;
  if (entry && Object.hasOwn(entry, 'booleanValue')) return entry.booleanValue;
  return undefined;
}

function isHttpsUrl(value) {
  if (typeof value !== 'string' || /\s/.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !!url.hostname && !url.username && !url.password;
  } catch {
    return false;
  }
}

function isCalendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00.000Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateCmsRecord(kind, id, fields = {}) {
  if (!Object.hasOwn(CMS_REQUIRED_FIELDS, kind)) throw new TypeError('Unknown CMS collection');
  const errors = [];
  if (typeof fieldValue(fields, 'published') !== 'boolean')
    errors.push('published must be a boolean');
  for (const key of CMS_REQUIRED_FIELDS[kind]) {
    const value = fieldValue(fields, key);
    if (typeof value !== 'string' || !value.trim()) errors.push(key + ' must be nonempty');
  }
  const title = fieldValue(fields, 'title');
  if (typeof title === 'string' && title.length > 180)
    errors.push('title exceeds 180 characters');

  if (kind === 'pages') {
    const slug = fieldValue(fields, 'slug');
    if (slug !== id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug || ''))
      errors.push('slug must equal the document ID');
  }
  if (kind === 'events') {
    const date = fieldValue(fields, 'eventDate');
    if (date && !isCalendarDate(date)) errors.push('invalid calendar date');
    const color = fieldValue(fields, 'color');
    if (color !== undefined && color !== '' &&
        (typeof color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(color)))
      errors.push('invalid event color');
  }
  if (kind === 'pastPapers') {
    const year = fieldValue(fields, 'year');
    if (year && (typeof year !== 'string' || !/^(19|20)[0-9]{2}$/.test(year)))
      errors.push('past-paper year must be four digits in 1900-2099');
    const language = fieldValue(fields, 'language');
    if (language && !['Sinhala', 'Tamil', 'English'].includes(language))
      errors.push('past-paper language must be Sinhala, Tamil or English');
  }
  for (const key of ['imageUrl', 'websiteUrl', 'url']) {
    const value = fieldValue(fields, key);
    if (value !== undefined && value !== '' && !isHttpsUrl(value))
      errors.push(key + ' must be an HTTPS URL without credentials');
  }
  return errors;
}
