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
  if (response.headers.get('x-content-type-options') !== 'nosniff')
    throw Error(path + ' is missing X-Content-Type-Options: nosniff');
  if (response.headers.get('x-frame-options') !== 'DENY')
    throw Error(path + ' is missing X-Frame-Options: DENY');
  const hsts = response.headers.get('strict-transport-security') || '';
  if (!/(?:^|;)\s*max-age=\d+/.test(hsts))
    throw Error(path + ' is missing HTTPS Strict-Transport-Security max-age');
  if (path === '/admin' && !response.headers.get('x-robots-tag')?.includes('noindex'))
    throw Error('/admin must not be indexed');
  console.log('PASS', path, response.status);
}
await check('/', [200]);
await check('/events', [200]);
await check('/past-papers', [200]);
await check('/admin', [200]);
await check('/robots.txt', [200]);
for (const logoPath of ['/email-assets/school-logo.png', '/email-assets/computer-society-logo.png']) {
  const asset = await fetch(new URL(logoPath, origin), {
    method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(12000),
  });
  if (asset.status !== 200 || !asset.headers.get('content-type')?.toLowerCase().startsWith('image/png'))
    throw Error(logoPath + ' must respond 200 with image/png, received ' +
      asset.status + ' ' + (asset.headers.get('content-type') || '(no Content-Type)'));
  const bytes = new Uint8Array(await asset.arrayBuffer());
  const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (bytes.length < 32 || !pngSignature.every((value, index) => bytes[index] === value))
    throw Error(logoPath + ' is not a valid PNG response');
  console.log('PASS', logoPath, '200 image/png');
}

// A 200 HTML fallback is not a working audio asset. Verify MIME without downloading
// the complete school anthem, and without modifying the existing media component.
const anthem = await fetch(new URL('/audio/school-anthem.mp3', origin), {
  method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(12000),
});
const anthemMime = (anthem.headers.get('content-type') || '').toLowerCase();
if (anthem.status !== 200 || !/^audio\/(?:mpeg|mp3)(?:;|$)/.test(anthemMime))
  throw Error('School anthem must return HTTP 200 audio/mpeg, received ' +
    anthem.status + ' ' + (anthemMime || '(no Content-Type)'));
console.log('PASS /audio/school-anthem.mp3 200 audio/mpeg');
await check('/sitemap.xml', [200]);
await check('/unknown-audit-route-do-not-create', [404]);
await check('/api/drive/status', [401]);
await check('/api/admin/users', [401]);
console.log('Read-only deployment checks completed; these do not verify authenticated OAuth.');
