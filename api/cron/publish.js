/** Server-to-server publisher. Must be called only with CMS_CRON_SECRET. */
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store, max-age=0');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Allow','GET');
  try {
    const {authorizeCron,processDueJobs,failure} = await import('../_lib/cms-workflow.mjs');
    if (req.method !== 'GET') throw failure(405,'Method not allowed.');
    authorizeCron(req.headers.authorization);
    return res.status(200).json(await processDueJobs());
  } catch(error) {
    const {responseError} = await import('../_lib/cms-workflow.mjs');
    const result = responseError(error);
    console.error('[CMS scheduler] Request rejected:',result.status);
    return res.status(result.status).json({error:result.message});
  }
}
