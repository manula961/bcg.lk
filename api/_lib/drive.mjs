import { createCipheriv, createDecipheriv, randomBytes, randomUUID, createHash, timingSafeEqual } from 'node:crypto';
import { hasPermission } from '../../src/lib/rbac.mjs';

export const cookies = { state: 'bcg_drive_oauth', session: 'bcg_drive_session' };
const maximumBytes = 4 * 1024 * 1024;
const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const UPSTREAM_TIMEOUT_MS = 12000;
// Abort stalled Firebase/Google calls and reject redirects that might carry tokens.
async function upstreamFetch(url, options = {}) {
  return fetch(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
}

export function configured() {
  const names = ['GOOGLE_OAUTH_CLIENT_ID','GOOGLE_OAUTH_CLIENT_SECRET','GOOGLE_OAUTH_REDIRECT_URI','DRIVE_COOKIE_ENCRYPTION_KEY','FIREBASE_PROJECT_ID'];
  return names.every(name => Boolean(process.env[name])) &&
    Boolean(process.env.FIREBASE_WEB_API_KEY || process.env.VITE_FIREBASE_API_KEY);
}
function key() {
  const value = process.env.DRIVE_COOKIE_ENCRYPTION_KEY || '';
  if (!/^[a-f\d]{64}$/i.test(value)) throw new Error('DRIVE_COOKIE_ENCRYPTION_KEY must be 32 random bytes in hex');
  return Buffer.from(value, 'hex');
}
export function seal(data) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(data)), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64url');
}
export function unseal(value) {
  if (!value || typeof value !== 'string' || value.length > 3800) throw new Error('Invalid cookie');
  const data = Buffer.from(value, 'base64url');
  if (data.length < 29) throw new Error('Invalid cookie');
  const decipher = createDecipheriv('aes-256-gcm', key(), data.subarray(0,12));
  decipher.setAuthTag(data.subarray(12,28));
  return JSON.parse(Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString());
}
export function cookieValue(req, name) {
  const header = req?.headers?.cookie;
  if (typeof header !== 'string' || header.length > 8192) return null;
  const values = header.split(';').map(p => p.trim()).filter(p => p.startsWith(name + '='));
  // Ambiguous duplicate cookies must not select an attacker-controlled value.
  return values.length === 1 ? values[0].slice(name.length + 1) : null;
}
export function setCookie(name, value, seconds, path='/api/drive') {
  return name+'='+value+'; Path='+path+'; HttpOnly; Secure; SameSite=Lax; Max-Age='+seconds;
}
export function clearCookie(name, path='/api/drive') {
  return setCookie(name, '', 0, path);
}
export function requireMethod(req, res, method) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  if (req.method !== method) {
    res.setHeader('Allow',method);
    res.status(405).json({ error:'Method not allowed' });
    return false;
  }
  return true;
}
export function requireSameOrigin(req) {
  const origin = req.headers.origin;
  const trusted = new URL(process.env.GOOGLE_OAUTH_REDIRECT_URI || 'https://invalid.example').origin;
  if (origin !== trusted) throw Object.assign(new Error('Origin not permitted'),{status:403});
}
export async function requireAdmin(req) {
  const match = /^Bearer ([A-Za-z0-9._-]+)$/.exec(req.headers.authorization || '');
  if (!match) throw Object.assign(new Error('Sign in to the admin panel first'),{status:401});
  const apiKey = process.env.FIREBASE_WEB_API_KEY || process.env.VITE_FIREBASE_API_KEY;
  if (!apiKey || !process.env.FIREBASE_PROJECT_ID) throw new Error('Firebase API configuration is incomplete');
  const authResponse = await upstreamFetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key='+encodeURIComponent(apiKey), {
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({idToken:match[1]}),
  });
  if (!authResponse.ok) throw Object.assign(new Error('Invalid Firebase session'),{status:401});
  const result = await authResponse.json();
  const users = result?.users;
  if (!Array.isArray(users) || users.length !== 1 ||
      typeof users[0]?.localId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(users[0].localId) ||
      users[0].disabled === true) {
    throw Object.assign(new Error('Invalid Firebase session'), { status: 401 });
  }
  const uid = users[0].localId;
  const project = process.env.FIREBASE_PROJECT_ID;
  const url = 'https://firestore.googleapis.com/v1/projects/'+encodeURIComponent(project)+'/databases/(default)/documents/admins/'+encodeURIComponent(uid);
  const roleResponse = await upstreamFetch(url,{headers:{Authorization:'Bearer '+match[1]}});
  if (!roleResponse.ok) throw Object.assign(new Error('Administrator access required'),{status:403});
  const record = await roleResponse.json();
  // The role document is looked up using the verified Firebase UID only.
  if (!hasPermission(record?.fields?.role?.stringValue, 'media.upload'))
    throw Object.assign(new Error('Media-upload role required'), { status: 403 });
  return uid;
}
export function verifySession(req, uid) {
  let data;
  try {
    data = unseal(cookieValue(req, cookies.session));
  } catch {
    throw Object.assign(new Error('Connect Google Drive again'), { status: 401 });
  }
  if (!data || typeof data !== 'object' || Array.isArray(data) ||
      typeof uid !== 'string' || !uid || data.uid !== uid ||
      typeof data.refresh !== 'string' || !data.refresh.trim() ||
      !Number.isSafeInteger(data.exp) || data.exp <= Date.now() ||
      data.exp > Date.now() + 30 * 86400000) {
    throw Object.assign(new Error('Connect Google Drive again'), { status: 401 });
  }
  return data;
}
export function googleRedirect() {
  const url = new URL(process.env.GOOGLE_OAUTH_REDIRECT_URI);
  if (url.protocol !== 'https:' || url.pathname !== '/api/drive/callback' || url.search || url.hash)
    throw new Error('Invalid GOOGLE_OAUTH_REDIRECT_URI');
  return url.toString();
}
export function oauthStart(uid) {
  const nonce = randomBytes(24).toString('base64url');
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  for(const [k,v] of Object.entries({
    client_id:process.env.GOOGLE_OAUTH_CLIENT_ID,redirect_uri:googleRedirect(),
    response_type:'code',scope:'https://www.googleapis.com/auth/drive.file',
    access_type:'offline',prompt:'consent',state:nonce,code_challenge:challenge,code_challenge_method:'S256',
  })) url.searchParams.set(k,v);
  return {url:url.toString(),state:nonce,cookie:seal({uid,nonce,verifier,exp:Date.now()+600000})};
}
export function checkOAuthState(req,state) {
  const data = unseal(cookieValue(req,cookies.state));
  if (!data || typeof data !== 'object' || Array.isArray(data) ||
      !Number.isSafeInteger(data.exp) || data.exp <= Date.now() ||
      data.exp > Date.now() + 600000 ||
      typeof data.uid !== 'string' || !data.uid ||
      typeof data.nonce !== 'string' || !/^[A-Za-z0-9_-]{32}$/.test(data.nonce) ||
      typeof state !== 'string' || !/^[A-Za-z0-9_-]{32}$/.test(state) ||
      typeof data.verifier !== 'string' || !/^[A-Za-z0-9_-]{43,128}$/.test(data.verifier))
    throw Object.assign(new Error('OAuth session expired or mismatched'), { status: 401 });
  const a = Buffer.from(data.nonce, 'utf8');
  const b = Buffer.from(state, 'utf8');
  if (!timingSafeEqual(a, b))
    throw Object.assign(new Error('OAuth session expired or mismatched'), { status: 401 });
  return data;
}
export async function googleToken(params) {
  const form = new URLSearchParams({
    client_id:process.env.GOOGLE_OAUTH_CLIENT_ID,
    client_secret:process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    ...params,
  });
  const response = await upstreamFetch('https://oauth2.googleapis.com/token',{
    method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:form,
  });
  const value=await response.json();
  if(!response.ok) throw Error('Google OAuth token exchange failed');
  return value;
}
export async function accessToken(refresh) {
  const token = await googleToken({grant_type:'refresh_token',refresh_token:refresh});
  return token.access_token;
}
/**
 * Invalidate the Google account grant as well as the local session cookie.
 * Only called after the caller's Firebase admin role has been verified.
 */
