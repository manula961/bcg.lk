import { chromium } from 'playwright';
import assert from 'node:assert/strict';

/**
 * Local browser accessibility checks. Automated smoke is not a substitute for
 * an independent screen-reader / WCAG audit of the deployed website.
 * No UI changes, network writes, credentials or Firebase production access.
 */
const origin = process.env.BCG_A11Y_ORIGIN || 'http://127.0.0.1:4173';
const target = new URL(origin);
if (!['http:', 'https:'].includes(target.protocol)) throw new Error('Invalid accessibility audit origin');
if (target.hostname !== '127.0.0.1' && target.hostname !== 'localhost')
  throw new Error('Only local disposable preview targets are allowed by this CI audit');
const cases = [
  {path:'/',width:390,height:844},
  {path:'/',width:1440,height:900},
  {path:'/events',width:390,height:844},
  {path:'/past-papers',width:390,height:844},
  {path:'/admin',width:390,height:844},
];
const browser = await chromium.launch({headless:true});
try {
  for (const item of cases) {
    const page = await browser.newPage({viewport:{width:item.width,height:item.height},reducedMotion:'reduce'});
    try {
      const response = await page.goto(new URL(item.path, origin), {waitUntil:'domcontentloaded',timeout:30000});
      assert.equal(response?.status(), 200, item.path + ' HTTP status');
      await page.waitForFunction(() => (document.querySelector('#root')?.innerText || '').trim().length > 10,
        null, {timeout:20000});
      const found = await page.evaluate(() => {
        const visible = el => {
          const style = getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          return style.visibility !== 'hidden' && style.display !== 'none' &&
            Number(style.opacity) !== 0 && rect.width > 0 && rect.height > 0;
        };
        const accessibleLabel = el => Boolean(
          el.getAttribute('aria-label')?.trim() ||
          el.getAttribute('aria-labelledby')?.trim() ||
          el.innerText?.trim() ||
          el.getAttribute('title')?.trim() ||
          (el instanceof HTMLInputElement && el.value?.trim())
        );
        const issues = [];
        if (document.documentElement.lang !== 'en') issues.push('missing English language');
        if (document.querySelectorAll('main').length < 1) issues.push('missing main landmark');
        if (!document.title || document.title.trim().length < 5) issues.push('missing page title');
        for (const el of document.querySelectorAll('button, [role="button"]')) {
          if (visible(el) && !accessibleLabel(el)) issues.push('unnamed interactive button');
        }
        for (const img of document.querySelectorAll('img')) {
          if (visible(img) && !img.hasAttribute('alt')) issues.push('image missing alt attribute');
        }
        for (const iframe of document.querySelectorAll('iframe')) {
          if (visible(iframe) && !iframe.getAttribute('title')) issues.push('iframe missing title');
        }
        for (const a of document.querySelectorAll('a[href]')) {
          if (visible(a) && !accessibleLabel(a) && !a.querySelector('img[alt]'))
            issues.push('unnamed interactive link');
        }
        return [...new Set(issues)];
      });
      assert.deepEqual(found, [], item.path + ' at ' + item.width + 'px: ' + found.join(', '));
      console.log('PASS accessibility semantics', item.path, item.width);
    } finally { await page.close(); }
  }
} finally { await browser.close(); }
