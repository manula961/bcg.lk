/** Prevent read-only HTTP smoke checks from targeting an unapproved origin. */
import { isIP } from 'node:net';

export function assertApprovedSmokeOrigin(originText, { approvedOrigin, required = false } = {}) {
  if (typeof originText !== 'string' || !originText) throw new Error('BCG_PUBLIC_ORIGIN is required.');
  let url;
  try { url = new URL(originText); }
  catch { throw new Error('BCG_PUBLIC_ORIGIN must be a valid HTTPS origin.'); }
  if (url.protocol !== 'https:' || url.origin !== originText || url.username || url.password ||
      isIP(url.hostname.replace(/^\[|\]$/g, '')) ||
      url.hostname === 'localhost' || url.hostname.endsWith('.localhost')) {
    throw new Error('Use an exact public HTTPS domain origin, without an IP, credentials, query or path.');
  }
  if (required && !approvedOrigin) throw new Error('An owner-approved public origin has not been configured.');
  if (approvedOrigin && approvedOrigin !== originText)
    throw new Error('The requested domain differs from the owner-approved origin.');
  return url;
}
