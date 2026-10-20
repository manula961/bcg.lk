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
  // Approved behavior-only fixes: async recovery, a11y, media consent (no design changes).
  "src/components/ExploreSection.css": "1cb55dacacd4acde044ea80f59e0fd3f0026a00a",
  "src/components/ExploreSection.jsx": "9252408a8ac08af73f827f4fc6748d749be07a86",
  // Approved behavior-only fixes: async recovery, a11y, media consent (no design changes).
  "src/components/MenuBar.jsx": "f195827db4c025991582ea6693f96b740a35c922",
  // Approved behavior-only fixes: async recovery, a11y, media consent (no design changes).
  "src/pages/PublishedContentPage.jsx": "99af8ea869b3c76f0c59a63737c6cdf3f50c63b6",
  // Approved behavior-only fixes: async recovery, a11y, media consent (no design changes).
  "src/pages/Updates.jsx": "3d5e21ceb2629d1184a742fc0df2b2798a43a0ac",
  "public/sitemap.xml": "a794bbe90c130970abd057344a97cec18a6559a1",
  "public/robots.txt": "67e4697aed7c6374a137916b11104e712e3eddf9",
  "index.html": "8e6421a10e130c855b273cc4b8097185fbefe6e2",
  "src/index.css": "35e55d5417f08f483ab41e70b9d14af2abbc65dd",
  "src/App.jsx": "2c79d6f1d958db7eb28fc844a49a0507500f2f12",
  "src/pages/SchoolContentListing.jsx": "7ccfc4c3e5eceaf9aed91beaa632695d7b28cd80",
  "src/pages/lifePageData.js": "638e19fd673ebddc40453ffd9893b53141abf0aa",
  "src/pages/LifeDetailPage.jsx": "f6d3765edfec7d207798cb98afd717746328efb1",
  "src/pages/EventsPage.css": "a2a5a58a973c82a0c0bdbbd69f73b5c3ee4125a5",
  // RBAC-only admin-console behavior, reviewed as part of this PR.
  "src/admin/AdminApp.jsx": "0f59da69988f92c77021fa9542a2f921cbfa7e66",
  "src/admin/AdminDashboard.jsx": "f931902e890754afa4ddea5f6a46ea0c28f21f81",
  "src/admin/RoleManager.jsx": "08c4f9fe8811b013a44d2ea5461c11dad34565f7",
  "src/admin/ContentManager.jsx": "6fc184aaa856440733faea5b9e6a2a6104172fbc",
  "src/components/EventsSection.jsx": "41b1f30260fcbda98dc4fdd99bb042dfc0e92ce5",
  "src/components/HeroSection.css": "111cee3784af5cadff2e566cad8c78672ebb87a9",
  "src/components/HeroSection.jsx": "c624ae98582f06202a9e84f3b09ef2980d3107f1",
  "src/components/NewsSection.jsx": "63fb0e859cd981f7b97290c4e59260c5200c6817",
  "src/main.jsx": "fe28c758cf1ae32f4d86df5386c3f7b074262751",
  "src/pages/EventDetail.jsx": "eba0eaacdd8cb40691cd92f266829cc073b51e04",
  "src/pages/EventsPage.jsx": "04861176edd27da87e772be03b1f4f92d162906b",
  "src/pages/NotFoundPage.jsx": "6a1958bf3208721e4b6c78a0a17f60aff29bd49b",
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
