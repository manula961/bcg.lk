/**
 * Safe external deployment smoke tests: only HEAD and GET, no credentials or writes.
 * Run: BCG_PUBLIC_ORIGIN=https://<approved domain> node scripts/check-public-deployment.mjs
 */
import { assertApprovedSmokeOrigin } from './public-smoke-origin.mjs';
import { verifyReleaseManifest } from './release-manifest.mjs';
import { assertServedSeoHtml, assertServedRobots, assertServedSitemap, summarizeCspRisk } from './live-seo-verification.mjs';
const origin = assertApprovedSmokeOrigin(process.env.BCG_PUBLIC_ORIGIN, {
  approvedOrigin: process.env.BCG_APPROVED_PUBLIC_ORIGIN,
  required: process.env.BCG_REQUIRE_APPROVED_PUBLIC_ORIGIN === '1',
});
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
await check('/api/admin/workflow', [401]);
await check('/api/cron/publish', [401]);
// Only a manually approved exact SHA certifies deployment provenance.
if (process.env.BCG_EXPECTED_DEPLOYED_SHA) {
  const manifestResponse = await fetch(new URL('/release.json', origin), {
    method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(12000),
    headers: { Accept: 'application/json' },
  });
  if (manifestResponse.status !== 200 ||
      !/^application\/json(?:\s*;|$)/i.test(manifestResponse.headers.get('content-type') || '')) {
    throw new Error('Deployed release manifest unavailable or not JSON. Did the approved build deploy?');
  }
  const raw = await manifestResponse.text();
  if (raw.length > 2048) throw new Error('Deployed release manifest is unexpectedly large.');
  let manifest;
  try { manifest = JSON.parse(raw); }
  catch { throw new Error('Deployed release manifest is invalid JSON.'); }
  const proof = verifyReleaseManifest(manifest, {
    expectedSha: process.env.BCG_EXPECTED_DEPLOYED_SHA,
    expectedOrigin: origin.origin,
  });
  console.log('PASS immutable hosted release commit', proof.commitSha, 'and approved canonical origin');
  // Strict read-only SEO and CSP checks run only when the operator provides an
  // independently approved production commit. Never use these to probe unknown hosts.
  async function readPublicFile(path, contentType) {
    const response = await fetch(new URL(path, origin), {
      method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(12000),
    });
    const mime = response.headers.get('content-type') || '';
    if (response.status !== 200 || !mime.toLowerCase().startsWith(contentType))
      throw new Error(path + ' must serve HTTP 200 ' + contentType + '; received ' + response.status);
    const body = await response.text();
    if (body.length > 2_000_000) throw new Error(path + ' exceeds verification limit');
    return {body, headers:response.headers};
  }
  for (const path of ['/', '/events', '/past-papers']) {
    const page = await readPublicFile(path, 'text/html');
    assertServedSeoHtml(page.body, {origin:origin.origin, path});
    console.log('PASS approved canonical, description and OpenGraph metadata', path);
    if (path === '/') {
      const risks = summarizeCspRisk(page.headers.get('content-security-policy'));
      for (const issue of risks) console.warn('CSP HARDENING OPEN:', issue);
      if (risks.length && process.env.BCG_REQUIRE_TIGHT_CSP === '1')
        throw new Error('Release CSP hardening gate failed; review actual third-party browser traffic first.');
    }
  }
  const robots = await readPublicFile('/robots.txt', 'text/plain');
  assertServedRobots(robots.body, origin.origin);
  const sitemap = await readPublicFile('/sitemap.xml', 'application/xml');
  const locations = assertServedSitemap(sitemap.body, origin.origin);
  console.log('PASS approved public sitemap and robots metadata (' + locations + ' routes)');
} else {
  console.log('NOT VERIFIED: deployed commit identity was not checked. Set BCG_EXPECTED_DEPLOYED_SHA.');
}
console.log('Read-only deployment checks completed; these do not verify authenticated OAuth.');
