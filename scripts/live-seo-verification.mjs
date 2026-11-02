/**
 * Pure, read-only checks of served public SEO metadata. These checks never
 * mutate Firestore, hosting settings or the React UI.
 */
const routePath = path => path === '/' ? '/' : String(path).replace(/\/$/, '');

export function assertServedSeoHtml(html, {origin, path}) {
  const target = origin + routePath(path);
  if (typeof html !== 'string' || html.length > 2_000_000 ||
      !/<html\b/i.test(html) || !/<title>[^<]{3,}<\/title>/i.test(html))
    throw new Error(path + ' did not return a usable HTML document with a title');
  const canonical = [...html.matchAll(/<link\b[^>]*\brel=["']canonical["'][^>]*\bhref=["']([^"']+)["'][^>]*>/gi)]
    .map(match => match[1]);
  if (canonical.length !== 1 || canonical[0] !== target)
    throw new Error(path + ' must declare exactly one canonical URL on the approved host');
  const og = [...html.matchAll(/<meta\b[^>]*\bproperty=["']og:url["'][^>]*\bcontent=["']([^"']+)["'][^>]*>/gi)]
    .map(match => match[1]);
  if (og.length !== 1 || og[0] !== target)
    throw new Error(path + ' OpenGraph URL must match its approved canonical URL');
  if (!/<meta\b[^>]*\bname=["']description["'][^>]*\bcontent=["'][^"']{20,}["'][^>]*>/i.test(html))
    throw new Error(path + ' is missing a substantive meta description');
  if (/<meta\b[^>]*\bname=["']robots["'][^>]*\bcontent=["'][^"']*noindex/i.test(html))
    throw new Error(path + ' unexpectedly requests noindex');
  return target;
}

export function assertServedRobots(robots, origin) {
  if (typeof robots !== 'string' || robots.length > 100_000)
    throw new Error('robots.txt was not readable text');
  const sitemap = [...robots.matchAll(/^Sitemap:\s*(\S+)\s*$/gmi)];
  if (sitemap.length !== 1 || sitemap[0][1] !== origin + '/sitemap.xml')
    throw new Error('robots.txt must advertise exactly one sitemap at the approved HTTPS origin');
  for (const path of ['/admin', '/api/'])
    if (!new RegExp('^Disallow:\\s*' + path.replace(/\//g,'\\/') + '\\s*$', 'mi').test(robots))
      throw new Error('robots.txt must discourage indexing ' + path);
}

export function assertServedSitemap(xml, origin) {
  if (typeof xml !== 'string' || xml.length > 2_000_000 ||
      !/<urlset\b/i.test(xml))
    throw new Error('sitemap.xml is missing a usable urlset');
  const locations = [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map(match => match[1]);
  if (locations.length < 3) throw new Error('Sitemap is missing expected public routes');
  for (const route of ['/', '/events', '/past-papers']) {
    if (!locations.includes(origin + route))
      throw new Error('Sitemap missing approved public route ' + route);
  }
  const unique = new Set(locations);
  if (unique.size !== locations.length)
    throw new Error('Sitemap contains duplicate canonical entries');
  for (const location of locations) {
    let parsed;
    try { parsed = new URL(location); }
    catch { throw new Error('Sitemap contains an invalid URL'); }
    if (parsed.origin !== origin || parsed.href !== location || /\/admin(?:\/|$)|\/api(?:\/|$)/.test(parsed.pathname))
      throw new Error('Sitemap contains foreign, draft-only or administrative URL');
  }
  return locations.length;
}

/** Browser CSP is separately reviewed before restricting dynamic school media. */
export function summarizeCspRisk(csp) {
  const issues = [];
  if (!csp || typeof csp !== 'string') return ['Missing Content-Security-Policy'];
  for (const name of ['connect-src', 'frame-src', 'img-src']) {
    const directive = csp.split(';').map(x => x.trim()).find(x => x.startsWith(name + ' '));
    if (!directive) issues.push(name + ' directive is missing');
    else if (/(?:^|\s)(?:https:|wss:|\*)(?=\s|$)/.test(directive))
      issues.push(name + ' still allows broad network origins');
  }
  return issues;
}
