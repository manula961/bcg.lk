import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {checkMainProtection,checkMainRulesetProtection,checkLiveGitHubRelease} from '../scripts/check-github-main-protection.mjs';
import {REQUIRED_PR_CHECKS} from '../scripts/merge-integrity.mjs';

const sha='a'.repeat(40), head='b'.repeat(40);
const branch={name:'main',protected:true,commit:{sha}};
const policy={
  required_status_checks:{strict:true,contexts:[...REQUIRED_PR_CHECKS]},
  required_pull_request_reviews:{
    required_approving_review_count:1,dismiss_stale_reviews:true,require_last_push_approval:true,
  },
  enforce_admins:{enabled:true},
  allow_force_pushes:{enabled:false},allow_deletions:{enabled:false},
  required_conversation_resolution:{enabled:true},
};
const pr={number:110,merged_at:'2026-11-02T00:00:00Z',merge_commit_sha:sha,
  base:{ref:'main'},head:{sha:head},user:{login:'author'}};
const review={id:1,state:'APPROVED',commit_id:head,
  submitted_at:'2026-11-02T00:01:00Z',user:{login:'reviewer',type:'User'}};
const check_runs=REQUIRED_PR_CHECKS.map((name,id)=>({
  name,head_sha:head,id:id+1,status:'completed',conclusion:'success',
  completed_at:'2026-11-02T00:02:00Z',
}));

test('actual GitHub branch settings must enforce required reviews and checks',()=>{
  assert.deepEqual(checkMainProtection(branch,policy),[]);
  assert.ok(checkMainProtection({...branch,protected:false},policy).some(x=>x.includes('not protected')));
  for(const setting of [
    {...policy,required_status_checks:{strict:false,contexts:REQUIRED_PR_CHECKS}},
    {...policy,required_status_checks:{strict:true,contexts:[]}},
    {...policy,required_pull_request_reviews:null},
    {...policy,required_pull_request_reviews:{required_approving_review_count:1,dismiss_stale_reviews:false,require_last_push_approval:false}},
    {...policy,enforce_admins:{enabled:false}},
    {...policy,allow_force_pushes:{enabled:true}},
    {...policy,allow_deletions:{enabled:true}},
    {...policy,required_conversation_resolution:{enabled:false}},
    {...policy,required_pull_request_reviews:{...policy.required_pull_request_reviews,required_approving_review_count:undefined}},
  ]) assert.ok(checkMainProtection(branch,setting).length>0);
});

test('no audit credentials or unprotected main can ever produce a release pass',async()=>{
  await assert.rejects(()=>checkLiveGitHubRelease({}),/AUDIT_TOKEN/);
  let calls=0;
  const fetcher=async (_url,opts)=>{
    calls++;
    assert.equal(opts.method,'GET');
    assert.equal(opts.headers.Authorization,'Bearer test-readonly');
    return {ok:true,json:async()=>({...branch,protected:false})};
  };
  await assert.rejects(()=>checkLiveGitHubRelease({token:'test-readonly',fetcher}),/unprotected/);
  assert.equal(calls,1);
});

test('missing GitHub permissions fail closed without a bypass',async()=>{
  const fetcher=async()=>({ok:false,status:403});
  await assert.rejects(()=>checkLiveGitHubRelease({token:'t',fetcher}),/HTTP 403/);
});

test('latest main must have independently reviewed fresh head and all required checks',async()=>{
  const data=[branch,policy,[pr],[review],{total_count:check_runs.length,check_runs}];
  const fetcher=async (url,options)=>{
    assert.match(url,/api\.github\.com\/repos\/manula961\/bcg\.lk/);
    assert.equal(options.method,'GET');
    const i=url.includes('/branches/main/protection')?1
      :url.endsWith('/branches/main')?0
      :url.includes('/pulls/110/reviews')?3
      :url.includes('/check-runs')?4:2;
    return {ok:true,json:async()=>data[i]};
  };
  assert.deepEqual(await checkLiveGitHubRelease({token:'test-readonly',fetcher}),
    {protected:true,latestMainSha:sha,pr:110,checks:REQUIRED_PR_CHECKS.length});
  const broken=[branch,policy,[pr],[],{total_count:check_runs.length,check_runs}];
  const failer=async url=>({ok:true,json:async()=>{
    const i=url.includes('/branches/main/protection')?1:url.endsWith('/branches/main')?0
      :url.includes('/pulls/110/reviews')?3:url.includes('/check-runs')?4:2;
    return broken[i];
  }});
  await assert.rejects(()=>checkLiveGitHubRelease({token:'t',fetcher:failer}),/lacks an independent/);
});

test('manual release smoke runs governance verification and has no write permissions',()=>{
  const workflow=readFileSync(new URL('../.github/workflows/production-readonly-smoke.yml',import.meta.url),'utf8');
  assert.match(workflow,/scripts\/check-github-main-protection\.mjs/);
  assert.match(workflow,/BCG_GITHUB_AUDIT_TOKEN:/);
  assert.match(workflow,/contents: read/);
  assert.doesNotMatch(workflow,/contents: write/);
});

