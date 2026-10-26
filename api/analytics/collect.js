/** Public, low-data telemetry endpoint. Never expose service credentials. */
export const config = { api: { bodyParser: { sizeLimit: '1kb' } } };
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Allow', 'POST');
  try {
    const { recordView } = await import('../_lib/post-analytics.mjs');
    const result = await recordView(req);
    return res.status(200).json(result);
  } catch (error) {
    const code = [400,403,404,405,415,503].includes(error?.status) ? error.status : 502;
    // Never reflect upstream Google errors, IPs or credentials in responses.
    return res.status(code).json({ error: code === 503
      ? 'View tracking is not enabled.' : code === 502
        ? 'View tracking is temporarily unavailable.' : 'View was not recorded.' });
  }
}
