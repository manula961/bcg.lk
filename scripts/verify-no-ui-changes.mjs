import { execFileSync } from 'node:child_process';

const base = process.env.GITHUB_BASE_REF || 'main';
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const changed = git('diff', '--name-only', '--diff-filter=ACMR', 'origin/' + base + '...HEAD')
  .split('\n').filter(Boolean);

// Rule #1: reject edits to existing visual source, styles, and static assets.
// New UI files are reviewed explicitly, rather than implicitly permitted.
const protectedPath = path =>
  path === 'index.html' ||
  /^src\/(?:components|admin|pages)\//.test(path) ||
  /^src\/(?:App\.jsx|main\.jsx|index\.css)$/.test(path) ||
  /^public\//.test(path) ||
  /\.(?:css|scss|svg|png|jpe?g|webp|woff2?)$/i.test(path);

// User-approved fixes in PR #32. Each protected file must match this exact Git blob.
// Unlisted frontend edits remain prohibited. Changes require explicit re-review.
const auditedUiBlobs = Object.freeze({
  "index.html": "8e6421a10e130c855b273cc4b8097185fbefe6e2",
  "src/index.css": "35e55d5417f08f483ab41e70b9d14af2abbc65dd",
  "src/App.jsx": "a63eee44a704f032c35221a7ff82623fa48c82eb",
  "src/pages/SchoolContentListing.jsx": "59de3415d460e2b506862ef2f05796d7db6884b6",
  "src/pages/lifePageData.js": "638e19fd673ebddc40453ffd9893b53141abf0aa",
  "src/pages/LifeDetailPage.jsx": "274e37eab492ea864857ef3365e3bf9d77943df6",
  "src/pages/EventsPage.css": "a2a5a58a973c82a0c0bdbbd69f73b5c3ee4125a5",
  "src/admin/AdminApp.jsx": "e53fa46b9ef7c6cddbde40e0fed43dfe9a71478a",
  "src/admin/ContentManager.jsx": "47995288a9ca9427396e57f7e284588ca7aa0507",
  "src/components/EventsSection.jsx": "3819651c15a1e5adc5508809baeac20ce8d0923f",
  "src/components/HeroSection.css": "111cee3784af5cadff2e566cad8c78672ebb87a9",
  "src/components/HeroSection.jsx": "c624ae98582f06202a9e84f3b09ef2980d3107f1",
  "src/components/NewsSection.jsx": "4abb800b5e07106d7e405ad316a89fa1f8e2f107",
  "src/main.jsx": "fe28c758cf1ae32f4d86df5386c3f7b074262751",
  "src/pages/EventDetail.jsx": "4784707409d3af0e855930139c594d041d80045d",
  "src/pages/EventsPage.jsx": "04861176edd27da87e772be03b1f4f92d162906b",
  "src/pages/NotFoundPage.jsx": "6a1958bf3208721e4b6c78a0a17f60aff29bd49b",
  "src/pages/Updates.jsx": "ff4a0ef12aa7e14ef1d8ab158162bf9f980a9cb9"
});
// Deletions of protected files are denied except the reviewed unused legacy stylesheet.
const auditedUiDeletions = Object.freeze({ 'src/admin/AdminTheme.css': 'ca912562b66f5ac77da3b7a2aafd503681b15714' });
const approvedRouteFile = 'src/main.jsx';
const violations = [];
const removedFiles = git('diff', '--name-only', '--diff-filter=D', 'origin/' + base + '...HEAD')
  .split('\n').filter(Boolean);
for (const path of removedFiles.filter(protectedPath)) {
  if (!Object.prototype.hasOwnProperty.call(auditedUiDeletions, path) ||
      git('rev-parse', 'origin/' + base + ':' + path) !== auditedUiDeletions[path]) {
    violations.push(path + ' (unapproved protected UI deletion)');
  }
}
for (const path of changed.filter(protectedPath)) {
  if (Object.prototype.hasOwnProperty.call(auditedUiBlobs, path)) {
    if (git('rev-parse', 'HEAD:' + path) !== auditedUiBlobs[path])
      violations.push(path + ' (differs from explicitly audited UI blob)');
    continue;
  }
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
      .replace('type="email"\n', 'id="admin-login-email"\n              type="email"\n')
      .replace('<label className="admin-label">Password</label>', '<label className="admin-label" htmlFor="admin-login-password">Password</label>')
      .replace('type="password"\n', 'id="admin-login-password"\n              type="password"\n')
      .replace('{error && <div className="admin-notice error">{error}</div>}', '{error && <div className="admin-notice error" role="alert">{error}</div>}');
    if (after !== expected) violations.push(path + ' (unexpected admin login change)');
  } else if (path === 'src/admin/AdminFrontendTheme.css') {
    const before = git('show', 'origin/' + base + ':' + path);
    const after = git('show', 'HEAD:' + path);
    const addition = after.slice(before.length).trim();
    const expectedAddition = `\n/* Keep admin-only visual controls usable on narrow screens. */\n@media (max-width: 520px) {\n  .admin-body .admin-sidebar-nav { grid-template-columns: repeat(2,minmax(0,1fr)); }\n  .admin-body .admin-nav-item { min-width: 0; }\n  .admin-body .admin-nav-text { min-width: 0; }\n  .admin-body .admin-nav-label, .admin-body .admin-nav-desc { overflow-wrap: anywhere; }\n  .admin-body .admin-header-actions { display: flex; flex-wrap: wrap; }\n  .admin-body .admin-search-wrap { min-width: 0; max-width: 100%; }\n  .admin-body .admin-row-actions { justify-content: flex-start; }\n}\n`;
    // Exact allowlist: no other CSS rules or public selectors may be introduced.
    if (!after.startsWith(before) || addition !== expectedAddition.trim())
      violations.push(path + ' (unexpected admin theme change)');
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
