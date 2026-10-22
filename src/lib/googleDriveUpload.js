import { auth } from './firebase';

const supported = new Set(['image/jpeg','image/png','image/webp','image/gif']);
const limit = 4 * 1024 * 1024;

async function authorized(path, options = {}) {
  const user = auth?.currentUser;
  if (!user) throw new Error('Sign in to BCG.LK admin first');
  const idToken = await user.getIdToken();
  const response = await fetch(path, {
    ...options,
    credentials: 'same-origin',
    headers: { ...(options.headers || {}), Authorization: 'Bearer ' + idToken },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Google Drive operation failed');
  return data;
}

export const getDriveStatus = () => authorized('/api/drive/status');
export async function connectDrive() {
  const result = await authorized('/api/drive/connect', { method: 'POST' });
  const destination = new URL(result.url);
  if (destination.protocol !== 'https:' || destination.hostname !== 'accounts.google.com') {
    throw new Error('Google OAuth URL is not trusted');
  }
  window.location.assign(destination.toString());
}
export async function disconnectDrive() {
  return authorized('/api/drive/disconnect', { method: 'POST' });
}
export async function uploadDriveImage(file) {
  if (!(file instanceof File) || !supported.has(file.type)) throw new Error('Choose a JPG, PNG, WebP or GIF image');
  if (!file.size || file.size > limit) throw new Error('Image must be smaller than 4 MB');
  const result = await authorized('/api/drive/upload', {
    method:'POST',headers:{'Content-Type':file.type},body:file,
  });
  if (typeof result.imageUrl !== 'string' || !result.imageUrl.startsWith('https://drive.google.com/thumbnail?id=')) {
    throw new Error('Invalid Google Drive image link');
  }
  return result.imageUrl;
}

export async function uploadDrivePaper(file) {
  if (!(file instanceof File) || file.type !== 'application/pdf') throw new Error('Choose a PDF document');
  if (!file.size || file.size > 10*1024*1024) throw new Error('PDF must be 10 MB or smaller');
  const result=await authorized('/api/drive/papers-upload',{method:'POST',headers:{'Content-Type':'application/pdf'},body:file});
  if (typeof result.url !== 'string' || !/^https:\/\/drive\.google\.com\/file\/d\/[\w-]+\/view$/.test(result.url)) throw new Error('Invalid Google Drive PDF link');
  return result.url;
}
