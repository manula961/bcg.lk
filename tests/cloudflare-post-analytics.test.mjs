import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  postFromPath, reportingWindow, windows, cloudflareConfig, CLOUD_FLARE_QUERY,
  fetchCloudflareGroups, summarizeCloudflareGroups, cloudflareReport,
} from '../api/_lib/cloudflare-post-analytics.mjs';

const newsId='AbCdEfGhIjKlMnOpQrSt';
const eventId='TsRqPoNmLkJiHgFeDcBa';
const host='bcglk.devoraid.com';
const env={
  CLOUDFLARE_ACCOUNT_ID:'a'.repeat(32),
  CLOUDFLARE_WEB_ANALYTICS_SITE_TAG:'b'.repeat(32),
  CLOUDFLARE_ANALYTICS_API_TOKEN:'secret-test-token-do-not-publish',
  BCG_CANONICAL_ORIGIN:'https://bcglk.devoraid.com',
};
const row=(date,requestPath,count,requestHost=host)=>({
  count,dimensions:{date,requestPath,requestHost},
});

test('canonical CMS posts only; admin, listings and arbitrary external URLs excluded',()=>{
  assert.deepEqual(postFromPath('/updates/'+newsId),{
    kind:'news', id:newsId,path:'/updates/'+newsId,
  });
  assert.deepEqual(postFromPath('/events/'+eventId),{
    kind:'events',id:eventId,path:'/events/'+eventId,
  });
  assert.equal(postFromPath('/pages/school-history')?.id,'school-history');
  for(const path of ['/','/admin','/updates','/events','/past-papers',
    '/updates/some-title','/events/../admin','/pages/UpperCase',
    'https://attacker.example/updates/'+newsId,'/pages/'+('x'.repeat(150))])
    assert.equal(postFromPath(path), null, path);
});

test('UTC windows cover 7, 30 and 90 days and bound each Cloudflare request to 30 days',()=>{
  const now=new Date('2026-10-26T08:15:00.000Z');
  assert.deepEqual(reportingWindow(7,now),{
    start:'2026-10-20',end:'2026-10-26',until:now.toISOString(),
  });
  assert.deepEqual(windows(7,now),[{
    start:'2026-10-20T00:00:00.000Z',end:'2026-10-26T08:15:00.000Z',
  }]);
  const ranges=windows(90,now);
  assert.equal(ranges.length,3);
  assert.equal(ranges[0].end,ranges[1].start);
  assert.equal(ranges[1].end,ranges[2].start);
  assert.equal(ranges.at(-1).end,now.toISOString());
  assert.throws(()=>reportingWindow(365,now),{status:400});
});

test('report config validates identifiers and secrets stay server only',()=>{
  assert.equal(cloudflareConfig(env).hostname,host);
  assert.throws(()=>cloudflareConfig({...env,CLOUDFLARE_ACCOUNT_ID:'invalid'}),{status:503});
  // A browser beacon token alone does not establish the GraphQL RUM site tag.
  assert.throws(()=>cloudflareConfig({...env,
    CLOUDFLARE_WEB_ANALYTICS_SITE_TAG:undefined,
    CLOUDFLARE_WEB_ANALYTICS_SITE_TOKEN:'f'.repeat(32),
  }),{status:503});
  assert.throws(()=>cloudflareConfig({...env,CLOUDFLARE_ANALYTICS_API_TOKEN:''}),{status:503});
  assert.throws(()=>cloudflareConfig({...env,BCG_CANONICAL_ORIGIN:'http://bcglk.devoraid.com'}),{status:503});
  assert.match(CLOUD_FLARE_QUERY,/siteTag: \$siteTag/);
  assert.match(CLOUD_FLARE_QUERY,/requestPath/);
  assert.match(CLOUD_FLARE_QUERY,/requestHost/);
});

