import { createContentRepository } from './contentRepository';
const fields={ title:{required:true,max:180},exam:{required:true,max:40},subject:{required:true,max:120},year:{required:true,max:4},language:{required:true,max:20,allowed:['Sinhala','Tamil','English']},term:{max:80},url:{required:true,type:'url',max:2048},published:{type:'boolean'} };
const papers=createContentRepository('pastPapers',fields,{defaults:{term:'',published:false,rank:999}});
export const listPublishedPastPapers=papers.listPublished;
// Past Papers has an existing failure display but no surrounding try/catch in
// its UI subscription effect. Forward early Firebase initialization errors
// asynchronously, without changing Jaliya-authored UI or shared repository code.
export const subscribePublishedPastPapers=(callback,onError)=>{
  try { return papers.subscribePublished(callback,onError); }
  catch(error){
    if(typeof onError!=='function') throw error;
    queueMicrotask(()=>onError(error));
    return ()=>{};
  }
};
export const subscribeAdminPastPapers=papers.subscribeAdmin;
export const createPastPaper=papers.create;
export const updatePastPaper=papers.update;
export const reorderPastPapers=papers.reorderBatch;
export const deletePastPaper=papers.remove;
