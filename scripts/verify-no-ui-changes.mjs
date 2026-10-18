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
  } else if (path === 'src/admin/AdminDashboard.jsx') {
    const before = git('show', 'origin/' + base + ':' + path);
    const after = git('show', 'HEAD:' + path);
    const expected = before.replace("import './Admin.css';", "import './Admin.css';\nimport './AdminFrontendTheme.css';");
    if (after !== expected) violations.push(path + ' (admin theme import only)');
  } else if (path === 'src/admin/Admin.css') {
    const before = git('show', 'origin/' + base + ':' + path);
    const after = git('show', 'HEAD:' + path);
    if (after !== before.replace(':root {', '.admin-body, .admin-center-screen {'))
      violations.push(path + ' (unexpected admin base style change)');
  } else if (path === 'src/admin/AdminLogin.jsx') {
    const before = git('show', 'origin/' + base + ':' + path);
    const after = git('show', 'HEAD:' + path);
    const expected = before
      .replace("err?.message || 'Unable to sign in.'", "'Unable to sign in. Please check your details and try again.'")
      .replace('<label className="admin-label">Email Address</label>', '<label className="admin-label" htmlFor="admin-login-email">Email Address</label>')
      .replace('type="email"\\n', 'id="admin-login-email"\\n              type="email"\\n')
      .replace('<label className="admin-label">Password</label>', '<label className="admin-label" htmlFor="admin-login-password">Password</label>')
      .replace('type="password"\\n', 'id="admin-login-password"\\n              type="password"\\n')
      .replace('{error && <div className="admin-notice error">{error}</div>}', '{error && <div className="admin-notice error" role="alert">{error}</div>}');
    if (after !== expected) violations.push(path + ' (unexpected admin login change)');
  } else if (path === 'src/admin/AdminFrontendTheme.css') {
    const before = git('show', 'origin/' + base + ':' + path);
    const after = git('show', 'HEAD:' + path);
    if (!after.startsWith(before) || !after.slice(before.length).includes('@media (max-width: 520px)') ||
        /:root|@import|url\\s*\\(/.test(after.slice(before.length)) ||
        !after.slice(before.length).split('{').slice(0,-1).every(chunk => {
          const selector = chunk.split('}').pop().trim();
          return selector.startsWith('@media') || selector.split(',').every(s => s.trim().startsWith('.admin-body '));
        })) violations.push(path + ' (unexpected or unscoped admin theme change)');
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
