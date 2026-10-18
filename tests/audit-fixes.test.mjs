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
