import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('CMS Pages navigation and editor use existing role-controlled services', () => {
  assert.match(read('src/admin/AdminDashboard.jsx'), /id: 'pages'/);
  const manager = read('src/admin/ContentManager.jsx');
  assert.match(manager, /subscribeAdminPages, createPage, updatePage/);
  assert.match(manager, /pages: \{/);
  assert.match(manager, /slug:'', title:'', body:''/);
});
test('CMS archive state is retrieved in one authenticated request and edits fail closed', () => {
  const manager = read('src/admin/ContentManager.jsx');
  const client = read('src/lib/cmsWorkflowClient.js');
  const server = read('api/_lib/cms-workflow.mjs');
  assert.match(manager, /getArchivedRecordIds\(kind\)/);
  assert.match(manager, /!archivesReady/);
  assert.match(manager, /Restore archived content before editing/);
  assert.match(client, /getArchivedRecordIds/);
  assert.match(server, /action === 'trashList'/);
  assert.match(server, /requireRole\(actor\.role, new Set\(ROLES\)\)/);
  assert.match(read('src/lib/contentRepository.js'), /Direct deletion is disabled/);
});
test('admin and public flows honor user interaction and recovery', () => {
  assert.match(read('src/admin/AdminDashboard.jsx'), /Discard unsaved changes and sign out/);
  assert.match(read('src/admin/ContentManager.jsx'), /onDragEnd=/);
  const explore = read('src/components/home/ExploreSection.jsx');
  assert.match(explore, /interactionPaused \|\| hoverPaused/);
  assert.match(explore, /onFocusCapture=/);
  assert.match(read('src/pages/events/EventsPage.jsx'), /setTooltipPosition/);
  assert.match(read('src/pages/events/EventsPage.css'), /max-height: calc\(100dvh - 40px\)/);
  const papers = read('src/pages/academics/PastPapersPage.jsx');
  assert.match(papers, /setRetryPapers\(value => value \+ 1\)/);
  assert.match(papers, /\[retryPapers\]/);
});
test('public UI uses stable local crest and safe date/heading fallbacks', () => {
  for (const file of [
    'src/components/home/HeroSection.jsx',
    'src/components/layout/Footer.jsx',
    'src/components/layout/LoadingAnimation.jsx',
  ]) {
    assert.match(read(file), /\/email-assets\/school-logo\.png/);
    assert.doesNotMatch(read(file), /i\.ibb\.co/);
  }
  assert.match(read('src/components/home/HeroSection.jsx'), /whitespace-normal sm:whitespace-nowrap/);
  const events = read('src/components/home/EventsSection.jsx');
  assert.match(events, /aDate\.localeCompare\(bDate\)/);
  assert.match(events, /bDate\.localeCompare\(aDate\)/);
});

test('all published transitions and live-content edits are handled by the protected workflow API', () => {
  const rules = read('firestore.rules');
  assert.match(rules, /request\.resource\.data\.published == false/);
  assert.match(rules, /resource\.data\.published == false && request\.resource\.data\.published == false/);
  const manager = read('src/admin/ContentManager.jsx');
  assert.match(manager, /performEditorialAction\(kind, editingId, 'proposeEdit'/);
  assert.match(manager, /getEditorialStatus\(kind, item\.id\)/);
  assert.match(manager, /performEditorialAction\(kind, item\.id, action\)/);
  assert.doesNotMatch(manager, /onChange=\{\(e\) => updateField\('published', e\.target\.checked\)\}/);
  const server = read('api/_lib/cms-workflow.mjs');
  assert.match(server, /act === 'unpublish'/);
  assert.match(server, /'before-unpublish'/);
});
