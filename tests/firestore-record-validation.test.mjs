import test from 'node:test';
import assert from 'node:assert/strict';
import { CMS_REQUIRED_FIELDS, validateCmsRecord } from '../scripts/firestore-record-validation.mjs';

const string = value => ({ stringValue: value });
const boolean = value => ({ booleanValue: value });
const base = { title: string('Title'), published: boolean(false) };
const samples = {
  news: { excerpt: string('News summary') },
  events: { description: string('Details'), eventDate: string('2026-10-18'), location: string('Hall') },
  pages: { slug: string('school-info'), body: string('Body') },
  societies: { description: string('Society') },
  sports: { description: string('Sport') },
  leadership: { role: string('Principal') },
  pastPapers: { exam: string('Grade 10'), subject: string('Science'), year: string('2025'),
    language: string('Sinhala'), url: string('https://drive.google.com/file/d/example/view') },
};

test('read-only audit checks all seven CMS collections', () => {
  assert.deepEqual(Object.keys(CMS_REQUIRED_FIELDS), Object.keys(samples));
  for (const [name, fields] of Object.entries(samples)) {
    assert.deepEqual(
      validateCmsRecord(name, name === 'pages' ? 'school-info' : 'record', { ...base, ...fields }),
      [], name,
    );
  }
});

test('Past Papers audit flags invalid metadata and insecure links', () => {
  const data = { ...base, ...samples.pastPapers };
  for (const [changed, expected] of [
    [{ year: string('202X') }, 'year'],
    [{ language: string('French') }, 'language'],
    [{ url: string('http://example.org/file.pdf') }, 'HTTPS'],
    [{ url: string('https://user:pass@example.org/file.pdf') }, 'credentials'],
    [{ title: string('') }, 'title'],
  ]) {
    assert.ok(validateCmsRecord('pastPapers', 'record', { ...data, ...changed })
      .some(message => message.includes(expected)), expected);
  }
});

test('audit checks actual dates, page IDs, and boolean publication', () => {
  assert.ok(validateCmsRecord('events', 'record', {
    ...base, ...samples.events, eventDate: string('2026-02-30'),
  }).some(message => message.includes('calendar date')));
  assert.ok(validateCmsRecord('pages', 'other-slug', {
    ...base, ...samples.pages,
  }).some(message => message.includes('slug')));
  assert.ok(validateCmsRecord('news', 'record', {
    ...base, ...samples.news, published: string('true'),
  }).some(message => message.includes('boolean')));
  assert.throws(() => validateCmsRecord('unknown', 'record', base), TypeError);
});
