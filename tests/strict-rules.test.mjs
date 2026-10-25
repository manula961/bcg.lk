import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const guard = fileURLToPath(new URL('../scripts/verify-no-ui-changes.mjs', import.meta.url));

function run(directory, binary, args, env = {}) {
  return spawnSync(binary, args, {
    cwd: directory,
    encoding: 'utf8',
    env: { ...process.env, GITHUB_BASE_REF: 'main', ...env },
  });
}
function git(directory, ...args) {
  const result = run(directory, 'git', args);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

test('Rule #1 permits backend-only changes but blocks edits to existing UI files', () => {
  const directory = mkdtempSync(join(tmpdir(), 'bcg-ui-guard-'));
  try {
    git(directory, 'init', '-b', 'main');
    git(directory, 'config', 'user.name', 'Test Author');
    git(directory, 'config', 'user.email', 'audit@example.test');
    mkdirSync(join(directory, 'src', 'admin'), { recursive: true });
    mkdirSync(join(directory, 'src', 'lib'), { recursive: true });
    writeFileSync(join(directory, 'src', 'admin', 'Login.jsx'), 'export default () => null;\n');
    writeFileSync(join(directory, 'src', 'lib', 'data.js'), 'export const flag = false;\n');
    git(directory, 'add', '.');
    git(directory, 'commit', '-m', 'Baseline');
    git(directory, 'update-ref', 'refs/remotes/origin/main', git(directory, 'rev-parse', 'HEAD'));
    git(directory, 'switch', '-c', 'audit-fix');

    writeFileSync(join(directory, 'src', 'lib', 'data.js'), 'export const flag = true;\n');
    git(directory, 'add', '.');
    git(directory, 'commit', '-m', 'Backend fix');
    let result = run(directory, process.execPath, [guard]);
    assert.equal(result.status, 0, result.stderr);

    writeFileSync(join(directory, 'src', 'admin', 'Login.jsx'), 'export default () => <main />;\n');
    git(directory, 'add', '.');
    git(directory, 'commit', '-m', 'Unapproved visual change');
    result = run(directory, process.execPath, [guard]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /src\/admin\/Login\.jsx/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('Rule #1 rejects newly added public media even with a backend-only base', () => {
  const directory = mkdtempSync(join(tmpdir(), 'bcg-asset-guard-'));
  try {
    git(directory, 'init', '-b', 'main');
    git(directory, 'config', 'user.name', 'Test Author');
    git(directory, 'config', 'user.email', 'audit@example.test');
    writeFileSync(join(directory, 'README.md'), 'Baseline\n');
    git(directory, 'add', '.');
    git(directory, 'commit', '-m', 'Baseline');
    git(directory, 'update-ref', 'refs/remotes/origin/main', git(directory, 'rev-parse', 'HEAD'));
    git(directory, 'switch', '-c', 'unapproved-asset');
    mkdirSync(join(directory, 'public'), { recursive: true });
    writeFileSync(join(directory, 'public', 'another-logo.svg'), '<svg />\n');
    git(directory, 'add', '.');
    git(directory, 'commit', '-m', 'Unapproved image');
    const result = run(directory, process.execPath, [guard]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /public\/another-logo\.svg/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('syntax checker and CI routes cover middleware before dependency installation', () => {
  const read = path => import('node:fs').then(fs =>
    fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8'));
  return Promise.all([
    read('scripts/check-source-syntax.mjs'),
    read('.github/workflows/build.yml'),
    read('.github/workflows/backend-checks.yml'),
  ]).then(([checker, build, backend]) => {
    assert.match(checker, /middleware\.js/);
    assert.match(checker, /--check/);
    assert.match(build, /node scripts\/check-source-syntax\.mjs[\s\S]*?npm ci/);
    assert.match(backend, /node scripts\/check-source-syntax\.mjs[\s\S]*?npm ci/);
  });
});
