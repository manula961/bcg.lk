import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';

// End-to-end writes must stay inside disposable local Firebase emulators.
if (process.env.BCG_STAGING_MODE === 'true' ||
    process.env.VITE_USE_FIREBASE_EMULATORS === 'false') {
  throw new Error('Cloud Firebase E2E mode is disabled. Use local Firebase emulators.');
}
for (const key of ['FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST', 'FIREBASE_STORAGE_EMULATOR_HOST']) {
  if (!process.env[key]) throw new Error(key + ' is required for isolated admin E2E.');
}
const project = 'demo-bcg-e2e';
const email = 'automation-admin@example.test';
const password = 'test-only-passphrase-123';
const uidPrefix = 'audit-' + Date.now().toString(36);
const newsTitle = uidPrefix + ' CMS test';
const base = 'http://127.0.0.1:4175';
const env = {
  ...process.env,
  VITE_FIREBASE_API_KEY: 'fake-web-api-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'demo-bcg-e2e.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: project,
  VITE_FIREBASE_STORAGE_BUCKET: 'demo-bcg-e2e.appspot.com',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '1234567890',
  VITE_FIREBASE_APP_ID: '1:1234567890:web:e2e',
  VITE_USE_FIREBASE_EMULATORS: 'true',
};

async function json(url, options) {
  const res = await fetch(url, options);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error('Emulator fixture setup failed: ' + res.status + ': ' + JSON.stringify(body));
  return body;
}
const identity = await json('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-web-api-key', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  await json('http://127.0.0.1:8080/v1/projects/demo-bcg-e2e/databases/(default)/documents/admins?documentId=' +
    encodeURIComponent(identity.localId), {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({ fields: { role: { stringValue: 'admin' } } }),
  });
  const today = new Date().toISOString().slice(0, 10);
  for (const [id, title] of [['first', 'Audit Event One'], ['second', 'Audit Event Two']]) {
    await json('http://127.0.0.1:8080/v1/projects/demo-bcg-e2e/databases/(default)/documents/events?documentId=' + id, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
      body: JSON.stringify({ fields: {
        title: { stringValue: title },
        description: { stringValue: 'Calendar keyboard and multi-event coverage' },
        eventDate: { stringValue: today },
        location: { stringValue: 'Test hall' },
        published: { booleanValue: true },
      } }),
    });
  }
