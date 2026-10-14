/**
 * Direct-to-Cloudinary image upload, using a restricted UNSIGNED upload preset.
 * The preset is public, not an authorization boundary. Never put an API secret here.
 */
const cloudName = (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '').trim();
const uploadPreset = (import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '').trim();

const supportedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const maximumBytes = 5 * 1024 * 1024;

export const cloudinaryUploadConfigured = Boolean(
  /^[a-zA-Z0-9_-]+$/.test(cloudName) && /^[a-zA-Z0-9_-]+$/.test(uploadPreset)
);

export async function uploadAdminImage(file, { signal } = {}) {
  if (!cloudinaryUploadConfigured) {
    throw new Error('Image upload is not configured. Set the Cloudinary cloud name and unsigned upload preset in Vercel.');
  }
  if (!(file instanceof File)) throw new TypeError('Select an image file first.');
  if (!supportedTypes.has(file.type)) {
    throw new TypeError('Choose a JPG, PNG, WebP or GIF image.');
  }
  if (file.size === 0 || file.size > maximumBytes) {
    throw new RangeError('Image size must be between 1 byte and 5 MB.');
  }

  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', uploadPreset);
  const response = await fetch(
    'https://api.cloudinary.com/v1_1/' + cloudName + '/image/upload',
    { method: 'POST', body: form, signal }
  );
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error?.message || 'Cloudinary upload failed. Verify the upload preset restrictions.');
  }
  const secureUrl = result.secure_url;
  if (
    typeof secureUrl !== 'string' ||
    !secureUrl.startsWith('https://res.cloudinary.com/' + cloudName + '/image/upload/')
  ) {
    throw new Error('Cloudinary returned an unexpected image URL.');
  }
  return secureUrl;
}