export async function revokeGoogleAccess(refreshToken) {
  if (typeof refreshToken !== 'string' || !refreshToken) {
    throw Object.assign(new Error('Google Drive is not connected'), { status: 400 });
  }
  const result = await upstreamFetch('https://oauth2.googleapis.com/revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token: refreshToken }),
  });
  if (!result.ok && result.status !== 400) {
    throw new Error('Google token revocation request failed');
  }
  // A 400 response commonly means this grant has already been revoked.
}
export function errorReply(res,error) {
  const status = [400,401,403,405,413].includes(error?.status) ? error.status : 500;
  console.error('[Drive API]',status,error?.message);
  res.status(status).json({error:status===500?'Google Drive request failed; check server configuration':error.message});
}
export async function readImage(req) {
  const type = (req.headers['content-type']||'').split(';')[0].toLowerCase();
  if(!allowed.has(type)) throw Object.assign(new Error('Only JPG, PNG, WebP or GIF images are supported'),{status:400});
  const bytes=[];
  let size=0;
  for await(const chunk of req) {
    size+=chunk.length;
    if(size>maximumBytes) throw Object.assign(new Error('Image exceeds 4 MB'),{status:413});
    bytes.push(chunk);
  }
  if(size===0) throw Object.assign(new Error('Empty image'),{status:400});
  const data=Buffer.concat(bytes);
  const isJpeg=data.length>=3 && data[0]===0xff && data[1]===0xd8 && data[2]===0xff;
  const isPng=data.length>=8 && data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const isGif=data.length>=6 && ['GIF87a','GIF89a'].includes(data.toString('ascii',0,6));
  const isWebp=data.length>=12 && data.toString('ascii',0,4)==='RIFF' && data.toString('ascii',8,12)==='WEBP';
  if (!({ 'image/jpeg':isJpeg,'image/png':isPng,'image/gif':isGif,'image/webp':isWebp })[type]) {
    throw Object.assign(new Error('The file content does not match the selected image format'),{status:400});
  }
  const extensions={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'};
  const name='bcg-'+randomUUID()+'.'+extensions[type];
  return {type,name,bytes:data};
}
export async function driveUpload(token,file) {
  const boundary='bcg_'+randomBytes(12).toString('hex');
  const metadata={name:file.name,mimeType:file.type,appProperties:{bcgManaged:'1'}};
  if(process.env.GOOGLE_DRIVE_FOLDER_ID) metadata.parents=[process.env.GOOGLE_DRIVE_FOLDER_ID];
  const payload=Buffer.concat([
    Buffer.from('--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify(metadata)+'\r\n--'+boundary+'\r\nContent-Type: '+file.type+'\r\n\r\n'),
    file.bytes,Buffer.from('\r\n--'+boundary+'--'),
  ]);
  const response=await upstreamFetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,mimeType',{
    method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'multipart/related; boundary='+boundary},body:payload,
  });
  if(!response.ok) throw Error('Drive upload rejected ('+response.status+')');
  const created=await response.json();
  if(!/^[a-zA-Z0-9_-]{10,}$/.test(created.id||'')) throw Error('Drive did not return a file ID');
  const permissions=await upstreamFetch('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(created.id)+'/permissions',{
    method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({type:'anyone',role:'reader'}),
  });
  if(!permissions.ok) {
    await upstreamFetch('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(created.id),{
      method:'DELETE',headers:{Authorization:'Bearer '+token},
    }).catch(()=>{});
    throw Error('Google Drive public image permission was rejected ('+permissions.status+')');
  }
  return {id:created.id,imageUrl:'https://drive.google.com/thumbnail?id='+encodeURIComponent(created.id)+'&sz=w1200'};
}

