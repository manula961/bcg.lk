import test from 'node:test';
import assert from 'node:assert/strict';
import { assertDriveMediaUnreferenced } from '../api/_lib/drive-media-references.mjs';

const fileId='AbCdEfGhIjKlMnOpQrSt';
const req={headers:{authorization:'Bearer '+'X'.repeat(40)}};
const project='demo-bcg-media-safety';
const ok = data => new Response(JSON.stringify(data),{
  status:200,headers:{'Content-Type':'application/json'}
});

test('refuse explicit Drive deletion if any draft or published CMS record still references its ID',async()=>{
  const collections=[];
  const fetcher=async url=>{
    const parsed=new URL(url);
    const collection=parsed.pathname.split('/').at(-1);
    collections.push(collection);
    return ok({documents:[{fields:{
      title:{stringValue:'Record'},
      imageUrl:{stringValue:collection==='sports'?
        'https://drive.google.com/thumbnail?id='+fileId+'&sz=w1200':'https://example.org/image.png'},
      published:{booleanValue:false},
    }}]});
  };
  await assert.rejects(assertDriveMediaUnreferenced(fileId,req,{fetcher,project}),{status:409});
  assert.ok(collections.includes('sports'));
  assert.equal(collections.includes('leadership'),false,'Stop before later collections after a match');
});

test('scans all seven collections, all pages and records before permitting deletion',async()=>{
  const paths=[];
  const fetcher=async url=>{
    const parsed=new URL(url);
    const collection=parsed.pathname.split('/').at(-1);
    const token=parsed.searchParams.get('pageToken');
    paths.push([collection,token]);
    if(collection==='news' && !token)
      return ok({documents:[{fields:{title:{stringValue:'News'}}}],nextPageToken:'safe-token'});
    return ok({documents:[]});
  };
  const result=await assertDriveMediaUnreferenced(fileId,req,{fetcher,project});
  assert.deepEqual(result,{unreferenced:true,recordsChecked:1});
  assert.equal(paths.length,8);
  assert.deepEqual(paths.at(1),['news','safe-token']);
  assert.equal(paths.at(-1)[0],'pastPapers');
});

test('any backend error, malformed token, anonymous request or endless pagination prevents Drive deletion',async()=>{
  await assert.rejects(assertDriveMediaUnreferenced(fileId,req,{
    project,fetcher:async()=>new Response('Forbidden',{status:403})
  }),{status:503});
  await assert.rejects(assertDriveMediaUnreferenced(fileId,{headers:{}},{
    project,fetcher:async()=>{throw Error('Should not fetch');}
  }),{status:401});
  await assert.rejects(assertDriveMediaUnreferenced('../unsafe',req,{
    project,fetcher:async()=>{throw Error('Should not fetch');}
  }),{status:400});
  await assert.rejects(assertDriveMediaUnreferenced(fileId,req,{
    project,fetcher:async()=>ok({nextPageToken:'repeated'})
  }),{status:503});
});
