/**
 * Generate crawlable route-specific HTML heads for known, static React routes.
 * React still renders the same UI; only the initial HTML metadata changes.
 * Dynamic CMS pages require a separate, authorized server-rendering integration.
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lifePages } from '../src/pages/life/lifePageData.js';

// Preserve the current canonical default until the school confirms its preferred
// production domain. Deployments may override it with an approved HTTPS origin.
export const ORIGIN = process.env.BCG_CANONICAL_ORIGIN || 'https://bcglk.devoraid.com';
const canonical = new URL(ORIGIN);
if (canonical.protocol !== 'https:' || canonical.origin !== ORIGIN ||
    canonical.username || canonical.password)
  throw Error('BCG_CANONICAL_ORIGIN must be an exact HTTPS origin');
const organization = 'Bandaranayake College, Gampaha';
export const seoRoutes = Object.freeze([
  { path: '/about-us', title: 'About Bandaranayake College', description: lifePages['about-us'].description },
  { path: '/events', title: 'College Events', description: 'Discover upcoming events, celebrations and activities at Bandaranayake College, Gampaha.' },
  { path: '/past-papers', title: 'Past Papers', description: 'Browse verified school examination past papers and academic study resources at Bandaranayake College, Gampaha.' },
  ...Object.entries(lifePages).map(([slug, entry]) => ({
    path: '/life/' + slug,
    title: entry.title + ' | Bandaranayake College',
    description: entry.description,
    canonicalPath: slug === 'about-us' ? '/about-us' : undefined,
    excludeSitemap: slug === 'about-us',
  })),
]);
const escaped = value => String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;')
  .replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function renderStaticSeoHtml(template, route) {
  const url = ORIGIN + (route.canonicalPath || route.path);
  const title = route.title.includes('Bandaranayake College') ? route.title : route.title + ' | ' + organization;
  const edits = [
    [/<title>[^<]*<\/title>/, '<title>' + escaped(title) + '</title>'],
    [/<meta name="description" content="[^"]*"\s*\/>/, '<meta name="description" content="' + escaped(route.description) + '" />'],
    [/<link rel="canonical" href="[^"]*"\s*\/>/, '<link rel="canonical" href="' + escaped(url) + '" />'],
    [/<meta property="og:title" content="[^"]*"\s*\/>/, '<meta property="og:title" content="' + escaped(title) + '" />'],
    [/<meta property="og:description" content="[^"]*"\s*\/>/, '<meta property="og:description" content="' + escaped(route.description) + '" />'],
    [/<meta property="og:url" content="[^"]*"\s*\/>/, '<meta property="og:url" content="' + escaped(url) + '" />'],
  ];
  let result = template;
  for (const [pattern, replacement] of edits) {
    if (!pattern.test(result)) throw Error('SEO template changed: missing ' + pattern);
    result = result.replace(pattern, () => replacement);
  }
  return result;
}
export function staticSitemap() {
  const locations = ['/', ...seoRoutes.filter(x => !x.excludeSitemap).map(x => x.path)];
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    locations.map(path => '  <url><loc>' + escaped(ORIGIN + path) + '</loc></url>').join('\n') +
    '\n</urlset>\n';
}
/** Keep robots.txt sitemap authority aligned with the approved build origin.
 * This changes only generated metadata, never the public React UI.
 */
export function generatedRobotsTxt(source = readFileSync(new URL('../public/robots.txt', import.meta.url), 'utf8')) {
  const directives = source.match(/^Sitemap:[ \t]*[^\r\n]+$/gmi) || [];
  if (directives.length !== 1) throw Error('robots.txt must have exactly one Sitemap directive');
  return source.replace(/^Sitemap:[ \t]*[^\r\n]+$/mi, 'Sitemap: ' + ORIGIN + '/sitemap.xml');
}


/** Cloudflare free Web Analytics beacon; no backend Firestore visitor writes.
 * Inject into generated HTML only, leaving React's source and layout intact.
 * No snippet is emitted until the owner configures the Cloudflare site token.
 */
export function injectCloudflareBeacon(html, token = process.env.CLOUDFLARE_WEB_ANALYTICS_SITE_TOKEN ||
  process.env.CLOUDFLARE_WEB_ANALYTICS_SITE_TAG || '') {
  if (!token) return html;
  if (!/^[a-f0-9]{32}$/i.test(token))
    throw Error('Cloudflare Web Analytics site token must be a 32-character hexadecimal value');
  const marker = '</body>';
  if (!html.includes(marker) || html.includes('static.cloudflareinsights.com/beacon.min.js'))
    throw Error('Cannot safely inject Cloudflare beacon into built HTML');
  const script = '  <script defer src="https://static.cloudflareinsights.com/beacon.min.js" ' +
    'data-cf-beacon=\'{"token":"' + token + '","spa":true}\'></script>\n';
  return html.replace(marker, script + marker);
}

export function generateSeoFiles(directory = 'dist') {
  const output = resolve(directory);
  const template = readFileSync(join(output, 'index.html'), 'utf8');
  // Only update homepage metadata when an explicitly approved origin differs.
  // The React root, markup and public visual design remain untouched.
  let home = template;
  if (ORIGIN !== 'https://bcglk.devoraid.com') {
    home = home
      .replace(/(<link rel="canonical" href=")[^"]*(")/, (_, a, b) => a + ORIGIN + '/' + b)
      .replace(/(<meta property="og:url" content=")[^"]*(")/, (_, a, b) => a + ORIGIN + '/' + b);
    if (home === template) throw Error('Homepage canonical metadata was not found');
  }
  writeFileSync(join(output, 'index.html'), injectCloudflareBeacon(home), 'utf8');
  for (const route of seoRoutes) {
    const location = join(output, route.path.slice(1), 'index.html');
    mkdirSync(dirname(location), { recursive: true });
    writeFileSync(location, injectCloudflareBeacon(renderStaticSeoHtml(template, route)), 'utf8');
  }
  writeFileSync(join(output, 'sitemap.xml'), staticSitemap(), 'utf8');
  writeFileSync(join(output, 'robots.txt'), generatedRobotsTxt(), 'utf8');
  console.log('Generated ' + seoRoutes.length + ' SEO route HTML files and sitemap.xml');
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  generateSeoFiles();
}
