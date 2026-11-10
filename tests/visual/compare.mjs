import { chromium } from 'playwright';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const baseline = process.env.VISUAL_BASELINE_URL;
const candidate = process.env.VISUAL_CANDIDATE_URL;
if (!baseline || !candidate) {
  console.error('Provide VISUAL_BASELINE_URL and VISUAL_CANDIDATE_URL. No automatic snapshot approval.');
  process.exit(2);
}
const target = new URL(candidate);
const source = new URL(baseline);
if (!['http:', 'https:'].includes(target.protocol) || !['http:', 'https:'].includes(source.protocol)) {
  throw new Error('Visual comparison URLs must be HTTP(S).');
}
const output = 'artifacts/visual';
mkdirSync(output, { recursive: true });
const cases = [
  { name: 'desktop-home', path: '/', width: 1440, height: 900 },
  { name: 'mobile-home', path: '/', width: 390, height: 844 },
  { name: 'desktop-admin', path: '/admin', width: 1440, height: 900 },
  { name: 'mobile-admin', path: '/admin', width: 390, height: 844 },
  { name: 'desktop-events', path: '/events', width: 1440, height: 900 },
  { name: 'mobile-events', path: '/events', width: 390, height: 844 },
  { name: 'mobile-sports-societies', path: '/life/sports-societies', width: 390, height: 844 },
  { name: 'desktop-sports-societies', path: '/life/sports-societies', width: 1440, height: 900 },
  { name: 'mobile-leadership', path: '/life/leadership', width: 390, height: 844 },
  { name: 'mobile-about-us', path: '/about-us', width: 390, height: 844 },
];
const threshold = Number(process.env.VISUAL_MAX_DIFFERENCE ?? '0.005');
if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) throw new Error('Invalid VISUAL_MAX_DIFFERENCE');
const browser = await chromium.launch({ headless: true });
let failed = 0;
try {
  for (const item of cases) {
    const page = await browser.newPage({
      viewport: { width: item.width, height: item.height },
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
      colorScheme: 'light',
    });
    async function capture(base, label) {
      const url = new URL(item.path, base).toString();
      // The homepage contains long-lived/third-party requests, so networkidle
      // can hang even though the React app is ready. Use bounded app/asset
      // readiness instead; screenshots and pixel thresholds remain mandatory.
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      if (!response || !response.ok()) throw new Error(label + ' not accessible: ' + url + ' HTTP ' + response?.status());
      await page.locator('#root').waitFor({ state: 'visible', timeout: 15000 });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(1500);
      const png = await page.screenshot({ animations: 'disabled', caret: 'hide', fullPage: false });
      writeFileSync(join(output, item.name + '-' + label + '.png'), png);
      return PNG.sync.read(png);
    }
    try {
      const before = await capture(baseline, 'baseline');
      const after = await capture(candidate, 'candidate');
      if (before.width !== after.width || before.height !== after.height) throw new Error('Viewport mismatch');
      const diff = new PNG({ width: before.width, height: before.height });
      const count = pixelmatch(before.data, after.data, diff.data, before.width, before.height, { threshold: 0.1 });
      writeFileSync(join(output, item.name + '-diff.png'), PNG.sync.write(diff));
      const fraction = count / (before.width * before.height);
      console.log(item.name + ': ' + (fraction * 100).toFixed(3) + '% different');
      if (fraction > threshold) failed++;
    } catch (error) {
      console.error(item.name + ': ' + error.message);
      failed++;
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}
if (failed) {
  console.error(failed + ' visual cases failed. Review screenshots; never auto-approve visual changes.');
  process.exitCode = 1;
} else {
  console.log('Visual comparisons passed for public and admin routes, desktop and mobile.');
}
