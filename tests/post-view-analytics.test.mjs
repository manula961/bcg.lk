import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  postRoute, reportingDates, viewKey, viewWrites, summarizeViews, checkViewRequest,
} from '../api/_lib/post-analytics.mjs';

const id = 'AbCdEfGhIjKlMnOpQrSt';
const post = '/updates/' + id;
const route = {kind:'news',id,path:post};
const sample = (kind, path, date, views, title) => {
  const match = postRoute(path);
  return { fields: {
    date:{stringValue:date}, kind:{stringValue:kind}, recordId:{stringValue:match.id},
    path:{stringValue:path}, title:{stringValue:title}, views:{integerValue:String(views)},
  } };
};

test('only stable public CMS post routes are counted, never admin, listing, or drafts',()=>{
  assert.deepEqual(postRoute(post), route);
  assert.deepEqual(postRoute('/events/' + id), {kind:'events',id,path:'/events/'+id});
  assert.deepEqual(postRoute('/pages/college-history'), {
    kind:'pages',id:'college-history',path:'/pages/college-history'
  });
  for(const url of ['/','/admin','/updates','/events','/past-papers','/updates/fake-title',
    '/events/../../admin','/pages/InvalidSlug', 'https://attacker.example/updates/'+id,
    '/pages/'+('x'.repeat(130))]) assert.equal(postRoute(url),null,url);
});

test('UTC date bounds are deterministic and invalid reporting ranges fail closed',()=>{
  assert.deepEqual(reportingDates(7,new Date('2026-10-26T21:00:00Z')),
    {start:'2026-10-20',end:'2026-10-26'});
  assert.throws(()=>reportingDates(365),{status:400});
});

test('hashed dedupe rotates each bucket and stores no unhashed identifiers',()=>{
  const salt='a'.repeat(64);
  const first=viewKey(route,'203.0.113.1','Mozilla/5.0 Test Browser',1800000,salt);
  assert.match(first,/^[a-f0-9]{64}$/);
  assert.equal(first,viewKey(route,'203.0.113.1','Mozilla/5.0 Test Browser',1800050,salt));
  assert.notEqual(first,viewKey(route,'203.0.113.1','Mozilla/5.0 Test Browser',3600000,salt));
  assert.notEqual(first,viewKey(route,'203.0.113.2','Mozilla/5.0 Test Browser',1800000,salt));
  const writes=viewWrites({project:'bcg-demo-test',route,title:'School News',key:first,
    now:Date.parse('2026-10-26T00:00:00Z')});
  assert.equal(writes.length,2);
  assert.deepEqual(writes[0].currentDocument,{exists:false});
  assert.equal(writes[1].updateTransforms[0].increment.integerValue,'1');
  assert.match(writes[1].update.name,/analyticsViewsDaily\/20261026_news_/);
  assert.ok(!JSON.stringify(writes).includes('203.0.113.1'));
  assert.ok(!JSON.stringify(writes).includes('Mozilla/5.0'));
});

test('rank most-viewed posts across days, with by-kind and UTC trend totals',()=>{
  const now=new Date('2026-10-26T10:00:00Z');
  const input=[
    sample('news',post,'2026-10-26',10,'News title'),
    sample('news',post,'2026-10-25',5,'News title'),
    sample('events','/events/'+id,'2026-10-26',2,'School event'),
    sample('pages','/pages/college-history','2026-10-24',4,'College history'),
  ];
  const report=summarizeViews(input,7,now);
  assert.equal(report.totalViews,21);
  assert.equal(report.postsTracked,3);
  assert.deepEqual(report.posts.map(x=>x.views),[15,4,2]);
  assert.deepEqual(report.collections.map(x=>x.views),[15,2,4]);
  assert.equal(report.daily.at(-1).views,12);
  assert.equal(report.daily.at(-2).views,5);
  assert.equal(report.daily.length,7);
  assert.throws(()=>summarizeViews([sample('news',post,'2026-10-26',-5,'Bad')],7,now),
    {status:502});
  assert.throws(()=>summarizeViews([sample('news',post,'2026-10-19',2,'Old')],7,now),
    {status:502});
});

test('tracking fails closed until enabled with approved origin and server key',()=>{
  const old=process.env.BCG_ANALYTICS_ENABLED;
  try{
    process.env.BCG_ANALYTICS_ENABLED='0';
    assert.throws(()=>checkViewRequest({method:'POST',headers:{},body:{path:post}}),{status:503});
  }finally{
    if(old===undefined)delete process.env.BCG_ANALYTICS_ENABLED;
    else process.env.BCG_ANALYTICS_ENABLED=old;
  }
});

test('no existing React routing/components or source index.html are changed for tracking',()=>{
  const build=readFileSync(new URL('../scripts/generate-seo-pages.mjs',import.meta.url),'utf8');
  const tracker=readFileSync(new URL('../scripts/browser-post-view-tracker.js',import.meta.url),'utf8');
  const board=readFileSync(new URL('../src/admin/PostViewsDashboard.jsx',import.meta.url),'utf8');
  const shell=readFileSync(new URL('../src/admin/AnalyticsDashboard.jsx',import.meta.url),'utf8');
  assert.match(build,/injectPostTracker\(home\)/);
  assert.match(build,/assets\/bcg-post-views\.js/);
  assert.match(shell,/<PostViewsDashboard userId=\{userId\} \/>/);
  assert.match(tracker,/navigator\.globalPrivacyControl/);
  assert.match(tracker,/credentials: 'omit'/);
  assert.doesNotMatch(tracker,/localStorage|sessionStorage|document\.cookie/);
  assert.match(board,/most visited news, events/);
});
