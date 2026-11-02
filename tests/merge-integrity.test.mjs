import test from 'node:test';
import assert from 'node:assert/strict';
import {auditMergeProof, REQUIRED_PR_CHECKS} from '../scripts/merge-integrity.mjs';
const TARGET = 'a'.repeat(40);
const HEAD = 'b'.repeat(40);
const approved = {
  number:107, merged_at:'2026-11-02T01:00:00Z', merge_commit_sha:TARGET,
  base:{ref:'main'}, head:{sha:HEAD}, user:{login:'author'},
};
const review = {
  id:1, submitted_at:'2026-11-02T00:00:00Z', state:'APPROVED',
  commit_id:HEAD, user:{login:'reviewer', type:'User'},
};
const checks = REQUIRED_PR_CHECKS.map((name, id) => ({
  name,id:id+1,head_sha:HEAD,status:'completed',conclusion:'success',
  completed_at:'2026-11-02T00:01:00Z',
}));
const good = {targetSha:TARGET,pullRequests:[approved],reviews:[review],checkRuns:checks};

test('requires a traced merged PR and all latest-head checks',()=>{
  assert.equal(auditMergeProof(good).ok,true);
  assert.equal(auditMergeProof({...good,pullRequests:[]}).ok,false);
  assert.equal(auditMergeProof({...good,targetSha:'invalid'}).ok,false);
  assert.equal(auditMergeProof({...good,pullRequests:[approved,approved]}).ok,false);
});

test('self, bot, stale or dismissed reviews never authorize a merge',()=>{
  for (const user of ['author','AUTHOR']) {
    assert.equal(auditMergeProof({...good,reviews:[{...review,user:{login:user,type:'User'}}]}).ok,false);
  }
  assert.equal(auditMergeProof({...good,reviews:[{...review,user:{login:'bot',type:'Bot'}}]}).ok,false);
  assert.equal(auditMergeProof({...good,reviews:[{...review,commit_id:TARGET}]}).ok,false);
  const dismissed={...review,id:2,submitted_at:'2026-11-02T00:02:00Z',state:'DISMISSED'};
  assert.equal(auditMergeProof({...good,reviews:[review,dismissed]}).ok,false);
  const changes={...dismissed,state:'CHANGES_REQUESTED'};
  assert.equal(auditMergeProof({...good,reviews:[review,changes]}).ok,false);
});

test('a failed, skipped, missing, pending or wrong-SHA check blocks provenance',()=>{
  const bad = [
    checks.slice(1),
    checks.map((x,i)=>i===0?{...x,conclusion:'failure'}:x),
    checks.map((x,i)=>i===0?{...x,conclusion:'skipped'}:x),
    checks.map((x,i)=>i===0?{...x,status:'queued',conclusion:null}:x),
    checks.map((x,i)=>i===0?{...x,head_sha:TARGET}:x),
  ];
  for (const checkRuns of bad) assert.equal(auditMergeProof({...good,checkRuns}).ok,false);
});

test('newer failing check replaces an older successful check',()=>{
  const failing={...checks[0],id:999,conclusion:'failure',completed_at:'2026-11-02T00:04:00Z'};
  assert.equal(auditMergeProof({...good,checkRuns:[...checks,failing]}).ok,false);
});
