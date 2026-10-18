import { execFileSync } from 'node:child_process';

const base = process.env.GITHUB_BASE_REF || 'main';
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const changed = git('diff', '--name-only', '--diff-filter=ACMR', 'origin/' + base + '...HEAD')
  .split('\n').filter(Boolean);

// Rule #1: reject edits to existing visual source, styles, and static assets.
// New UI files are reviewed explicitly, rather than implicitly permitted.
const protectedPath = path =>
  /^src\/(?:components|admin|pages)\//.test(path) ||
  /^src\/(?:App\.jsx|main\.jsx|index\.css)$/.test(path) ||
  /^public\//.test(path) ||
  /\.(?:css|scss|svg|png|jpe?g|webp|woff2?)$/i.test(path);

const approvedRouteFile = 'src/main.jsx';
const violations = [];
for (const path of changed.filter(protectedPath)) {
  if (path === approvedRouteFile) {
    // Route-only edits are allowed when existing imports/components and routing
    // branches are preserved. Any other change needs explicit review.
    const before = git('show', 'origin/' + base + ':' + path);
    const after = git('show', 'HEAD:' + path);
    const normalize = value => value
      .replace(/^import EventsPage from '\.\/pages\/EventsPage\.jsx';\n?/m, '')
      .replace(/^import AboutUsPage from '\.\/pages\/AboutUsPage\.jsx';\n?/m, '')
      .replace(/^\s*if \(isAboutUsPath\) return <(?:AboutUsPage \/>|LifeDetailPage slug="about-us" \/>);\n?/m, '');
    if (normalize(before) !== normalize(after)) violations.push(path + ' (unapproved routing or UI change)');
  } else {
    violations.push(path);
  }
}
if (violations.length) {
  console.error('Rule #1: protected UI source changed: ' + violations.join(', '));
  process.exitCode = 1;
} else {
  console.log('Rule #1 passed: no unapproved visual-source changes detected.');
}