/** Read and signature-check public examination PDFs; image upload limits are unchanged. */
export async function readPdf(req) {
  if ((req.headers['content-type'] || '').split(';')[0].toLowerCase() !== 'application/pdf') throw Object.assign(new Error('PDF files only'),{status:400});
  const chunks=[]; let size=0;
  for await (const chunk of req) { size+=chunk.length; if(size>10*1024*1024) throw Object.assign(new Error('PDF exceeds 10 MB'),{status:413}); chunks.push(chunk); }
  const bytes=Buffer.concat(chunks);
  if (bytes.length<8 || bytes.toString('ascii',0,5)!=='%PDF-') throw Object.assign(new Error('Invalid PDF file signature'),{status:400});
  return {type:'application/pdf',name:'bcg-past-paper-'+randomUUID()+'.pdf',bytes};
}
export async function driveUploadPaper(token,file) {
  const uploaded=await driveUpload(token,file);
  return {id:uploaded.id,url:'https://drive.google.com/file/d/'+encodeURIComponent(uploaded.id)+'/view'};
}

/** Delete only this OAuth app's marked, generated public uploads on explicit request.
 * Never delete arbitrary files from the connected school Drive account.
 * CMS record deletion remains separate until an owner approves a media lifecycle policy.
 */
export async function deleteManagedDriveFile(token, fileId) {
  if (typeof fileId !== 'string' || !/^[A-Za-z0-9_-]{10,128}$/.test(fileId)) {
    throw Object.assign(new Error('Invalid managed Drive file ID'), { status: 400 });
  }
  const fileUrl = 'https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(fileId);
  const lookup = await upstreamFetch(fileUrl + '?fields=id,name,mimeType,trashed,appProperties', {
    headers: { Authorization: 'Bearer ' + token },
  });
  if (!lookup.ok) throw Object.assign(new Error('Drive file could not be verified'), { status: 403 });
  const item = await lookup.json();
  if (item.id !== fileId || item.trashed === true || item.appProperties?.bcgManaged !== '1' ||
      !/^bcg-(?:past-paper-)?[0-9a-f-]{36}\.(?:jpg|png|webp|gif|pdf)$/.test(item.name || '') ||
      !['image/jpeg','image/png','image/webp','image/gif','application/pdf'].includes(item.mimeType)) {
    throw Object.assign(new Error('This is not an app-managed media file'), { status: 403 });
  }
  const deletion = await upstreamFetch(fileUrl, {
    method: 'DELETE', headers: { Authorization: 'Bearer ' + token },
  });
  if (deletion.status !== 204 && !deletion.ok)
    throw new Error('Google Drive did not confirm media deletion');
  return { deleted: true, fileId };
}
