import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('public CMS subscriptions restrict queries to published content', () => {
  const repository = source('src/lib/contentRepository.js');
  assert.match(repository, /where\('published',\s*'==',\s*true\)/);
  assert.match(repository, /subscribePublished[\s\S]*?onSnapshot\(publishedQuery\(\)/);
  assert.match(repository, /listPublished[\s\S]*?getDocs\(publishedQuery\(\)/);
});

test('active CMS services expose their public and admin operations', () => {
  for (const [name, singular] of [['news', 'News'], ['events', 'Event'], ['pages', 'Page'], ['societies', 'Society'], ['sports', 'Sport'], ['leadership', 'Leader']]) {
    const service = source('src/lib/' + name + 'Service.js');
    assert.match(service, new RegExp("createContentRepository\\('" + name + "'"));
    for (const action of ['create', 'update', 'delete']) {
      assert.ok(service.includes('export const ' + action + singular), name + ': ' + action);
    }
    assert.ok(service.includes('subscribePublished'), name + ': public subscription');
    assert.ok(service.includes('subscribeAdmin'), name + ': admin subscription');
  }
});

test('admin console verifies the role before displaying the dashboard', () => {
  const app = source('src/admin/AdminApp.jsx');
  assert.match(app, /getDocFromServer\(doc\(db,\s*'admins',\s*user\.uid\)\)/);
  assert.match(app, /record\.exists\(\)\s*&&\s*isConsoleRole\(record\.data\(\)\?\.role\)/);
  assert.match(app, /onSnapshot\(doc\(db, 'admins', user\.uid\)/);
  assert.match(app, /session\.status\s*===\s*'authorized'/);
});

test('admin CMS uses the shared services for active collections', () => {
  const manager = source('src/admin/ContentManager.jsx');
  for (const type of ['News', 'Events', 'Pages', 'Societies', 'Sports', 'Leadership']) {
    assert.ok(manager.includes("from '../lib/" + type.toLowerCase() + "Service'"));
  }
  assert.match(manager, /subscribeAdminNews/);
  assert.match(manager, /subscribeAdminEvents/);
  assert.match(manager, /subscribeAdminPages/);
  assert.match(manager, /subscribeAdminSocieties/);
  assert.match(manager, /subscribeAdminSports/);
  assert.match(manager, /subscribeAdminLeadership/);
  assert.doesNotMatch(manager, /subscribeAdminExtracurricular|extracurricularService/);
});

test('page IDs remain stable slugs and content writes include server timestamps', () => {
  const pages = source('src/lib/pagesService.js');
  const repository = source('src/lib/contentRepository.js');
  assert.match(pages, /idField:\s*'slug'/);
  assert.match(repository, /runTransaction\(/);
  assert.match(repository, /createdAt:\s*serverTimestamp\(\)/);
  assert.match(repository, /updatedAt:\s*serverTimestamp\(\)/);
});

test('Firebase client credentials come only from Vite environment variables', () => {
  const config = source('src/lib/firebase.js');
  assert.match(config, /Object\.values\(config\)\.every\(Boolean\)/);
  assert.doesNotMatch(config, /serviceAccount|private_key|BEGIN PRIVATE KEY/);
});
