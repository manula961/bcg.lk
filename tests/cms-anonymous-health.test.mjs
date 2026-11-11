import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyEditor, handleWorkflow } from '../api/_lib/cms-workflow.mjs';

test('anonymous CMS requests fail with 401 before any preview Firebase or origin configuration', async () => {
  const previous = process.env.USER_ADMIN_ORIGIN;
  const project = process.env.FIREBASE_PROJECT_ID;
  const key = process.env.FIREBASE_WEB_API_KEY;
  try {
    delete process.env.USER_ADMIN_ORIGIN;
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.FIREBASE_WEB_API_KEY;
    for (const method of ['GET','POST']) {
      const req={method,headers:{},query:{action:'status'}};
      await assert.rejects(verifyEditor(req,method),{status:401});
      await assert.rejects(handleWorkflow(req),{status:401});
    }
    await assert.rejects(verifyEditor({headers:{authorization:'Bearer invalid'},method:'POST'},'POST'),{status:401});
    // A present, well-formed but unverified token must still respect POST origin checks.
    await assert.rejects(verifyEditor({headers:{authorization:'Bearer '+ 'a'.repeat(40)},method:'POST'},'POST'),{status:503});
  } finally {
    if(previous===undefined)delete process.env.USER_ADMIN_ORIGIN;else process.env.USER_ADMIN_ORIGIN=previous;
    if(project===undefined)delete process.env.FIREBASE_PROJECT_ID;else process.env.FIREBASE_PROJECT_ID=project;
    if(key===undefined)delete process.env.FIREBASE_WEB_API_KEY;else process.env.FIREBASE_WEB_API_KEY=key;
  }
});
