import test from 'node:test';
import assert from 'node:assert/strict';
import { assertApprovedSmokeOrigin } from '../scripts/public-smoke-origin.mjs';

test('accepts an exact approved HTTPS domain', () => {
  assert.equal(assertApprovedSmokeOrigin('https://bcglk.devoraid.com',
    {approvedOrigin:'https://bcglk.devoraid.com',required:true}).origin,
    'https://bcglk.devoraid.com');
});

test('rejects unapproved or missing configured origins', () => {
  assert.throws(()=>assertApprovedSmokeOrigin('https://wrong.example',
    {approvedOrigin:'https://bcglk.devoraid.com',required:true}), /differs/);
  assert.throws(()=>assertApprovedSmokeOrigin('https://bcglk.devoraid.com',
    {required:true}), /not been configured/);
});

test('refuses private addresses, credentials, paths and non-HTTPS', () => {
  for (const value of ['https://localhost', 'https://127.0.0.1', 'https://[::1]',
    'http://bcglk.devoraid.com', 'https://bcglk.devoraid.com/',
    'https://bcglk.devoraid.com/path', 'https://u:p@bcglk.devoraid.com',
    'https://bcglk.devoraid.com?x=1']) {
    assert.throws(()=>assertApprovedSmokeOrigin(value), /origin|domain/i, value);
  }
});
