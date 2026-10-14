import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const base = process.env.GITHUB_BASE_REF || 'main';
const output = execFileSync('git', ['diff', '--name-only', 'origin/' + base + '...HEAD'], { encoding: 'utf8' });
const changed = output.split(/\r?\n/).filter(Boolean);

// New detail pages can be added. Existing component/CSS/UI assets are protected.
const protectedPaths = changed.filter(path => {
  if (/^src\/pages\//.test(path)) return false;
  if (path === 'src/main.jsx') return false; // checked byte-for-byte below
  return /^src\/components\//.test(path) ||
    /^src\/admin\/.*\.(?:jsx|css)$/.test(path) ||
    /^src\/(?:App\.jsx|index\.css)$/.test(path) ||
    /^(?:public\/|src\/Assets\/|index\.html$)/.test(path) ||
    /\.(?:css|scss|sass|svg|png|jpg|jpeg|webp|gif|woff2?)$/i.test(path);
});

// The sole permitted change to main.jsx inserts new routes.
// Removing those exact additions must reproduce the baseline source byte-for-byte.
if (changed.includes('src/main.jsx')) {
  const original = execFileSync('git', ['show', 'origin/' + base + ':src/main.jsx'], { encoding: 'utf8' });
  const actual = readFileSync('src/main.jsx', 'utf8');
  const normalized = actual
    .replace("import LifeDetailPage, { lifePages } from './pages/LifeDetailPage.jsx';\n", '')
    .replace("const lifeMatch = window.location.pathname.match(/^\\/life\\/([a-z-]+)\\/?$/);\n", '')
    .replace("const lifeSlug = lifeMatch && Object.prototype.hasOwnProperty.call(lifePages, lifeMatch[1]) ? lifeMatch[1] : null;\n", '')
    .replace('{isAdminPath ? <AdminApp /> : lifeSlug ? <LifeDetailPage slug={lifeSlug} /> : <App />}', '{isAdminPath ? <AdminApp /> : <App />}');
  if (normalized !== original) protectedPaths.push('src/main.jsx (changes beyond the approved route insertion)');
}

if (protectedPaths.length) {
  console.error('Rule #1 violation: existing UI/asset files changed:\n' + protectedPaths.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Rule #1 passed: original UI source is unchanged; only approved new-page routing allowed.');
}
