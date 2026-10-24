import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const guard = fileURLToPath(new URL('../scripts/verify-jaliya-preservation.mjs', import.meta.url));
function run(dir, cmd, args, env = {}) {
  return spawnSync(cmd, args, {
    cwd: dir, encoding: 'utf8', env: { ...process.env, ...env },
  });
}
function git(dir, ...args) {
  const result = run(dir, 'git', args);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

test('Rule #2 permits unrelated backend files and rejects changes to Jaliya-authored files', () => {
  const dir = mkdtempSync(join(tmpdir(), 'bcg-jaliya-'));
  try {
    git(dir, 'init', '-b', 'main');
    git(dir, 'config', 'user.name', 'Maintainer');
    git(dir, 'config', 'user.email', 'maintainer@example.test');
    writeFileSync(join(dir, 'hero.css'), 'body { color: black; }\n');
    git(dir, 'add', '.');
    git(dir, 'commit', '-m', 'Initial source');
    writeFileSync(join(dir, 'hero.css'), 'body { color: white; }\n');
    git(dir, 'add', '.');
    git(dir, '-c', 'user.name=JaliyaMaheshakya0529',
      '-c', 'user.email=jaliyamaheshakya0529@example.test', 'commit', '-m', 'Style');

    git(dir, 'update-ref', 'refs/remotes/origin/main', git(dir, 'rev-parse', 'HEAD'));
    git(dir, 'switch', '-c', 'feature');
    writeFileSync(join(dir, 'backend.mjs'), 'export const ok = true;\n');
    git(dir, 'add', '.');
    git(dir, 'commit', '-m', 'Backend fix');
    let result = run(dir, process.execPath, [guard], { GITHUB_BASE_REF: 'main' });
    assert.equal(result.status, 0, result.stderr);

    writeFileSync(join(dir, 'hero.css'), 'body { color: red; }\n');
    git(dir, 'add', '.');
    git(dir, 'commit', '-m', 'Unexpected UI edit');
    result = run(dir, process.execPath, [guard], { GITHUB_BASE_REF: 'main' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /hero\.css/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
