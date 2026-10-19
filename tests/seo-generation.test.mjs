import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, existsSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { seoRoutes, ORIGIN, renderStaticSeoHtml, staticSitemap, generateSeoFiles } from '../scripts/generate-seo-pages.mjs';

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
  assert.doesNotMatch(sitemap, /https:\/\/bcglk\.devoraid\.com\/life\/about-us</);
  assert.doesNotMatch(sitemap, /\/admin|\/api\//);
  assert.equal((sitemap.match(/<url>/g) || []).length, seoRoutes.filter(route => !route.excludeSitemap).length + 1);
});

test('build postprocessor emits valid static route pages and does not overwrite homepage markup', () => {
  const root = mkdtempSync(join(tmpdir(), 'bcg-seo-'));
  try {
    writeFileSync(join(root, 'index.html'), template, 'utf8');
    generateSeoFiles(root);
    assert.equal(readFileSync(join(root, 'index.html'), 'utf8'), template);
    for (const route of seoRoutes) {
      const file = join(root, route.path.slice(1), 'index.html');
      assert.ok(existsSync(file), file);
      assert.ok(readFileSync(file, 'utf8').includes(ORIGIN + (route.canonicalPath || route.path)));
    }
    assert.ok(existsSync(join(root, 'sitemap.xml')));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
