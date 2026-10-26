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

test('admin sidebar exposes the existing CMS Pages manager without a new UI design', () => {
  const dashboard = read('src/admin/AdminDashboard.jsx');
  const manager = read('src/admin/ContentManager.jsx');
  assert.match(dashboard, /id: 'pages'/);
  assert.match(dashboard, /label: 'Website Pages'/);
  assert.match(manager, /pages: \{/);
  assert.match(dashboard, /<ContentManager key=\{selectedSection/);
});
