import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  assertServedSeoHtml, assertServedRobots, assertServedSitemap, summarizeCspRisk,
} from '../scripts/live-seo-verification.mjs';
import {ORIGIN, renderStaticSeoHtml, generatedRobotsTxt, staticSitemap, seoRoutes} from '../scripts/generate-seo-pages.mjs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const homepage = read('index.html');
const path = '/events';
const route = seoRoutes.find(x => x.path === path);
const html = renderStaticSeoHtml(homepage,route);

test('live SEO checks validate real built page metadata and canonical origin',()=>{
  assert.equal(assertServedSeoHtml(homepage,{origin:ORIGIN,path:'/'}),ORIGIN+'/');
  assert.equal(assertServedSeoHtml(html,{origin:ORIGIN,path}),ORIGIN+path);
  assert.throws(()=>assertServedSeoHtml(html,{origin:'https://other.example',path}),/canonical/);
  assert.throws(()=>assertServedSeoHtml('<html><head><title>JS only</title></head></html>',
    {origin:ORIGIN,path}),/canonical/);
});

test('live SEO rejects duplicate canonicals, wrong OpenGraph and unapproved robots noindex',()=>{
  const duplicate=html.replace('</head>','<link rel="canonical" href="'+ORIGIN+'/events" /></head>');
  assert.throws(()=>assertServedSeoHtml(duplicate,{origin:ORIGIN,path}),/exactly one canonical/);
  const wrong=html.replace('property="og:url" content="'+ORIGIN+'/events"',
    'property="og:url" content="https://unapproved.example/events"');
  assert.throws(()=>assertServedSeoHtml(wrong,{origin:ORIGIN,path}),/OpenGraph/);
  const blocked=html.replace('</head>','<meta name="robots" content="noindex"></head>');
  assert.throws(()=>assertServedSeoHtml(blocked,{origin:ORIGIN,path}),/noindex/);
});

test('live robots and sitemap must use approved host and exclude administrative paths',()=>{
  const robots=generatedRobotsTxt();
  const sitemap=staticSitemap();
  assert.doesNotThrow(()=>assertServedRobots(robots,ORIGIN));
  assert.ok(assertServedSitemap(sitemap,ORIGIN)>=3);
  assert.throws(()=>assertServedRobots(robots, 'https://wrong.example'),/exactly one sitemap/);
  assert.throws(()=>assertServedRobots(robots.replace(/^Disallow: \/admin$/m,''),ORIGIN),/\/admin/);
  assert.throws(()=>assertServedSitemap(sitemap.replace(ORIGIN+'/events','https://other.example/events'),ORIGIN),
    /missing approved public route/);
  assert.throws(()=>assertServedSitemap(sitemap.replace('</urlset>','<url><loc>'+ORIGIN+'/admin</loc></url></urlset>'),ORIGIN),
    /administrative URL/);
});

test('CSP wildcards are disclosed rather than incorrectly certified as production-safe',()=>{
  const config=JSON.parse(read('vercel.json'));
  const csp=config.headers[0].headers.find(x=>x.key==='Content-Security-Policy').value;
  const report=summarizeCspRisk(csp);
  assert.ok(report.some(x=>x.includes('connect-src')));
  assert.ok(report.some(x=>x.includes('frame-src')));
  assert.deepEqual(summarizeCspRisk("default-src 'self'; connect-src 'self' https://firestore.googleapis.com; frame-src 'none'; img-src 'self' https://drive.google.com"),[]);
});

test('manual production smoke includes tested SEO checks, approved commit and no write methods',()=>{
  const script=read('scripts/check-public-deployment.mjs');
  for(const term of ['BCG_EXPECTED_DEPLOYED_SHA','assertServedSeoHtml','assertServedRobots','assertServedSitemap','summarizeCspRisk'])
    assert.ok(script.includes(term),term);
  assert.match(script,/method: 'GET'/);
  assert.doesNotMatch(script,/method: '(?:POST|PUT|PATCH|DELETE)'/);
});
