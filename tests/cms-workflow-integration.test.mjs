import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import {
  workflowAction, workflowRead, processDueJobs, handleWorkflow,
} from '../api/_lib/cms-workflow.mjs';

const str = value => ({stringValue:value});
const data = (fields,updateTime) => ({fields,updateTime});
const project = 'demo-bcg-workflow';
const pathOf = name => name.split('/documents/')[1];
const clock = () => new Date(Date.now()+5*60*1000).toISOString();

function setup() {
  const before = globalThis.fetch;
  const env = {};
  for(const name of ['FIREBASE_PROJECT_ID','FIREBASE_WEB_API_KEY','FIREBASE_SERVICE_ACCOUNT_JSON','USER_ADMIN_ORIGIN']){
    env[name] = process.env[name];
  }
  const {privateKey} = generateKeyPairSync('rsa',{modulusLength:2048});
  process.env.FIREBASE_PROJECT_ID = project;
  process.env.FIREBASE_WEB_API_KEY = 'test-demo';
  process.env.USER_ADMIN_ORIGIN = 'https://staging.example.test';
  process.env.FIREBASE_SERVICE_ACCOUNT_JSON = JSON.stringify({
    type:'service_account',project_id:project,
    client_email:'workflow@'+project+'.iam.gserviceaccount.com',
    private_key:privateKey.export({type:'pkcs8',format:'pem'}),
  });
  const docs=new Map();
  const commits=[];
  let version=0;
  const read = path => docs.get(path) || null;
  const put = (path,fields) => {
    docs.set(path,data(structuredClone(fields),
      new Date(Date.UTC(2026,9,25,1,0,version++)).toISOString()));
  };
  const seed = (path,fields) => put(path,fields);
  const answer = (payload,status=200) => new Response(JSON.stringify(payload),{
    status,headers:{'content-type':'application/json'},
  });
  globalThis.fetch = async (url,options={}) => {
    const parsed=new URL(String(url));
    if(parsed.hostname==='oauth2.googleapis.com')
      return answer({access_token:'demo-access-token',expires_in:3600});
    if(parsed.hostname==='identitytoolkit.googleapis.com')
      return answer({users:[{localId:'admin-owner',disabled:false}]});
    if(parsed.hostname!=='firestore.googleapis.com') throw Error('Unexpected upstream: '+parsed.hostname);
    const verb=options.method || 'GET';
    if(parsed.pathname.endsWith('/documents:runQuery')) {
      const query=JSON.parse(options.body).structuredQuery;
      assert.equal(query.limit,251);
      assert.equal(query.where.compositeFilter.op,'AND');
      assert.equal(query.where.compositeFilter.filters[1].fieldFilter.field.fieldPath,'runAt');
      assert.equal(query.orderBy[0].field.fieldPath,'runAt');
      const now=query.where.compositeFilter.filters[1].fieldFilter.value.timestampValue;
      const jobs=[...docs.entries()].filter(([key,doc])=>
        key.startsWith('cmsJobs/') && doc.fields.status?.stringValue==='queued' &&
        Date.parse(doc.fields.runAt?.timestampValue || '')<=Date.parse(now))
        .sort((a,b)=>Date.parse(a[1].fields.runAt.timestampValue)-Date.parse(b[1].fields.runAt.timestampValue))
        .slice(0,query.limit);
      return answer(jobs.map(([path,doc])=>({document:{
        name:'projects/'+project+'/databases/(default)/documents/'+path,...doc
      }})));
    }
    if(parsed.pathname.endsWith('/documents:commit')) {
      const writes=JSON.parse(options.body).writes;
      // Verify ALL preconditions before any mutation, like Firestore :commit.
      for(const write of writes){
        const key=pathOf(write.update?.name || write.delete || write.verify);
        const previous=read(key);
        const guard=write.currentDocument;
        if(guard?.exists===false && previous) return answer({error:'exists'},412);
        if(guard?.exists===true && !previous) return answer({error:'missing'},412);
        if(guard?.updateTime && previous?.updateTime!==guard.updateTime)
          return answer({error:'stale'},412);
        if(guard?.updateTime && !previous) return answer({error:'missing'},412);
      }
      for(const write of writes){
        const key=pathOf(write.update?.name || write.delete || write.verify);
        if(write.update)put(key,write.update.fields);
        if(write.delete)docs.delete(key);
      }
      commits.push(writes);
      return answer({writeResults:[]});
    }
    if(verb==='GET'){
      const key=decodeURIComponent(pathOf(parsed.pathname));
      if(key==='admins/admin-owner') return answer(data({role:str('super_admin')},clock()));
      const doc=read(key);
      if(!doc) return answer({error:'not found'},404);
      return answer({name:'projects/'+project+'/databases/(default)/documents/'+key,...doc});
    }
    throw Error('Unexpected request '+verb+' '+parsed.pathname);
  };
  return {docs,commits,seed,read,restore(){
    globalThis.fetch=before;
    for(const [key,value] of Object.entries(env)){
      if(value===undefined)delete process.env[key];else process.env[key]=value;
    }
  }};
}
const editor={uid:'editor-one',role:'editor'};
const publisher={uid:'publisher-two',role:'publisher'};
const admin={uid:'admin-three',role:'admin'};

