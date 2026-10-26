/** Verified administrators receive aggregated content views only. */
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Allow', 'GET');
  try {
    const { readViews } = await import('../_lib/post-analytics.mjs');
    return res.status(200).json(await readViews(req));
  } catch (error) {
    const code = [400,401,403,405,503].includes(error?.status) ? error.status : 502;
    return res.status(code).json({ error: code === 401 ? 'Sign in to the console.'
      : code === 403 ? 'Administrator permissions required.'
        : code === 400 ? 'Choose a valid reporting range.'
          : 'Post analytics is temporarily unavailable.' });
  }
}
