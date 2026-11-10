import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Exercise the *actual* repository CSP in Chromium while serving the local
// production-style Vite build. Vite's preview server omits Vercel headers, so
// intercept only document responses and apply Vercel's configured policy.
const conf=JSON.parse(readFileSync(new URL('../../vercel.json',import.meta.url),'utf8'));
const csp=conf.headers.flatMap(x=>x.headers).find(x=>x.key==='Content-Security-Policy')?.value;
assert.ok(csp?.includes('www.googletagmanager.com'),'GTM must be authorized in script-src');
assert.ok(!/script-src[^;]*'unsafe-inline'/.test(csp),'No broad unsafe-inline CSP exemption');
const base='http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true});
try {
  const page=await browser.newPage({reducedMotion:'reduce'});
  const requests=[];
  page.on('request',r=>{if(r.url().startsWith('https://www.googletagmanager.com/gtm.js?id=GTM-KMGG36L8'))requests.push(r.url())});
  await page.addInitScript(()=>{
    window.__bcgCspViolations=[];
    document.addEventListener('securitypolicyviolation',event=>{
      window.__bcgCspViolations.push({directive:event.effectiveDirective,blockedURI:event.blockedURI});
    });
  });
  await page.route(base+'/**',async route=>{
    if(!route.request().isNavigationRequest())return route.continue();
    const response=await route.fetch();
    return route.fulfill({response,headers:{...response.headers(),'content-security-policy':csp}});
  });
  const response=await page.goto(base+'/',{waitUntil:'domcontentloaded',timeout:30000});
  assert.equal(response?.status(),200);
  await page.waitForFunction(()=>Array.isArray(window.dataLayer)&&
    window.dataLayer.some(x=>x&&x.event==='gtm.js'),null,{timeout:12000});
  await page.waitForTimeout(1200);
  assert.ok(requests.length>=1,'GTM bootstrap must attempt to load external gtm.js under enforced CSP');
  const violations=await page.evaluate(()=>window.__bcgCspViolations||[]);
  const gtmBlocked=violations.filter(v=>
    ['script-src','script-src-elem'].includes(v.directive)&&
    (/googletagmanager/.test(v.blockedURI)||v.blockedURI==='inline'));
  assert.deepEqual(gtmBlocked,[],'GTM bootstrap must not be blocked by the real configured CSP');
  console.log('PASS Chromium GTM bootstrap execution with Vercel CSP applied to local HTML');
  console.log('NOTE this does not verify remote GTM account tags, consent or a live production browser');
}finally{await browser.close();}
