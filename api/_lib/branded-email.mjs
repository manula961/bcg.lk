/**
 * Branded password setup / reset emails for the existing BCG.LK user-admin API.
 * No links or credentials are logged or returned to the browser.
 */
const safe = value => String(value || '').replace(/[&<>"']/g, char =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

export function brandedPasswordEmail({ displayName = '', resetLink, purpose = 'reset' }) {
  if (typeof resetLink !== 'string' || !resetLink.startsWith('https://'))
    throw new Error('A secure Firebase password-action link is required.');
  const name = safe(displayName.trim() || 'Team Member');
  const heading = purpose === 'setup' ? 'Welcome to BCG.LK' : 'Reset your BCG.LK password';
  const description = purpose === 'setup'
    ? 'Your administration account is ready. Set your password to access the BCG.LK admin console.'
    : 'A password reset was requested for your BCG.LK administration account.';
  const cta = purpose === 'setup' ? 'Set Your Password' : 'Reset Your Password';
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:32px 12px;background:#f5f1e9;font-family:Arial,Helvetica,sans-serif;color:#261b1d">
<table role="presentation" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;margin:0 auto;background:white;border-collapse:collapse">
<tr><td style="background:#4b101b;padding:28px 30px;text-align:center">
<div style="font-size:28px;font-weight:bold;color:#e7c779;letter-spacing:1px">BCG.LK</div>
<div style="font-size:12px;color:#f3e4bb;margin-top:6px">BANDARANAYAKE COLLEGE · GAMPAHA</div></td></tr>
<tr><td style="padding:30px">
<h1 style="font-size:23px;line-height:1.3;margin:0 0 18px;color:#4b101b">${heading}</h1>
<p style="font-size:15px;line-height:1.65">Hello ${name},</p>
<p style="font-size:15px;line-height:1.65">${description}</p>
<p style="margin:30px 0;text-align:center"><a href="${safe(resetLink)}" style="display:inline-block;padding:14px 24px;background:#761d2b;color:white;text-decoration:none;border-radius:6px;font-weight:bold">${cta}</a></p>
<p style="font-size:13px;line-height:1.6;color:#62565a">If you didn't request this, you can safely ignore this message. The link expires automatically.</p>
<p style="font-size:13px;line-height:1.6;color:#62565a">For assistance, contact the BCG.LK website administrator.</p>
</td></tr><tr><td style="border-top:1px solid #e8e0d5;padding:18px;text-align:center;color:#786b6d;font-size:12px">BCG.LK Administration Team<br>Bandaranayake College, Gampaha</td></tr>
</table></body></html>`;
  const text = [heading, '', 'Hello ' + (displayName.trim() || 'Team Member') + ',',
    description, '', cta + ':', resetLink, '',
    "If you didn't request this, you can ignore this message.",
    'BCG.LK Administration Team — Bandaranayake College, Gampaha'].join('\n');
  return { subject: 'BCG.LK — ' + (purpose === 'setup' ? 'Set Your Account Password' : 'Reset Your Password'), html, text };
}

export async function sendViaResend({ to, displayName, resetLink, purpose = 'reset' }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) throw new Error('Resend server configuration is incomplete.');
  const content = brandedPasswordEmail({ displayName, resetLink, purpose });
  const replyTo = process.env.RESEND_REPLY_TO;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from, to: [to], subject: content.subject, html: content.html, text: content.text,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
    redirect: 'error',
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error('Branded email provider rejected delivery.');
  const result = await response.json().catch(() => ({}));
  if (!result.id) throw new Error('Branded email provider did not confirm acceptance.');
  return true;
}
