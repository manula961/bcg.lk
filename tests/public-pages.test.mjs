import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('published CMS route is isolated from all existing homepage and admin routes',()=>{
 const entry=read('src/main.jsx');
 assert.match(entry,/pageMatch = window\.location\.pathname\.match/);
 assert.match(entry,/pageSlug \? <PublishedContentPage slug=\{pageSlug\} \/> : <App \/>/);
 assert.match(entry,/isAdminPath \? <AdminApp \/>/);
 assert.match(entry,/lifeSlug \? <LifeDetailPage slug=\{lifeSlug\} \/>/);
});

test('published page uses existing MenuBar and Footer and never renders raw CMS HTML',()=>{
 const component=read('src/pages/PublishedContentPage.jsx');
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
