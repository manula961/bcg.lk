import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('Google Tag Manager loader is CSP-authorized by an exact content hash, not unsafe-inline', () => {
  const html = read('index.html');
  const config = JSON.parse(read('vercel.json'));
  const globalHeaders = config.headers.find(rule => rule.source === '/(.*)').headers;
  const csp = globalHeaders.find(header => header.key === 'Content-Security-Policy').value;
  const inline = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
    .map(match => match[1]).filter(body => body.trim());
  assert.equal(inline.length, 1, 'Review newly introduced inline scripts instead of silently allowing them');
  const hash = 'sha256-' + createHash('sha256').update(inline[0]).digest('base64');
  const scripts = csp.split(';').map(value => value.trim()).find(value => value.startsWith('script-src '));
  assert.ok(scripts.includes("'" + hash + "'"), 'CSP must hash the actual, byte-exact GTM inline loader');
  assert.ok(scripts.includes('https://www.googletagmanager.com'));
  assert.ok(scripts.includes('https://www.google-analytics.com'));
  assert.ok(!scripts.includes("'unsafe-inline'"));
  assert.ok(csp.includes("object-src 'none'"));
  assert.ok(csp.includes("frame-ancestors 'none'"));
});

test('GA4 page views omit query credentials, never track admin pages, and avoid duplicate views', () => {
  const source = read('src/analytics/ga4.js')
    .replace('const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;', "const measurementId = 'G-TEST123';")
    .replace('export function trackPageView()', 'function trackPageView()') + '\n globalThis.testTrackPageView = trackPageView;';
  const injected = [];
  const browser = {
    location: { pathname: '/events', search: '?email=student@example.com&code=secret', origin: 'https://school.example' },
    dataLayer: null,
  };
  const document = {
    title: 'School events',
    createElement: () => ({}),
    head: { appendChild: node => injected.push(node) },
  };
  const sandbox = { window: browser, document };
  vm.runInNewContext(source, sandbox);
  sandbox.testTrackPageView();
  const events = browser.dataLayer.map(args => Array.from(args));
  const page = events.find(event => event[0] === 'event' && event[1] === 'page_view');
  assert.equal(page[2].page_location, 'https://school.example/events');
  assert.equal(page[2].page_path, '/events');
  assert.equal(injected.length, 1);
  browser.location.search = '?token=another-secret';
  sandbox.testTrackPageView();
  assert.equal(browser.dataLayer.filter(args => args[0] === 'event').length, 1);
  browser.location.pathname = '/admin';
  sandbox.testTrackPageView();
  assert.equal(browser.dataLayer.filter(args => args[0] === 'event').length, 1);
});
