import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assertManagedMediaDeletionApproved } from '../api/_lib/drive-delete-policy.mjs';

const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('managed Drive deletion is disabled by default and rejects accidental truthy switches',()=>{
  for (const env of [{}, {BCG_ALLOW_MANAGED_DRIVE_DELETE:'true'},
    {BCG_ALLOW_MANAGED_DRIVE_DELETE:'0'}, {BCG_ALLOW_MANAGED_DRIVE_DELETE:'yes'}]) {
    assert.throws(()=>assertManagedMediaDeletionApproved(env),{status:403});
  }
  assert.doesNotThrow(()=>assertManagedMediaDeletionApproved({
    BCG_ALLOW_MANAGED_DRIVE_DELETE:'1'
  }));
});

test('Drive deletion always authenticates first and requires explicit cleanup approval before destructive actions',()=>{
  const handler=source('api/drive/delete.js');
  const authenticated=handler.indexOf("requireAdmin(req, 'media.delete')");
  const session=handler.indexOf('verifySession(req, uid)');
  const approve=handler.indexOf('assertManagedMediaDeletionApproved()');
  const reference=handler.indexOf('assertDriveMediaUnreferenced(body.fileId, req)');
  const destructive=handler.indexOf('deleteManagedDriveFile(token, body.fileId)');
  assert.ok(authenticated>=0 && session>authenticated && approve>session &&
    reference>approve && destructive>reference);
  assert.match(handler,/await import\('\.\.\/\_lib\/drive-delete-policy\.mjs'\)/);
  assert.doesNotMatch(handler,/process\.env\.BCG_ALLOW_MANAGED_DRIVE_DELETE\s*===\s*'1'\s*\?\s*true/);
});
