/**
 * Rule #2: reject PRs modifying/deleting tracked files with Jaliya-authored history.
 * Read-only and fail-closed: never rewrites Git history or existing project files.
 */
import { execFileSync } from 'node:child_process';

const base = process.env.GITHUB_BASE_REF || 'main';
if (!/^[A-Za-z0-9._/-]+$/.test(base) || base.startsWith('/') || base.includes('..'))
  throw new Error('Invalid PR base ref');
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const baseline = 'origin/' + base;
const protectedFiles = new Set(
  git('log', baseline, '--regexp-ignore-case', '--author=JaliyaMaheshakya0529',
    '--name-only', '--pretty=format:')
    .split('\n').map(path => path.trim()).filter(Boolean)
);
if (protectedFiles.size === 0)
  throw new Error('Could not verify Jaliya-authored history; fail closed');
const changed = git('diff', '--name-only', '--diff-filter=ACMRD', baseline + '...HEAD')
  .split('\n').map(path => path.trim()).filter(Boolean);
const violations = changed.filter(path => protectedFiles.has(path));
if (violations.length) {
  console.error('Rule #2: Jaliya-contributed files were modified or removed:');
  for (const path of violations) console.error(' - ' + path);
  process.exitCode = 1;
} else {
  console.log('Rule #2 passed: ' + protectedFiles.size + ' Jaliya-contributed paths unchanged.');
}
