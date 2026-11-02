import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderStaticSeoHtml, seoRoutes} from '../scripts/generate-seo-pages.mjs';
import {renderCmsMetadata} from '../scripts/dynamic-cms-seo.mjs';

const source = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
for (const [label, template] of [
  ['multiline source', source],
  ['compact HTML5 void tags', source.replace(/\s+/g, ' ').replace(/\s*\/>/g, '>')],
  ['tab-separated attributes', source.replace(/\n\s*/g, '\t')],
]) {
  test(`SEO renders ${label} without changing the body`, () => {
    for (const html of [
      renderStaticSeoHtml(template, seoRoutes[0]),
      renderCmsMetadata(template, {title:'Title < & $&', description:'Description " & <'}, 'https://example.test/pages/a'),
    ]) {
      assert.ok(html);
      assert.equal(html.slice(html.indexOf('<body>')), template.slice(template.indexOf('<body>')));
      assert.match(html, /<meta name="description" content="[^\"]+" \/>/);
    }
  });
}
