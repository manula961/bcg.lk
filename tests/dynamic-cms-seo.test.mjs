import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  isMetadataCrawler, cmsDocumentRoute, publishedMetadata,
  renderCmsMetadata, publishedCmsResponse,
} from '../scripts/dynamic-cms-seo.mjs';

const template = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const id = 'AbCdEfGhIjKlMnOpQrSt';
const fields = (published = true) => ({
  published: { booleanValue: published },
  title: { stringValue: 'Science & <Innovation>' },
  excerpt: { stringValue: 'Student achievements & news' },
});
const opts = fetcher => ({
  project: 'bcg-public-test', apiKey: 'public-test-key',
  canonicalOrigin: 'https://bcglk.devoraid.com', fetcher,
});

test('metadata enrichment recognizes only published stable CMS document routes', () => {
  assert.equal(isMetadataCrawler('Googlebot/2.1'), true);
  assert.equal(isMetadataCrawler('Mozilla/5.0'), false);
  assert.deepEqual(cmsDocumentRoute('/updates/' + id), { collection: 'news', id, path: '/updates/' + id });
  assert.equal(cmsDocumentRoute('/updates/school-title'), null);
  assert.equal(cmsDocumentRoute('/events/../../admin'), null);
  assert.equal(cmsDocumentRoute('/audio/school-anthem.mp3'), null);
  assert.deepEqual(cmsDocumentRoute('/pages/college-history'), {
    collection: 'pages', id: 'college-history', path: '/pages/college-history',
  });
  assert.equal(publishedMetadata({ fields: fields(false) }, 'news'), null);
  assert.equal(publishedMetadata({ fields: fields(true) }, 'news')?.title, 'Science & <Innovation>');
});

test('published dynamic metadata escapes HTML and preserves the React body exactly', async () => {
  const requests = [];
  const fetcher = async url => {
    requests.push(String(url));
    if (String(url).startsWith('https://firestore.googleapis.com/'))
      return new Response(JSON.stringify({ fields: fields(true) }), { status: 200 });
    if (new URL(url).pathname === '/index.html')
      return new Response(template, { status: 200, headers: { 'content-type': 'text/html' } });
    throw Error('unexpected endpoint');
  };
  const response = await publishedCmsResponse(new Request('https://bcglk.devoraid.com/updates/' + id), opts(fetcher));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  const html = await response.text();
  assert.ok(html.includes('<title>Science &amp; &lt;Innovation&gt; | Bandaranayake College</title>'));
  assert.ok(html.includes('<link rel="canonical" href="https://bcglk.devoraid.com/updates/' + id + '" />'));
  assert.ok(html.includes('Student achievements &amp; news'));
  assert.equal(html.slice(html.indexOf('<body>')), template.slice(template.indexOf('<body>')));
  assert.equal(requests.length, 2);
});

test('drafts, forbidden responses and invalid HTML never reveal CMS metadata', async () => {
  const page = new Request('https://bcglk.devoraid.com/updates/' + id);
  for (const [status, published] of [[200, false], [403, true], [404, true]]) {
    let calls = 0;
    const fetcher = async () => {
      calls++;
      return new Response(JSON.stringify({ fields: fields(published) }), { status });
    };
    assert.equal(await publishedCmsResponse(page, opts(fetcher)), undefined);
    assert.equal(calls, 1);
  }
  assert.equal(renderCmsMetadata('{"secret":"draft"}', {
    title: 'Wrong', description: 'Wrong',
  }, 'https://bcglk.devoraid.com/updates/test'), null);
});

test('crawler SEO never fetches a shell from a mismatched request origin', async () => {
  let reads = 0;
  const fetcher = async () => {
    reads++;
    throw Error('Should not make any network request for a foreign host');
  };
  for (const origin of ['https://untrusted.example', 'http://bcglk.devoraid.com']) {
    const result = await publishedCmsResponse(
      new Request(origin + '/updates/' + id), opts(fetcher));
    assert.equal(result, undefined);
  }
  assert.equal(reads, 0);
});
