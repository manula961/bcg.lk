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
  { label: 'home-desktop', route: '/', width: 1440, height: 900 },
  { label: 'events-mobile', route: '/events', width: 390, height: 844 },
  { label: 'admin-mobile', route: '/admin', width: 390, height: 844 },
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
      await page.waitForTimeout(1800);
      const pageContent = await page.locator('#root').innerText();
      assert.ok(pageContent.trim().length > 10, route.label + ' renders meaningful content');
      if (route.label === 'unknown-route') assert.match(pageContent, /Page not found/);
      if (route.label.startsWith('home-')) {
        assert.match(pageContent, /BANDARANAYAKE COLLEGE/);
        const opacity = await page.locator('.hero-fade-init').first().evaluate(el => getComputedStyle(el).opacity);
        assert.equal(opacity, '1', 'reduced motion must keep hero content visible');
      }
      assert.deepEqual(exceptions, [], route.label + ' browser exceptions: ' + exceptions.join('; '));
      const overflow = await page.evaluate(() => ({
        width: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      if (overflow.scrollWidth > overflow.width + 2) {
        console.warn(route.label + ': potential horizontal overflow ' + JSON.stringify(overflow));
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
