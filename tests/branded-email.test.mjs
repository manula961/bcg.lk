import test from 'node:test';
import assert from 'node:assert/strict';
import { brandedPasswordEmail, sendViaResend } from '../api/_lib/branded-email.mjs';
import { readFileSync } from 'node:fs';

test('setup and reset emails use different labels with the Firebase link', () => {
  const url = 'https://example.firebaseapp.com/__/auth/action?mode=resetPassword&key=test';
  const setup = brandedPasswordEmail({ displayName: 'Editor', resetLink: url, purpose: 'setup' });
  const reset = brandedPasswordEmail({ displayName: 'Editor', resetLink: url, purpose: 'reset' });
  assert.match(setup.subject, /Set Your Account Password/);
  assert.match(reset.subject, /Reset Your Password/);
  assert.ok(setup.html.includes(url.replaceAll('&', '&amp;')));
  assert.ok(reset.text.includes(url));
  assert.match(setup.html, /Bandaranayake College/);
});

test('HTML escapes dynamic display names and link attributes', () => {
  const message = brandedPasswordEmail({
    displayName: '<img src=x onerror=alert(1)>',
    resetLink: 'https://example.test/?a=1&b=2',
  });
  assert.doesNotMatch(message.html, /<img src=x/);
  assert.match(message.html, /&lt;img/);
  assert.match(message.html, /a=1&amp;b=2/);
  assert.throws(() => brandedPasswordEmail({ resetLink: 'javascript:alert(1)' }));
});

test('Resend delivery is server-only and requires provider acceptance', async () => {
  const keys = ['RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'RESEND_REPLY_TO'];
  const original = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  const fetchOriginal = globalThis.fetch;
  process.env.RESEND_API_KEY = 'test-key';
  process.env.RESEND_FROM_EMAIL = 'BCG.LK <admin@mail.bcglk.devoraid.com>';
  process.env.RESEND_REPLY_TO = 'support@example.test';
  let payload;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://api.resend.com/emails');
    payload = JSON.parse(options.body);
    assert.equal(options.headers.Authorization, 'Bearer test-key');
    return { ok: true, json: async () => ({ id: 'email_123' }) };
  };
  try {
    assert.equal(await sendViaResend({
      to: 'editor@example.test', displayName: 'Editor',
      resetLink: 'https://example.test/action', purpose: 'setup',
    }), true);
    assert.equal(payload.to[0], 'editor@example.test');
    assert.equal(payload.reply_to, 'support@example.test');
  } finally {
    globalThis.fetch = fetchOriginal;
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test('user creation and password reset share branded server sender', () => {
  const source = readFileSync(new URL('../api/_lib/user-admin.mjs', import.meta.url), 'utf8');
  assert.match(source, /returnOobLink: true/);
  assert.match(source, /sendViaResend\(/);
  assert.match(source, /sendReset\(createEmail, displayName, 'setup'\)/);
  assert.match(source, /sendReset\(existing.email, existing.displayName, 'reset'\)/);
});
