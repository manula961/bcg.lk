/** Protected CMS editorial workflow API. Never caches admin data. */
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store, max-age=0');
  res.setHeader('Pragma','no-cache');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Allow','GET, POST');
  try {
    const {handleWorkflow} = await import('../_lib/cms-workflow.mjs');
    const response = await handleWorkflow(req);
    return res.status(200).json(response);
  } catch(error) {
    const {responseError} = await import('../_lib/cms-workflow.mjs');
    const result = responseError(error);
    console.error('[CMS workflow] Request rejected:',result.status);
    return res.status(result.status).json({error:result.message});
  }
}
