import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const baseUrl = 'http://127.0.0.1:4173';
const out = 'artifacts/browser';
mkdirSync(out, { recursive: true });
const routes = [
  { label: 'home-320', route: '/', width: 320, height: 800 },
  { label: 'home-390', route: '/', width: 390, height: 844 },
  { label: 'home-tablet', route: '/', width: 768, height: 1024 },
  { label: 'home-laptop', route: '/', width: 1024, height: 768 },
  { label: 'home-news-anchor-390', route: '/#news', width: 390, height: 844 },
  { label: 'home-desktop', route: '/', width: 1440, height: 900 },
  { label: 'events-mobile', route: '/events', width: 390, height: 844 },
  { label: 'events-narrow', route: '/events', width: 320, height: 760 },
  { label: 'past-papers-mobile', route: '/past-papers', width: 390, height: 844 },
  { label: 'past-papers-narrow', route: '/past-papers', width: 320, height: 760 },
  { label: 'sports-life-mobile', route: '/life/sports-societies', width: 390, height: 844 },
  { label: 'leadership-life-mobile', route: '/life/leadership', width: 390, height: 844 },
  { label: 'about-us-mobile', route: '/about-us', width: 390, height: 844 },
  { label: 'admin-mobile', route: '/admin', width: 390, height: 844 },
  { label: 'admin-narrow', route: '/admin', width: 320, height: 760 },
  { label: 'unknown-route', route: '/does-not-exist', width: 390, height: 844 },
];
const browser = await chromium.launch({ headless: true });
let failures = 0;
try {
  for (const route of routes) {
    const page = await browser.newPage({
      viewport: { width: route.width, height: route.height },
      reducedMotion: 'reduce',
    });
    const exceptions = [];
    page.on('pageerror', error => exceptions.push(error.message));
    try {
      const response = await page.goto(baseUrl + route.route, { waitUntil: 'domcontentloaded', timeout: 30000 });
      assert.equal(response?.status(), 200, route.label + ' must serve HTML');
      // Route chunks and the intentional homepage loading sequence can take
      // longer on shared CI runners. Wait for a real page instead of sleeping
      // for a fixed 1.8s; keep a strict timeout so regressions still fail.
      await page.waitForFunction(
        () => (document.querySelector('#root')?.innerText || '').trim().length > 10,
        null,
        { timeout: 15000 },
      );
      if (route.label.startsWith('home-')) {
        await page.waitForFunction(
          () => (document.querySelector('#root')?.innerText || '').includes('BANDARANAYAKE COLLEGE'),
          null,
          { timeout: 15000 },
        );
      }
      const pageContent = await page.locator('#root').innerText();
      assert.ok(pageContent.trim().length > 10, route.label + ' renders meaningful content');
      if (route.label === 'unknown-route') assert.match(pageContent, /Page not found/);
      if (route.label.startsWith('home-')) {
        assert.match(pageContent, /BANDARANAYAKE COLLEGE/);
        const opacity = await page.locator('.hero-fade-init').first().evaluate(el => getComputedStyle(el).opacity);
        assert.equal(opacity, '1', 'reduced motion must keep hero content visible');
      }
      if (route.label === 'home-news-anchor-390') {
        await page.waitForFunction(() => {
          const section = document.getElementById('news');
          return section && window.scrollY > 150 &&
            Math.abs(section.getBoundingClientRect().top) < 200;
        }, null, { timeout: 10000 });
        assert.equal(await page.locator('.loading-container').count(), 0,
          'Direct homepage anchors must not show an opening curtain.');
      }
      assert.deepEqual(exceptions, [], route.label + ' browser exceptions: ' + exceptions.join('; '));
      const overflow = await page.evaluate(() => ({
        width: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      if (overflow.scrollWidth > overflow.width + 2) {
        throw new Error(route.label + ': horizontal overflow ' + JSON.stringify(overflow));
      }
      console.log('PASS ' + route.label);
    } catch (error) {
      failures += 1;
      console.error('FAIL ' + route.label + ': ' + error.message);
    } finally {
      await page.screenshot({ path: join(out, route.label + '.png'), fullPage: false }).catch(() => {});
      await page.close();
    }
  }
} finally {
  await browser.close();
}
if (failures) process.exitCode = 1;
