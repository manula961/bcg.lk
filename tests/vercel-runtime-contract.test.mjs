import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url),'utf8');

test('every Vercel Drive handler dynamically imports ESM-only helpers (Node 24 runtime guard)',()=>{
  const handlers=['callback','connect','delete','disconnect','papers-upload','status','upload'];
  for(const name of handlers){
    const source=read('api/drive/'+name+'.js');
    assert.match(source,/await import\('\.\.\/_lib\/drive\.mjs'\)/,name);
    assert.doesNotMatch(source,/^\s*import\s+[\s\S]*?from\s+['"]\.\.\/_lib\/drive\.mjs['"]/m,name);
    assert.match(source,/export default async function handler\(/,name);
  }
});
test('managed Drive deletion performs authenticated CMS reference check before destruction',()=>{
  const route=read('api/drive/delete.js');
  const check=route.indexOf('assertDriveMediaUnreferenced(body.fileId, req)');
  const deletion=route.indexOf('deleteManagedDriveFile(token, body.fileId)');
  assert.ok(check>=0 && deletion>check,'Media reference scan must precede delete');
  assert.match(route,/await import\('\.\.\/_lib\/drive-media-references\.mjs'\)/);
  assert.match(route,/requireAdmin\(req, 'media.delete'\)/);
  const helper=read('api/_lib/drive-media-references.mjs');
  assert.match(helper,/throw fail\('Cannot verify whether this Drive file is referenced\.'/);
  assert.match(helper,/throw fail\('This Drive file is still referenced by CMS content\.',409\)/);
});
test('global routing middleware does not statically require an ESM module on Vercel',()=>{
  const middleware=read('middleware.js');
  assert.doesNotMatch(middleware,/^\s*import\s+.*\.mjs['"]/m);
  assert.match(middleware,/x-middleware-next/);
});
