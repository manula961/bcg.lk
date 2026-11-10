import { chromium } from 'playwright';
import axe from 'axe-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const base = process.env.BCG_ACCESSIBILITY_BASE || 'http://127.0.0.1:4173';
const origin = new URL(base);
if (!['http:', 'https:'].includes(origin.protocol)) throw Error('Only HTTP(S) page tests are allowed.');
const locations = [
  ['home','/'],['events','/events'],['past-papers','/past-papers'],['admin','/admin']
];
const viewports = [['mobile',390,844],['desktop',1440,900]];
mkdirSync('artifacts/accessibility',{recursive:true});
const browser = await chromium.launch({headless:true});
let failures = 0;
try {
  for (const [name,route] of locations) for (const [view,width,height] of viewports) {
    const page = await browser.newPage({viewport:{width,height}, reducedMotion:'reduce'});
    const label = name+'-'+view;
    try {
      const res = await page.goto(new URL(route,origin).toString(),{waitUntil:'domcontentloaded',timeout:30000});
      assert.equal(res?.status(),200,label+' must load');
      await page.waitForFunction(() => (document.querySelector('#root')?.innerText||'').trim().length>10,
        null,{timeout:20000});
      await page.addScriptTag({content:axe.source});
      const results = await page.evaluate(async () => window.axe.run(document, {
        runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']},
      }));
      const violations = results.violations.map(v=>({
        id:v.id,impact:v.impact,description:v.description,
        selectors:v.nodes.slice(0,8).map(n=>n.target.join(' ')),
      }));
      writeFileSync('artifacts/accessibility/'+label+'.json', JSON.stringify({
        label, testedAt:new Date().toISOString(), violations,
        incomplete:results.incomplete.map(v=>v.id),
        passes:results.passes.length,
      },null,2));
      if (violations.length) {
        failures++;
        console.error('FAIL accessibility '+label+' '+JSON.stringify(violations).slice(0,5000));
      } else console.log('PASS automated WCAG 2.0/2.1 A+AA '+label);
      // Preview has no Firebase credentials by design, so /admin may show
      // its accessible configuration alert rather than a login form.
      const keyboard = await page.evaluate(() => ({
        interactive: [...document.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])')]
          .filter(el => el.getClientRects().length && getComputedStyle(el).visibility!=='hidden').length,
        configAlert: !!document.querySelector('main[role="alert"]'),
      }));
      if (keyboard.interactive===0) {
        assert.equal(keyboard.configAlert,true,label+' has no keyboard targets and must expose an alert');
        console.log('NOT APPLICABLE keyboard focus '+label+': Firebase preview configuration alert; test login separately in staging');
      } else {
        let focused = false;
        for (let attempt=0;attempt<5;attempt++) {
          await page.keyboard.press('Tab');
          focused = await page.evaluate(() => {
            const el=document.activeElement;
            return !!el && !['BODY','HTML'].includes(el.tagName) && el.getClientRects().length>0;
          });
          if(focused)break;
        }
        if(!focused) {
          failures++;
          console.error('FAIL keyboard tab focus '+label+': focus did not reach a visible element');
        }
      }
    } catch(e) {
      failures++;
      console.error('FAIL a11y '+label+': '+e.message);
    } finally {await page.close();}
  }
} finally {await browser.close();}
if (failures) {
  console.error('Accessibility gate failed '+failures+' check(s); do not auto-approve exceptions.');
  process.exitCode=1;
}
