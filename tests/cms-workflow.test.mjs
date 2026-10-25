import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateTarget,validateEdit,validateSchedule,authorizeCron,
  responseError,workflowAction,handleWorkflow,
} from '../api/_lib/cms-workflow.mjs';

test('workflow IDs are bounded; arbitrary Firestore paths cannot be targeted',()=>{
  assert.deepEqual(validateTarget('news','A_b-123'),{kind:'news',id:'A_b-123'});
  for(const [kind,id] of [['admins','123'],['cmsAudit','test'],['news','../admins'],['news','x/y'],['news',''],['pages','x'.repeat(151)]])
    assert.throws(()=>validateTarget(kind,id),{status:400});
});
test('workflow edits cannot change roles, publication status, or nested fields',()=>{
  assert.deepEqual(validateEdit('news',{title:'  Headline '}),{title:{stringValue:'Headline'}});
  for(const patch of [{published:true},{role:'admin'},{status:'approved'},{'__proto__':'value',createdBy:'owner'},{url:'https://example.org'}])
    assert.throws(()=>validateEdit('news',patch),{status:400});
  assert.throws(()=>validateEdit('events',{imageUrl:'javascript:alert(1)'}),{status:400});
  assert.throws(()=>validateEdit('events',{eventDate:'2026-02-30'}),{status:400});
  assert.throws(()=>validateEdit('news',{title:'x'.repeat(181)}),{status:400});
  assert.throws(()=>validateEdit('pastPapers',{year:'202X'}),{status:400});
  assert.throws(()=>validateEdit('news',{category:'Other'}),{status:400});
});
test('scheduled publication accepts only bounded UTC timestamps',()=>{
  const t = Date.parse('2026-10-25T00:00:00Z');
  assert.equal(validateSchedule('2026-10-25T00:05:00Z',t),'2026-10-25T00:05:00.000Z');
  for(const bad of ['2026-10-25T00:00:00Z','2026-10-25T00:01:00Z','2026-10-25T00:05:00+05:30','2026-12-99T09:00:00Z','2027-02-01T00:00:00Z'])
    assert.throws(()=>validateSchedule(bad,t),{status:400});
});
test('scheduler uses an authenticated, constant-time comparison and fails closed',()=>{
  const secret='A'.repeat(48);
  assert.doesNotThrow(()=>authorizeCron('Bearer '+secret,secret));
  for(const header of ['','Bearer '+'B'.repeat(48),'Basic '+secret,'Bearer short'])
    assert.throws(()=>authorizeCron(header,secret),{status:401});
  assert.throws(()=>authorizeCron('Bearer '+secret,''),{status:401});
});
test('workflow rejects malformed payload before attempting database access',async()=>{
  await assert.rejects(workflowAction({kind:'admins',id:'root',action:'publish'},{uid:'a',role:'super_admin'}),{status:400});
  await assert.rejects(workflowAction({kind:'news',id:'a',action:'unknown'},{uid:'a',role:'super_admin'}),{status:400});
  await assert.rejects(handleWorkflow({method:'DELETE'}),{status:405});
});
test('error responses redact infrastructure errors and retain safe validation errors',()=>{
  assert.deepEqual(responseError(new Error('secret=do-not-expose')),{status:502,message:'Workflow service is unavailable.'});
  assert.deepEqual(responseError(Object.assign(new Error('Invalid request'),{status:400})),{status:400,message:'Invalid request'});
});

test('privileged workflow rejects empty required content fields',()=>{
  const required={news:['title','excerpt'],events:['title','description','eventDate','location'],pages:['title','body'],societies:['title','description'],sports:['title','description'],leadership:['title','role'],pastPapers:['title','exam','subject','year','language','url']};
  for(const [kind,keys] of Object.entries(required)) for(const key of keys)
    assert.throws(()=>validateEdit(kind,{[key]:'  '}),{status:400},`${kind}.${key}`);
  assert.deepEqual(validateEdit('news',{body:''}),{body:{stringValue:''}});
});