test('draft review, two-person approval, publication, live edit proposal, trash, rollback and due scheduler are atomic',async()=>{
  const f=setup();
  try {
    const doc='news/feature-a';
    f.seed(doc,{
      title:str('Original headline'),excerpt:str('Summary'),
      category:str('News'),published:{booleanValue:false},
      createdAt:{timestampValue:'2026-10-25T00:00:00Z'},
    });
    await workflowAction({action:'submit',kind:'news',id:'feature-a'},editor);
    assert.equal(f.read('cmsWorkflow/news_feature-a').fields.status.stringValue,'submitted');
    await assert.rejects(workflowAction({action:'approve',kind:'news',id:'feature-a'},editor),{status:403});
    await workflowAction({action:'approve',kind:'news',id:'feature-a'},publisher);
    await workflowAction({action:'publish',kind:'news',id:'feature-a'},publisher);
    assert.equal(f.read(doc).fields.published.booleanValue,true);
    await assert.rejects(workflowAction({
      action:'edit',kind:'news',id:'feature-a',patch:{title:'Unsafe live edit'},
    },admin),{status:409});
    await workflowAction({action:'proposeEdit',kind:'news',id:'feature-a',patch:{title:'Reviewed headline'}},editor);
    assert.equal(f.read(doc).fields.title.stringValue,'Original headline','Proposal must not change live data');
    await assert.rejects(workflowAction({action:'approve',kind:'news',id:'feature-a'},editor),{status:403});
    await workflowAction({action:'approve',kind:'news',id:'feature-a'},admin);
    await workflowAction({action:'applyEdit',kind:'news',id:'feature-a'},publisher);
    assert.equal(f.read(doc).fields.title.stringValue,'Reviewed headline');
    assert.equal(f.read(doc).fields.published.booleanValue,true);
    await workflowAction({action:'archive',kind:'news',id:'feature-a'},admin);
    assert.equal(f.read(doc).fields.published.booleanValue,false);
    assert.ok(f.read('cmsTrash/news_feature-a'));
    await workflowAction({action:'restore',kind:'news',id:'feature-a'},admin);
    assert.equal(f.read('cmsTrash/news_feature-a'),null);
    assert.equal(f.read(doc).fields.published.booleanValue,false);
    const revisionIds=[...f.docs.keys()].filter(x=>x.startsWith('cmsHistory/news_feature-a/revisions/'));
    assert.ok(revisionIds.length>=3);
    await workflowAction({action:'rollback',kind:'news',id:'feature-a',
      revisionId:revisionIds.at(0).split('/').at(-1)},admin);
    assert.equal(f.read(doc).fields.published.booleanValue,false);
    // Re-approval after rollback is mandatory; scheduler publishes only due items.
    await workflowAction({action:'submit',kind:'news',id:'feature-a'},editor);
    await workflowAction({action:'approve',kind:'news',id:'feature-a'},publisher);
    const runAt=clock();
    await workflowAction({action:'schedule',kind:'news',id:'feature-a',runAt},publisher);
    const before=await processDueJobs(new Date(Date.parse(runAt)-60*1000).toISOString());
    assert.equal(before.published,0);
    const result=await processDueJobs(new Date(Date.parse(runAt)+60*1000).toISOString());
    assert.equal(result.published,1);
    assert.equal(result.failed,0);
    assert.equal(f.read(doc).fields.published.booleanValue,true);
    assert.equal(f.read('cmsWorkflow/news_feature-a').fields.status.stringValue,'published');
    const repeat=await processDueJobs(new Date(Date.parse(runAt)+120*1000).toISOString());
    assert.equal(repeat.published,0,'Completed jobs must be idempotent');
    assert.ok([...f.docs.keys()].some(x=>x.startsWith('cmsAudit/')));
    assert.ok(f.commits.some(writes=>writes.some(x=>Boolean(x.verify))), 'Restore must verify current content updateTime');
  } finally { f.restore(); }
});

test('privileged mutation rejects invalid patch without committing a record',async()=>{
  const f=setup();
  try {
    f.seed('news/feature-b',{
      title:str('Existing'),excerpt:str('Some summary'),published:{booleanValue:false}
    });
    await assert.rejects(workflowAction({
      action:'edit',kind:'news',id:'feature-b',patch:{excerpt:'  '},
    },editor),{status:400});
    assert.equal(f.commits.length,0);
  } finally {f.restore();}
});

test('admin workflow HTTP entrypoint fails closed on origin, JSON and anonymous calls',async()=>{
  const f=setup();
  try {
    await assert.rejects(handleWorkflow({
      method:'POST',headers:{origin:'https://wrong.example',authorization:'Bearer '+'A'.repeat(40),
        'content-type':'application/json'},
    }),{status:403});
    await assert.rejects(handleWorkflow({
      method:'GET',headers:{},
    }),{status:401});
    await assert.rejects(handleWorkflow({
      method:'POST',headers:{origin:'https://staging.example.test',authorization:'Bearer '+'A'.repeat(40),
        'content-type':'text/plain'},
    }),{status:415});
    const result=await handleWorkflow({
      method:'GET',headers:{authorization:'Bearer '+'A'.repeat(40)},
      query:{action:'status',kind:'news',id:'never-created'},
    });
    assert.equal(result.status,'unsubmitted');
  } finally {f.restore();}
});
