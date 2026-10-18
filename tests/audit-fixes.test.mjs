import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('UI guard has exact SHA allowlist and still protects public source', () => {
  const source = read('scripts/verify-no-ui-changes.mjs');
  assert.match(source, /git\('rev-parse', 'HEAD:' \+ path\)/);
  assert.match(source, /differs from explicitly audited UI blob/);
  assert.match(source, /protectedPath/);
  assert.match(source, /violations\.push\(path\)/);
  const matches = [...source.matchAll(/"src\/(?:admin|components|pages)\/[^"]+\.(?:jsx|css)"\s*:\s*"[0-9a-f]{40}"/g)];
  assert.ok(matches.length >= 9, 'Missing audited UI file SHAs');
});

test('CMS guards against stale writes and reordering a filtered list', () => {
  const repository = read('src/lib/contentRepository.js');
  const manager = read('src/admin/ContentManager.jsx');
  assert.match(repository, /assertCurrentRevision\(existing, expectedUpdatedAt\)/);
  assert.match(repository, /transaction\.update\(ref, payload\)/);
  assert.match(repository, /transaction\.delete\(ref\)/);
  assert.match(manager, /const canReorder = status === 'all'/);
  assert.match(manager, /draggable=\{canReorder\}/);
  assert.match(manager, /aria-label=\{`Move \$\{item\.title/);
  assert.match(manager, /expectedUpdatedAt: editingRevision/);
});

test('stable public CMS URLs keep legacy title links working', () => {
  const news = read('src/components/NewsSection.jsx');
  const events = read('src/components/EventsSection.jsx');
  const updates = read('src/pages/Updates.jsx');
  const detail = read('src/pages/EventDetail.jsx');
  assert.match(news, /encodeURIComponent\(post\.id\)/);
  assert.match(events, /encodeURIComponent\(eventItem\.id\)/);
  assert.match(updates, /encodeURIComponent\(item\.id\) === titleSlug/);
  assert.match(detail, /encodeURIComponent\(item\.id\) === titleSlug/);
});

test('unknown routes and reduced motion are handled', () => {
  const entry = read('src/main.jsx');
  const hero = read('src/components/HeroSection.jsx');
  assert.match(entry, /<NotFoundPage \/>/);
  assert.match(hero, /prefers-reduced-motion: reduce/);
  assert.match(read('src/pages/NotFoundPage.jsx'), /Page not found/);
});

test('calendar exposes individual accessible events, keyboard modal and dialogs', () => {
  const page = read('src/pages/EventsPage.jsx');
  assert.match(page, /href=\{\`\/events\/\$\{encodeURIComponent\(ev.id\)\}\`\}/);
  assert.match(page, /aria-label=\{\`View \$\{ev.title\}/);
  assert.match(page, /role="dialog"/);
  assert.match(page, /aria-modal="true"/);
  assert.match(page, /event.key === 'Escape'/);
});
test('routes are split into asynchronous modules and share route data', () => {
  const main = read('src/main.jsx');
  assert.match(main, /lazy\(\(\) => import\('\.\/admin\/AdminApp\.jsx'\)\)/);
  assert.match(main, /<Suspense fallback=/);
  assert.match(main, /pages\/lifePageData\.js/);
});

test('admin form fields have explicit labels and content ordering checks revisions', () => {
  const manager = read('src/admin/ContentManager.jsx');
  const repository = read('src/lib/contentRepository.js');
  assert.match(manager, /htmlFor=\{\`admin-field-\$\{kind\}-\$\{field.key\}\`\}/);
  assert.match(manager, /id=\{\`admin-field-\$\{kind\}-\$\{field.key\}\`\}/);
  assert.match(manager, /expectedUpdatedAtById/);
  assert.match(repository, /getDocsFromServer\(records\(\)\)/);
  assert.match(repository, /transaction\.get\(ref\)/);
  assert.match(repository, /assertCurrentRevision\(snapshot, expectedUpdatedAtById\[orderedIds\[index\]\]\)/);
});

test('news cards use semantic links and both scrolling layers respect reduced-motion', () => {
  const news = read('src/components/NewsSection.jsx');
  const main = read('src/main.jsx');
  const home = read('src/App.jsx');
  assert.match(news, /href=\{\`\/updates\/\$\{encodeURIComponent\(post\.id\)\}\`\}/);
  assert.doesNotMatch(news, /role="article"/);
  assert.match(main, /prefers-reduced-motion: reduce/);
  assert.match(home, /prefers-reduced-motion: reduce/);
});

test('initial entry and shared chunk budgets are both enforced', () => {
  const source = read('scripts/check-bundle-budget.mjs');
  assert.match(source, /300 \* 1024/);
  assert.match(source, /800 \* 1024/);
  assert.match(source, /Largest route-shared JavaScript chunk/);
});