await json('http://127.0.0.1:8080/v1/projects/demo-bcg-e2e/databases/(default)/documents/sports?documentId=audit-sport', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
  body: JSON.stringify({ fields: {
    title: { stringValue: 'Audit Sport One' },
    description: { stringValue: 'Published team used for an isolated directory regression test' },
    achievements: { stringValue: 'Sample achievement' },
    published: { booleanValue: true },
  } }),
});
for (const [collection, id, fields] of [
  ['societies', 'audit-society', {
    title: { stringValue: 'Audit Society One' },
    description: { stringValue: 'Published society used for isolated directory testing' },
    published: { booleanValue: true },
  }],
  ['leadership', 'audit-leader', {
    title: { stringValue: 'Audit Leader One' },
    role: { stringValue: 'Principal' },
    published: { booleanValue: true },
  }],
]) {
  await json('http://127.0.0.1:8080/v1/projects/demo-bcg-e2e/databases/(default)/documents/' +
    collection + '?documentId=' + id, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({ fields }),
  });
}
const server = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '4175', '--strictPort'], {
  env, stdio: ['ignore', 'pipe', 'pipe'], detached: process.platform !== 'win32',
});
let serverLog = '';
server.stdout.on('data', data => { serverLog += data.toString().slice(-500); });
server.stderr.on('data', data => { serverLog += data.toString().slice(-500); });
let browser;
let context;
let page;
const output = 'artifacts/browser';
mkdirSync(output, { recursive: true });
try {
  let ready = false;
  for (let i = 0; i < 45; i++) {
    if (server.exitCode !== null) throw new Error('Preview process stopped: ' + serverLog);
    try {
      const result = await fetch(base + '/admin');
      if (result.ok) { ready = true; break; }
    } catch {}
    await delay(400);
  }
  if (!ready) throw new Error('Preview not ready: ' + serverLog);
  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({ viewport: { width: 1200, height: 820 } });
  page = await context.newPage();
  const failures = [];
  page.on('pageerror', error => failures.push(error.message));
  page.on('dialog', dialog => dialog.accept());
  await page.goto(base + '/admin');
  await page.getByLabel('Email Address').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.getByRole('heading', { name: 'News', exact: true }).waitFor({ timeout: 20000 });
  {
    const calendar = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await calendar.goto(base + '/events');
    const today = new Date().toISOString().slice(0, 10);
    const second = calendar.getByRole('button', { name: 'View Audit Event Two on ' + today });
    await second.waitFor({ timeout: 15000 });
    await calendar.getByRole('button', { name: 'View Audit Event One on ' + today }).waitFor();
    await second.click();
    await calendar.getByRole('dialog', { name: 'Audit Event Two' }).waitFor();
    await calendar.keyboard.press('Escape');
    await calendar.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.equal(await second.evaluate(el => document.activeElement === el), true, 'Closing the modal restores trigger focus.');
    await calendar.close();
    console.log('PASS multiple accessible calendar events and Escape/focus restoration');
  }

  const sportsPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await sportsPage.goto(base + '/life/sports-societies');
  await sportsPage.getByRole('heading', { name: 'School Sports', exact: true }).waitFor({ timeout: 15000 });
  await sportsPage.getByText('Audit Sport One').waitFor({ timeout: 15000 });
  await sportsPage.getByText('Audit Society One').waitFor({ timeout: 15000 });
  // Keep the published Societies and Sports directories in their approved order.
  const directoryHeadings = await sportsPage.locator('.life-detail-section-heading h2').allTextContents();
  const societiesIndex = directoryHeadings.findIndex(text => /Societ/i.test(text));
  const sportsIndex = directoryHeadings.findIndex(text => text.trim() === 'School Sports');
  assert.ok(societiesIndex >= 0 && societiesIndex < sportsIndex,
    'Societies and Sports must appear in that order.');
  assert.ok(directoryHeadings.every(text => !/Extracurricular/i.test(text)),
    'Retired Extracurricular directory must not appear.');
  await sportsPage.goto(base + '/life/leadership');
  await sportsPage.getByText('Audit Leader One').waitFor({ timeout: 15000 });
  await sportsPage.close();
  console.log('PASS published Sports documents render on the public directory');

  await page.getByRole('button', { name: /New article/i }).click();
  await page.getByPlaceholder('Enter headline').fill(newsTitle);
  await page.getByRole('textbox', { name: /Short summary/i }).fill('This item verifies publishing with nonproduction Firebase.');
  await page.getByRole('button', { name: /Create article/i }).click();
  await page.getByText('Saved successfully.').waitFor({ timeout: 15000 });
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await page.getByText('Published live.').waitFor({ timeout: 15000 });
  await page.screenshot({ path: output + '/admin-authenticated.png' });
  const publicHome = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await publicHome.addInitScript(() => sessionStorage.setItem('skipLoading', 'true'));
  await publicHome.goto(base + '/');
  const newsLink = publicHome.getByRole('link', { name: 'Read ' + newsTitle });
  await newsLink.waitFor({ timeout: 20000 });
  assert.ok((await newsLink.getAttribute('href')).startsWith('/updates/'));
  await newsLink.click();
  await publicHome.getByRole('heading', { name: newsTitle }).waitFor({ timeout: 15000 });
  await publicHome.close();
  console.log('PASS published news appear as accessible homepage links');

  // Two independent editor sessions must not silently overwrite one another.
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  const otherContext = await browser.newContext({ viewport: { width: 1200, height: 820 } });
  const otherPage = await otherContext.newPage();
  otherPage.on('dialog', dialog => dialog.accept());
  await otherPage.goto(base + '/admin');
  await otherPage.getByLabel('Email Address').fill(email);
  await otherPage.getByLabel('Password').fill(password);
  await otherPage.getByRole('button', { name: 'Sign In' }).click();
  await otherPage.getByRole('heading', { name: 'News', exact: true }).waitFor({ timeout: 20000 });
  await otherPage.getByRole('button', { name: 'Edit', exact: true }).click();
  await otherPage.getByPlaceholder('Enter headline').fill(newsTitle + ' updated');
  await otherPage.getByRole('button', { name: 'Save Changes' }).click();
  await otherPage.getByText('Saved successfully.').waitFor({ timeout: 15000 });
  await page.getByPlaceholder('Enter headline').fill(newsTitle + ' stale');
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await page.getByText(/changed since you opened it/).waitFor({ timeout: 15000 });

  await otherPage.getByRole('button', { name: 'Delete', exact: true }).click();
  await otherPage.getByText('Deleted successfully.').waitFor({ timeout: 15000 });
  await otherContext.close();
  assert.deepEqual(failures, [], 'Browser exceptions in authenticated CMS');
  console.log('PASS authenticated administrator login, draft, publish, stale edit rejection, delete');

  // Exercise real RBAC controls and live revocation in the disposable Firebase
  // Auth/Firestore emulators. This never touches production users or content.
  const ownerEmail = 'automation-owner@example.test';
  const ownerIdentity = await json('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-web-api-key', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ownerEmail, password, returnSecureToken: true }),
  });
  await json('http://127.0.0.1:8080/v1/projects/demo-bcg-e2e/databases/(default)/documents/admins?documentId=' +
    encodeURIComponent(ownerIdentity.localId), {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({ fields: { role: { stringValue: 'super_admin' } } }),
  });
  const ownerContext = await browser.newContext({ viewport: { width: 1200, height: 820 } });
  const ownerPage = await ownerContext.newPage();
  ownerPage.on('dialog', dialog => dialog.accept());
  const ownerErrors = [];
  ownerPage.on('pageerror', error => ownerErrors.push(error.message));
  try {
    await ownerPage.goto(base + '/admin');
    await ownerPage.getByLabel('Email Address').fill(ownerEmail);
    await ownerPage.getByLabel('Password').fill(password);
    await ownerPage.getByRole('button', { name: 'Sign In' }).click();
    await ownerPage.getByRole('button', { name: /Users & Roles/ }).waitFor({ timeout: 15000 });
    await ownerPage.getByRole('button', { name: /Users & Roles/ }).click();
    await ownerPage.getByRole('heading', { name: 'Role-Based Access Control' }).waitFor();

    await ownerPage.getByLabel('Existing Firebase user UID').fill(identity.localId);
    await ownerPage.getByLabel('Assign role').selectOption('editor');
    await ownerPage.getByRole('button', { name: 'Assign Role' }).click();
    await ownerPage.getByText(/Role saved\. Permission changes/).waitFor({ timeout: 15000 });

    await page.waitForFunction(
      () => document.querySelector('.admin-user-email')?.textContent?.includes('Editor'),
      null, { timeout: 15000 },
    );
    assert.equal(await page.getByRole('button', { name: /Users & Roles/ }).count(), 0,
      'Editors must not see privileged role management');
    await page.getByRole('button', { name: /New article/ }).click();
    assert.equal(await page.getByRole('checkbox', { name: 'Published' }).count(), 0,
      'Editors must not have a Publish checkbox');
    await page.getByRole('button', { name: 'Cancel', exact: true }).first().click();

    const accountRow = ownerPage.locator('.admin-row').filter({ hasText: identity.localId });
    await accountRow.getByRole('button', { name: 'Revoke' }).click();
    await page.getByText('Your console access has been removed.').waitFor({ timeout: 15000 });
    assert.deepEqual(ownerErrors, [], 'Browser exceptions while using super-admin role controls');
    console.log('PASS super-admin grants editor role, UI hides publish, and live revocation removes console access');
  } finally {
    await ownerContext.close();
  }
} finally {
  if (page) await page.screenshot({ path: output + '/admin-e2e-final.png' }).catch(() => {});
  if (context) await context.close().catch(() => {});
  if (browser) await browser.close().catch(() => {});
  // Kill npm and its Vite child after a successful run.
  if (server.pid && process.platform !== 'win32') {
    try { process.kill(-server.pid, 'SIGTERM'); } catch { server.kill('SIGTERM'); }
  } else {
    server.kill('SIGTERM');
  }
  server.stdout.destroy();
  server.stderr.destroy();
}