test('Cloudflare RUM groups rank post pageviews, exclude other hosts and non-post paths',()=>{
  const now=new Date('2026-10-26T09:00:00Z');
  const groups=[
    row('2026-10-26','/updates/'+newsId,9),
    row('2026-10-25','/updates/'+newsId,3),
    row('2026-10-26','/events/'+eventId,4),
    row('2026-10-26','/pages/school-history',2),
    row('2026-10-26','/',123),
    row('2026-10-26','/updates/'+newsId,400,'preview.vercel.app'),
  ];
  const result=summarizeCloudflareGroups(groups,7,now,host);
  assert.equal(result.totalViews,18);
  assert.equal(result.postsTracked,3);
  assert.deepEqual(result.posts.map(x=>x.views),[12,4,2]);
  assert.deepEqual(result.collections.map(x=>x.views),[12,4,2]);
  assert.equal(result.daily.at(-1).views,15);
  assert.equal(result.daily.at(-2).views,3);
  assert.equal(result.daily.length,7);
  assert.equal(result.source,'cloudflare-rum');
  assert.throws(()=>summarizeCloudflareGroups([row('2026-10-26','/updates/'+newsId,-1)],
    7,now,host),{status:502});
});

test('GraphQL verifies HTTP status, GraphQL errors and groups; never fabricates zero',async()=>{
  const cfg=cloudflareConfig(env);
  const range=windows(7,new Date('2026-10-26T08:15:00Z'))[0];
  const good={ok:true,json:async()=>({data:{viewer:{accounts:[{rows:[
    row('2026-10-26','/updates/'+newsId,3),
  ]}]}}})};
  let call;
  const found=await fetchCloudflareGroups(cfg,range,async(url,options)=>{
    call={url,options}; return good;
  });
  assert.equal(found.length,1);
  assert.equal(call.url,'https://api.cloudflare.com/client/v4/graphql');
  assert.equal(call.options.headers.Authorization,'Bearer '+env.CLOUDFLARE_ANALYTICS_API_TOKEN);
  const variables=JSON.parse(call.options.body).variables;
  assert.equal(variables.siteTag,env.CLOUDFLARE_WEB_ANALYTICS_SITE_TAG);
  assert.equal(variables.accountTag,env.CLOUDFLARE_ACCOUNT_ID);
  for (const response of [
    {ok:false,json:async()=>({})},
    {ok:true,json:async()=>({errors:[{message:'Unauthorized'}]})},
    {ok:true,json:async()=>({data:{viewer:{accounts:[{rows:[]},{rows:[]}]}}})},
    {ok:true,json:async()=>({data:{viewer:{accounts:[{rows:Array(5000).fill(
      row('2026-10-26','/',1))}]}}})},
  ]) await assert.rejects(()=>fetchCloudflareGroups(cfg,range,async()=>response),{status:502});
});

test('end-to-end report calls Cloudflare instead of Firestore write endpoints',async()=>{
  const now=new Date('2026-10-26T08:15:00Z');
  const requests=[];
  const result=await cloudflareReport(90,{
    env,now,fetcher:async(url,options)=>{
      requests.push({url,variables:JSON.parse(options.body).variables});
      return {ok:true,json:async()=>({data:{viewer:{accounts:[{rows:[
        row('2026-10-26','/updates/'+newsId,5),
      ]}]}}})};
    },
  });
  assert.equal(requests.length,3);
  assert.equal(result.totalViews,15);
  assert.equal(result.postsTracked,1);
  assert.equal(result.daily.length,90);
  assert.equal(result.posts[0].path,'/updates/'+newsId);
});

test('public build contains no legacy Firestore analytics tracker',()=>{
  const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
  const generator=read('scripts/generate-seo-pages.mjs');
  const handler=read('api/admin/post-analytics.js');
  assert.match(generator,/injectCloudflareBeacon/);
  assert.doesNotMatch(generator,/bcg-post-views\.js|browser-post-view-tracker/);
  assert.match(handler,/cloudflare-post-analytics\.mjs/);
  assert.doesNotMatch(handler,/api\/_lib\/post-analytics\.mjs/);
});
