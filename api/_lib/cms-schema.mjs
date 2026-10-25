/**
 * Schema validation for privileged Firestore REST writes.
 * Server credentials bypass client rules, so never rely on firestore.rules
 * to validate service-account mutations. Keep this in sync with those rules.
 */
const CONTENT_FIELDS = Object.freeze({
  news: Object.freeze({ title:180, excerpt:500, body:30000, category:32, tag:80, imageUrl:2048 }),
  events: Object.freeze({ title:180, description:3000, eventDate:10, location:200, color:7, imageUrl:2048 }),
  pages: Object.freeze({ slug:120, title:180, body:50000, seoDescription:320, imageUrl:2048 }),
  societies: Object.freeze({ title:180, description:1200, category:80, imageUrl:2048, websiteUrl:2048 }),
  sports: Object.freeze({ title:180, description:3000, category:80, achievements:2000, imageUrl:2048 }),
  leadership: Object.freeze({ title:180, description:1200, role:80, imageUrl:2048 }),
  pastPapers: Object.freeze({ title:180, exam:40, subject:120, year:4, language:20, term:80, url:2048 }),
});
const REQUIRED = Object.freeze({
  news:['title','excerpt'],
  events:['title','description','eventDate','location'],
  pages:['title','slug','body'],
  societies:['title','description'],
  sports:['title','description'],
  leadership:['title','role'],
  pastPapers:['title','exam','subject','year','language','url'],
});
const META = new Set(['published','rank','createdAt','updatedAt','publishedAt','createdBy','updatedBy']);
const INVALID = 'Invalid CMS record; changes were not saved.';
const fail = reason => Object.assign(new Error(reason || INVALID),{status:400});
const plain = value => value && typeof value === 'object' && !Array.isArray(value);
const validDate = value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00.000Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value;
};
function validHttps(value) {
  if (value === '') return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password &&
      !/[\s]/.test(value);
  } catch { return false; }
}
function string(value,max,required=false) {
  return plain(value) && typeof value.stringValue === 'string' &&
    value.stringValue.length <= max &&
    (!required || value.stringValue.trim().length > 0);
}
function extra(kind,key,value,id) {
  const text = value.stringValue;
  if (['imageUrl','websiteUrl','url'].includes(key) && !validHttps(text)) return false;
  if (key === 'slug' && (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(text) || id !== text)) return false;
  if (key === 'eventDate' && !validDate(text)) return false;
  if (key === 'year' && !/^(19|20)[0-9]{2}$/.test(text)) return false;
  if (key === 'color' && text && !/^#[0-9a-fA-F]{6}$/.test(text)) return false;
  if (key === 'category' && kind === 'news' && !['News','Announcements'].includes(text)) return false;
  if (key === 'language' && !['Sinhala','Tamil','English'].includes(text)) return false;
  if (key === 'role' && kind === 'leadership' &&
      !['Principal','Deputy Principal','Assistant Principal','Sectional Head','Other Senior Staff'].includes(text)) return false;
  return true;
}

/** Validates an entire REST document.fields object before service-account writes. */
export function validateCmsRecord(kind,id,fields) {
  const definitions = CONTENT_FIELDS[kind];
  if (!definitions || !plain(fields) || Object.keys(fields).length > 25)
    throw fail();
  for (const key of Object.keys(fields)) {
    const value = fields[key];
    if (Object.hasOwn(definitions,key)) {
      if (!string(value,definitions[key],REQUIRED[kind].includes(key)) ||
          !extra(kind,key,value,id)) throw fail('Invalid CMS field: '+key);
    } else if (META.has(key)) {
      if (key === 'published' && (!plain(value) || typeof value.booleanValue !== 'boolean')) throw fail();
      if (key === 'rank' && (!plain(value) ||
          !(value.nullValue === null || (typeof value.integerValue === 'string' && /^-?\d+$/.test(value.integerValue)) ||
          typeof value.doubleValue === 'number'))) throw fail();
      if (['createdAt','updatedAt','publishedAt'].includes(key) && (!plain(value) ||
          !(typeof value.timestampValue === 'string' && Number.isFinite(Date.parse(value.timestampValue)) ||
          (key === 'publishedAt' && value.nullValue === null)))) throw fail();
      if (['createdBy','updatedBy'].includes(key) && !string(value,128)) throw fail();
    } else {
      throw fail('Unrecognized CMS field.');
    }
  }
  for (const key of REQUIRED[kind]) {
    if (!Object.hasOwn(fields,key) || !string(fields[key],definitions[key],true)) throw fail('Missing required CMS field: '+key);
  }
  if (fields.published?.booleanValue !== true && fields.published?.booleanValue !== false) throw fail('Invalid publication status.');
  return fields;
}
export function validateCmsPatch(kind,patch) {
  const definitions = CONTENT_FIELDS[kind];
  if (!definitions || !plain(patch) || Object.keys(patch).length === 0 || Object.keys(patch).length > 15)
    throw fail('Invalid content change.');
  const fields = {};
  for (const [key,value] of Object.entries(patch)) {
    if (!Object.hasOwn(definitions,key) || (kind === 'pages' && key === 'slug') ||
        typeof value !== 'string' || value.length > definitions[key])
      throw fail('Invalid or oversized content field.');
    const clean = value.trim();
    const mapped = {stringValue:clean};
    if (!string(mapped,definitions[key],REQUIRED[kind].includes(key)) ||
        !extra(kind,key,mapped,kind === 'pages' ? undefined : null))
      throw fail('Invalid CMS field: '+key);
    fields[key] = mapped;
  }
  return fields;
}
