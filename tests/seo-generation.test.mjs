import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, existsSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { seoRoutes, ORIGIN, renderStaticSeoHtml, staticSitemap, generateSeoFiles, generatedRobotsTxt } from '../scripts/generate-seo-pages.mjs';

const template = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const rewrites = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8')).rewrites;

test('known public paths receive unique crawlable title, description, canonical and OpenGraph metadata', () => {
  assert.ok(seoRoutes.length >= 6);
  for (const route of seoRoutes) {
    const html = renderStaticSeoHtml(template, route);
    const url = ORIGIN + (route.canonicalPath || route.path);
    assert.match(html, new RegExp('<title>[^<]+</title>'));
    assert.match(html, /<meta name="description" content="[^"]+"\s*\/>/);
    assert.ok(html.includes('<link rel="canonical" href="' + url + '" />'));
    assert.ok(html.includes('<meta property="og:url" content="' + url + '" />'));
    assert.ok(html.includes('<meta property="og:description" content="' + route.description + '" />'));
    assert.ok(rewrites.some(rule => rule.source === route.path && rule.destination === route.path + '/index.html'));
    assert.notEqual(html, template);
  }
  const titleSet = new Set(seoRoutes.map(route => renderStaticSeoHtml(template, route).match(/<title>([^<]+)<\/title>/)[1]));
  assert.equal(titleSet.size, seoRoutes.length);
});

test('generated sitemap excludes unpublished CMS routes and duplicate About Us alias', () => {
  const sitemap = staticSitemap();
  assert.match(sitemap, /<urlset/);
  assert.match(sitemap, /https:\/\/bcglk\.devoraid\.com\/events/);
  assert.match(sitemap, /https:\/\/bcglk\.devoraid\.com\/past-papers/);
  assert.doesNotMatch(sitemap, /https:\/\/bcglk\.devoraid\.com\/life\/about-us</);
  assert.doesNotMatch(sitemap, /\/admin|\/api\//);
  assert.equal((sitemap.match(/<url>/g) || []).length, seoRoutes.filter(route => !route.excludeSitemap).length + 1);
});

test('build postprocessor emits valid static route pages and does not overwrite homepage markup', () => {
  const root = mkdtempSync(join(tmpdir(), 'bcg-seo-'));
  try {
    writeFileSync(join(root, 'index.html'), template, 'utf8');
    generateSeoFiles(root, { analyticsEnabled: true });
    const builtHome = readFileSync(join(root, 'index.html'), 'utf8');
    assert.equal(builtHome.replace('  <script defer src="/assets/bcg-post-views.js"></script>\n', ''), template);
    assert.equal(builtHome.slice(builtHome.indexOf('<body>')), template.slice(template.indexOf('<body>')));
    assert.ok(existsSync(join(root, 'assets', 'bcg-post-views.js')));
    for (const route of seoRoutes) {
      const file = join(root, route.path.slice(1), 'index.html');
      assert.ok(existsSync(file), file);
      assert.ok(readFileSync(file, 'utf8').includes(ORIGIN + (route.canonicalPath || route.path)));
      assert.match(readFileSync(file, 'utf8'), /assets\/bcg-post-views\.js/);
    }
    assert.ok(existsSync(join(root, 'sitemap.xml')));
    assert.equal(readFileSync(join(root, 'robots.txt'), 'utf8'), generatedRobotsTxt());
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('deployment adds anti-clickjacking, MIME and admin-indexing headers', () => {
  const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  const global = config.headers.find(x => x.source === '/(.*)')?.headers || [];
  const entries = Object.fromEntries(global.map(x => [x.key.toLowerCase(), x.value]));
  assert.equal(entries['x-content-type-options'], 'nosniff');
  assert.equal(entries['x-frame-options'], 'DENY');
  assert.equal(entries['referrer-policy'], 'strict-origin-when-cross-origin');
  assert.match(entries['permissions-policy'], /camera=\(\)/);
  const admin = config.headers.find(x => x.source === '/admin')?.headers || [];
  assert.ok(admin.some(x => x.key.toLowerCase() === 'x-robots-tag' && x.value.includes('noindex')));
});

test('robots.txt uses the same approved canonical host as the generated sitemap', () => {
  const robots = generatedRobotsTxt();
  assert.match(robots, /^Sitemap: https:\/\/bcglk\.devoraid\.com\/sitemap\.xml$/m);
  assert.match(robots, /^Disallow: \/admin$/m);
  assert.match(robots, /^Disallow: \/api\/$/m);
  assert.throws(() => generatedRobotsTxt('User-agent: *\n'), /exactly one Sitemap directive/);
  assert.throws(() => generatedRobotsTxt(
    'Sitemap: https://a.example/sitemap.xml\nSitemap: https://b.example/sitemap.xml\n'
  ), /exactly one Sitemap directive/);

  const result = spawnSync(process.execPath, ['--input-type=module', '-e',
    "import { generatedRobotsTxt, staticSitemap } from './scripts/generate-seo-pages.mjs'; console.log(generatedRobotsTxt()); console.log(staticSitemap());"], {
    cwd: new URL('..', import.meta.url), encoding: 'utf8',
    env: { ...process.env, BCG_CANONICAL_ORIGIN: 'https://approved.example.test' },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Sitemap: https:\/\/approved\.example\.test\/sitemap\.xml/);
  assert.match(result.stdout, /<loc>https:\/\/approved\.example\.test\/events<\/loc>/);
  assert.doesNotMatch(result.stdout, /bcglk\.devoraid\.com/);
});

test('post-view collector is not shipped unless enabled with a server hash key', async () => {
  const { analyticsCollectionEnabled } = await import('../scripts/generate-seo-pages.mjs');
  assert.equal(analyticsCollectionEnabled({}), false);
  assert.equal(analyticsCollectionEnabled({ BCG_ANALYTICS_ENABLED: '1' }), false);
  assert.equal(analyticsCollectionEnabled({
    BCG_ANALYTICS_ENABLED: '1', BCG_ANALYTICS_HASH_KEY: 'a'.repeat(32),
  }), true);
  const root = mkdtempSync(join(tmpdir(), 'bcg-no-analytics-'));
  try {
    writeFileSync(join(root, 'index.html'), template, 'utf8');
    generateSeoFiles(root, { analyticsEnabled: false });
    assert.equal(readFileSync(join(root, 'index.html'), 'utf8'), template);
    assert.equal(existsSync(join(root, 'assets', 'bcg-post-views.js')), false);
    for (const route of seoRoutes) {
      const page = readFileSync(join(root, route.path.slice(1), 'index.html'), 'utf8');
      assert.doesNotMatch(page, /bcg-post-views\\.js/);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
