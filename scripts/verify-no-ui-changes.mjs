/**
 * Rule #1: UI preservation is fail-closed.
 *
 * Compare the complete PR diff against the fetched target branch. Historical
 * allowlisted blobs must never permit a branch to revert the current UI.
 * Any visual-source change requires separate owner approval and a separately
 * reviewed policy update; it cannot be silently permitted by old exceptions.
 */
import { execFileSync } from 'node:child_process';

const base = process.env.GITHUB_BASE_REF || 'main';
if (!/^[A-Za-z0-9._/-]+$/.test(base) || base.startsWith('/') || base.includes('..'))
  throw new Error('Invalid PR base ref');
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const baseline = 'origin/' + base;
// Fail closed when the complete target history is unavailable.
git('rev-parse', '--verify', baseline + '^{commit}');
const changed = git('diff', '--name-only', '--diff-filter=ACMRD', baseline + '...HEAD')
  .split('\n').filter(Boolean);

export const protectedPath = path =>
  path === 'index.html' || path === 'tailwind.config.js' ||
  path === 'postcss.config.js' ||
  /^src\/(?:components|admin|pages|navigation|assets)\//.test(path) ||
  /^src\/(?:App\.jsx|main\.jsx|index\.css)$/.test(path) ||
  /^public\//.test(path) ||
  /\.(?:css|scss|sass|less|svg|png|jpe?g|webp|gif|ico|avif|woff2?|ttf|otf|mp3|wav|mp4|webm)$/i.test(path);

const violations = changed.filter(protectedPath);
if (violations.length) {
  console.error('Rule #1: protected UI source changed without approval:');
  for (const path of violations) console.error(' - ' + path);
  process.exitCode = 1;
} else {
  console.log('Rule #1 passed: no protected UI source changes detected.');
}