test('a changes-requested review beyond page one invalidates an earlier approval', async()=>{
  let secondPageRead = false;
  const fetcher = async url => ({ok:true,json:async()=>{
    if(url.endsWith('/branches/main')) return branch;
    if(url.endsWith('/branches/main/protection')) return policy;
    if(url.includes('/reviews')) {
      if(url.endsWith('page=2')) {
        secondPageRead = true;
        return [{...review,id:101,state:'CHANGES_REQUESTED',submitted_at:'2026-11-02T01:00:00Z'}];
      }
      return [review,...Array.from({length:99},(_,i)=>({...review,id:i+2,state:'COMMENTED'}))];
    }
    if(url.includes('/check-runs')) return {total_count:check_runs.length,check_runs};
    return [pr];
  }});
  await assert.rejects(()=>checkLiveGitHubRelease({token:'test',fetcher}),/lacks an independent/);
  assert.equal(secondPageRead,true);
});


const protectedRuleset = {
  id:26350113, name:'01', target:'branch', enforcement:'active',
  source_type:'Repository', source:'manula961/bcg.lk',
  conditions:{ref_name:{include:['~DEFAULT_BRANCH'],exclude:[]}},
  bypass_actors:[], current_user_can_bypass:'never',
  rules:[
    {type:'non_fast_forward'},
    {type:'deletion'},
    {type:'pull_request',parameters:{
      required_approving_review_count:1,
      dismiss_stale_reviews_on_push:true,
      require_last_push_approval:true,
      required_review_thread_resolution:true,
    }},
    {type:'required_status_checks',parameters:{
      strict_required_status_checks_policy:true,
      required_status_checks:REQUIRED_PR_CHECKS.map(context=>({context})),
    }},
  ],
};

test('complete active ruleset protects the default branch with no bypass and all checks',()=>{
  assert.deepEqual(checkMainRulesetProtection(branch, protectedRuleset),[]);
  const partials=[
    {...protectedRuleset,conditions:{ref_name:{include:['refs/heads/01'],exclude:[]}}},
    {...protectedRuleset,conditions:{ref_name:{include:['~DEFAULT_BRANCH'],exclude:['refs/heads/main']}}},
    {...protectedRuleset,enforcement:'disabled'},
    {...protectedRuleset,bypass_actors:[{actor_id:1}]},
    {...protectedRuleset,current_user_can_bypass:'always'},
    {...protectedRuleset,rules:protectedRuleset.rules.filter(x=>x.type!=='deletion')},
    {...protectedRuleset,rules:protectedRuleset.rules.filter(x=>x.type!=='non_fast_forward')},
    {...protectedRuleset,rules:protectedRuleset.rules.map(x=>x.type==='required_status_checks'
      ? {...x,parameters:{...x.parameters,required_status_checks:[]}} : x)},
    {...protectedRuleset,rules:protectedRuleset.rules.map(x=>x.type==='pull_request'
      ? {...x,parameters:{...x.parameters,require_last_push_approval:false}} : x)},
  ];
  for(const candidate of partials)
    assert.ok(checkMainRulesetProtection(branch,candidate).length>0);
});

test('ruleset-only repository protection can be independently audited if legacy API is denied',async()=>{
  const fetcher=async (url,opts)=>{
    assert.equal(opts.method,'GET');
    if(url.endsWith('/branches/main')) return {ok:true,json:async()=>branch};
    if(url.endsWith('/branches/main/protection')) return {ok:false,status:403};
    if(url.includes('/rulesets?')) return {ok:true,json:async()=>[{
      id:26350113,target:'branch',enforcement:'active',
    }]};
    if(url.endsWith('/rulesets/26350113'))
      return {ok:true,json:async()=>protectedRuleset};
    if(url.includes('/pulls/110/reviews')) return {ok:true,json:async()=>[review]};
    if(url.includes('/check-runs')) return {ok:true,json:async()=>({
      total_count:check_runs.length,check_runs,
    })};
    return {ok:true,json:async()=>[pr]};
  };
  assert.deepEqual(await checkLiveGitHubRelease({token:'test-readonly',fetcher}),{
    protected:true,latestMainSha:sha,pr:110,checks:REQUIRED_PR_CHECKS.length,
  });
  const missingChecks={...protectedRuleset,rules:protectedRuleset.rules.map(x=>x.type==='required_status_checks'
    ? {...x,parameters:{...x.parameters,required_status_checks:[]}}:x)};
  const denied=async (url,opts)=>{
    if(url.endsWith('/rulesets/26350113'))return {ok:true,json:async()=>missingChecks};
    return fetcher(url,opts);
  };
  await assert.rejects(
    ()=>checkLiveGitHubRelease({token:'test-readonly',fetcher:denied}),
    /missing required check/,
  );
});
