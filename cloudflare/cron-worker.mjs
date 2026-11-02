/**
 * Cloudflare Cron Trigger calls the reviewed scheduler API, not a public
 * Firebase client. Set CMS_CRON_SECRET with `wrangler secret put`, and never
 * enable production cron before independent staging approval.
 */
export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil((async () => {
      if (!/^[A-Za-z0-9_-]{32,256}$/.test(env.CMS_CRON_SECRET || ''))
        throw new Error('CMS_CRON_SECRET not configured');
      const endpoint = new URL(env.CMS_CRON_ENDPOINT || '');
      if (endpoint.protocol !== 'https:' || endpoint.pathname !== '/api/cron/publish' ||
          endpoint.search || endpoint.hash || endpoint.username || endpoint.password)
        throw new Error('Invalid CMS_CRON_ENDPOINT');
      const response = await fetch(endpoint, {
        headers: {Authorization:'Bearer ' + env.CMS_CRON_SECRET},
        redirect:'error',
        signal:AbortSignal.timeout(35000),
      });
      if (!response.ok) throw new Error('CMS cron endpoint failed with HTTP ' + response.status);
      const result = await response.json();
      for (const key of ['published','stale','skipped','scanned','failed','deferred']) {
        if (!Number.isSafeInteger(result[key]) || result[key] < 0)
          throw new Error('Invalid CMS scheduler response');
      }
      if (result.failed || result.deferred || result.truncated)
        throw new Error('CMS scheduler reported deferred or failed jobs');
      console.log('CMS schedule scan completed', {scanned:result.scanned,published:result.published});
    })());
  },
};
