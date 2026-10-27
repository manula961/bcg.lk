import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('published CMS route is isolated from all existing homepage and admin routes',()=>{
 const entry=read('src/main.jsx');
 assert.match(entry,/pageMatch = pathname\.match/);
 assert.match(entry, /(?:else )?if \(pageSlug\) page = /);
 assert.match(entry,/page = <PublishedContentPage slug=\{pageSlug\} \/>/);
 assert.match(entry,/(?:else )?if \(isEventsIndex\) page = /);
 assert.match(entry,/(?:else )?if \(eventsSlug\) page = /);
 assert.match(entry,/(?:else )?if \(updatesSlug\) page = /);
 assert.match(entry,/(?:else )?if \(isAdminPath\) page = /);
 assert.match(entry,/(?:else )?if \(lifeSlug\) page = /);
 assert.match(entry,/page = <LifeDetailPage slug=\{lifeSlug\} \/>/);
});

test('published page uses existing MenuBar and Footer and never renders raw CMS HTML',()=>{
 const component=read('src/pages/content/PublishedContentPage.jsx');
 assert.match(component,/getPublishedPage\(slug\)/);
 assert.match(component,/<MenuBar \/>/);
 assert.match(component,/<Footer \/>/);
 assert.match(component,/Page unavailable/);
 assert.match(component,/page\.seoDescription/);
 assert.doesNotMatch(component,/dangerouslySetInnerHTML|innerHTML/);
});

test('public Pages service fetches only published records',()=>{
 const service=read('src/lib/pagesService.js');
 const repo=read('src/lib/contentRepository.js');
 assert.match(service,/getPublishedPage = pages\.getPublished/);
 assert.match(repo,/snapshot\.data\(\)\.published === true/);
});

test('admin Pages editor is removed without changing public published Pages routes', () => {
  const dashboard = read('src/admin/AdminDashboard.jsx');
  const manager = read('src/admin/ContentManager.jsx');
  const publicRoute = read('src/pages/content/PublishedContentPage.jsx');
  assert.doesNotMatch(dashboard, /id:\s*'pages'/);
  assert.doesNotMatch(dashboard, /label:\s*'Website Pages'/);
  assert.doesNotMatch(manager, /pages:\s*\{/);
  assert.doesNotMatch(manager, /subscribeAdminPages|createPage|updatePage|deletePage|reorderPages/);
  assert.match(dashboard, /<ContentManager key=\{selectedSection/);
  assert.match(publicRoute, /getPublishedPage\(slug\)/);
  // All other admin editors are retained.
  for (const id of ['news','events','societies','sports','leadership','pastPapers']) {
    assert.ok(dashboard.includes("id: '" + id + "'"), id + ' editor missing');
    assert.match(manager, new RegExp('(?:^|\\n)  ' + id + ': \\{'));
  }
});
