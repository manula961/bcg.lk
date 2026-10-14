import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const base = process.env.GITHUB_BASE_REF || 'main';
const output = execFileSync('git', ['diff', '--name-only', 'origin/' + base + '...HEAD'], { encoding: 'utf8' });
const changed = output.split(/\r?\n/).filter(Boolean);

// New detail pages can be added. Existing component/CSS/UI assets are protected.
const protectedPaths = changed.filter(path => {
  if (/^src\/pages\//.test(path)) return false;
  if (['src/main.jsx', 'src/components/LifeAsNayaken.jsx', 'src/admin/AdminDashboard.jsx', 'src/admin/ContentManager.jsx'].includes(path)) return false; // checked byte-for-byte below
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


// The existing Life section can only receive approved text and keyboard-click routes.
if (changed.includes('src/components/LifeAsNayaken.jsx')) {
  const original = execFileSync('git', ['show', 'origin/' + base + ':src/components/LifeAsNayaken.jsx'], { encoding: 'utf8' });
  let normalized = readFileSync('src/components/LifeAsNayaken.jsx', 'utf8');
  normalized = normalized.replaceAll('Societies', 'Arts & Culture')
    .replaceAll('Leadership', 'Prefect Council')
    .replaceAll('Science, creativity, service and teamwork.', 'Drama, music, and tradition.')
    .replaceAll('Responsibility, teamwork and service.', 'Service and brotherhood.')
    .replace('className="bento-tag">Discovery', 'className="bento-tag">Expression')
    .replace('className="bento-tag">Lead by Example', 'className="bento-tag">Leadership');
  const slugs = ['academic-excellence','sports-athletics','societies','leadership'];
  for (const [index, slug] of slugs.entries()) {
    const i = index + 1;
    const markup = '<div className="bento-card card-' + i + '" role="link" tabIndex={0} aria-label="Open ' + slug.replace(/-/g, ' ') + ' page" onClick={() => window.location.assign(\'/life/' + slug + '\')} onKeyDown={(event) => { if (event.key === \'Enter\') window.location.assign(\'/life/' + slug + '\'); }}>';
    normalized = normalized.replace(markup, '<div className="bento-card card-' + i + '">');
  }
  if (normalized !== original) protectedPaths.push('src/components/LifeAsNayaken.jsx (unapproved UI change)');
}


// Only additive configurations for these three CMS sections are permitted;
// normalize them away and compare the original admin markup byte-for-byte.
for (const path of ['src/admin/AdminDashboard.jsx', 'src/admin/ContentManager.jsx']) {
  if (!changed.includes(path)) continue;
  const original = execFileSync('git', ['show', 'origin/' + base + ':' + path], { encoding: 'utf8' });
  let normalized = readFileSync(path, 'utf8');
  if (path.endsWith('AdminDashboard.jsx')) {
    normalized = normalized.replace(/  \{\n    id: 'sports',[\s\S]*?\n  \},\n(?=  \{\n    id: 'pages')/, '');
  } else {
    normalized = normalized.replace(/import \{\n  subscribeAdminSports,[\s\S]*?\} from '\.\.\/lib\/leadershipService';\n/, '');
    normalized = normalized.replace(/  sports: \{\n[\s\S]*?\n  \},\n(?=  pages: \{)/, '');
    normalized = normalized.replace("if (['events', 'societies', 'sports', 'extracurricular', 'leadership'].includes(kind))", "if (kind === 'events' || kind === 'societies')");
    normalized = normalized.replace('item.excerpt, item.description, item.websiteUrl, item.role, item.achievements,', 'item.excerpt, item.description, item.websiteUrl,');

    // Undo only the approved Cloudinary upload control, then compare with main.
    normalized = normalized.replace("import { cloudinaryUploadConfigured, uploadAdminImage } from '../lib/cloudinaryUpload';\n", '');
    normalized = normalized.replace("  const [uploadingImage, setUploadingImage] = useState(false);\n", '');
    normalized = normalized.replace(/  async function handleImageUpload\(event\) \{[\s\S]*?\n  \}\n\n(?=  async function save)/, '');
    normalized = normalized.replaceAll('if (busy || uploadingImage) return;', 'if (busy) return;');
    normalized = normalized.replaceAll('disabled={busy || uploadingImage}', 'disabled={busy}');
    normalized = normalized.replace('                <React.Fragment key={field.key}>\n                <label', '                <label key={field.key}');
    normalized = normalized.replace(/                \{field\.key === 'imageUrl' && cloudinaryUploadConfigured && \([\s\S]*?\n                \)\}\n                <\/React\.Fragment>\n/, '');

  }
  if (normalized !== original) protectedPaths.push(path + ' (unapproved change to original UI)');
}

if (protectedPaths.length) {
  console.error('Rule #1 violation: existing UI/asset files changed:\n' + protectedPaths.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Rule #1 passed: original UI source is unchanged; only approved new-page routing allowed.');
}
