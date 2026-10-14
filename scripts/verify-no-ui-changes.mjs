import { execFileSync } from 'node:child_process';

const base = process.env.GITHUB_BASE_REF || 'main';
const output = execFileSync('git', ['diff', '--name-only', 'origin/' + base + '...HEAD'], { encoding: 'utf8' });
const changed = output.split(/\r?\n/).filter(Boolean);
const protectedPaths = changed.filter(path =>
  /^src\/components\//.test(path) ||
  /^src\/admin\/.*\.(?:jsx|css)$/.test(path) ||
  /^src\/(?:App\.jsx|main\.jsx|index\.css)$/.test(path) ||
  /^(?:public\/|src\/Assets\/|index\.html$)/.test(path) ||
  /\.(?:css|scss|sass|svg|png|jpg|jpeg|webp|gif|woff2?)$/i.test(path)
);
if (protectedPaths.length) {
  console.error('Rule #1 violation: UI/asset files changed in this backend-only PR:\n' + protectedPaths.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Rule #1 check passed: no protected UI or asset files changed.');
}
