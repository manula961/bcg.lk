import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const checker = fileURLToPath(new URL('../scripts/check-bundle-budget.mjs', import.meta.url));
function check(files) {
  const directory = mkdtempSync(join(tmpdir(), 'bcg-bundle-budget-'));
  try {
    const assets = join(directory, 'dist', 'assets');
    mkdirSync(assets, { recursive: true });
    for (const [name, bytes] of Object.entries(files))
      writeFileSync(join(assets, name), Buffer.alloc(bytes));
    return spawnSync(process.execPath, [checker], { cwd: directory, encoding: 'utf8' });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test('bundle budget accepts a single entry and reports the largest chunk', () => {
  const result = check({ 'index-entry.js': 42, 'vendor-chunk.js': 120, 'readme.txt': 800000 });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Initial JS entry size: 42 bytes/);
  assert.match(result.stdout, /Largest route-shared JavaScript chunk: vendor-chunk.js 120 bytes/);
});

test('bundle budget rejects missing or duplicate entry chunks', () => {
  for (const files of [{ 'vendor.js': 20 }, { 'index-a.js': 3, 'index-b.js': 6 }]) {
    const result = check(files);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Expected one entry module/);
  }
});

test('bundle budget enforces existing entry and largest chunk limits', () => {
  const entry = check({ 'index-a.js': 300 * 1024 + 1 });
  assert.notEqual(entry.status, 0);
  assert.match(entry.stderr, /Entry JS bundle exceeds 300 KiB/);
  const chunk = check({ 'index-a.js': 300 * 1024, 'vendor.js': 800 * 1024 + 1 });
  assert.notEqual(chunk.status, 0);
  assert.match(chunk.stderr, /Largest JavaScript chunk exceeds 800 KiB: vendor.js/);
});
