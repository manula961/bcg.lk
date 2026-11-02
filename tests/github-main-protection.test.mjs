import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {checkMainProtection,checkLiveGitHubRelease} from '../scripts/check-github-main-protection.mjs';
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
