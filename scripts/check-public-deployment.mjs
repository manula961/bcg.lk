/**
 * Safe external deployment smoke tests: only HEAD and GET, no credentials or writes.
 * Run: BCG_PUBLIC_ORIGIN=https://<approved domain> node scripts/check-public-deployment.mjs
 */
const originText = process.env.BCG_PUBLIC_ORIGIN;
if (!originText) throw Error('BCG_PUBLIC_ORIGIN is required.');
const origin = new URL(originText);
if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/') {
  throw Error('Use the approved HTTPS site origin, without credentials or path.');
}
async function check(path, allowed) {
  const response = await fetch(new URL(path, origin), {
    method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(12000),
  });
  if (!allowed.includes(response.status)) throw Error(path + ' returned ' + response.status +
    ', expected ' + allowed.join('/'));
  console.log('PASS', path, response.status);
}
await check('/', [200]);
await check('/events', [200]);
await check('/robots.txt', [200]);
await check('/sitemap.xml', [200]);
await check('/unknown-audit-route-do-not-create', [404]);
await check('/api/drive/status', [401]);
console.log('Read-only deployment checks completed; these do not verify authenticated OAuth.');
