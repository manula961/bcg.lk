import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');

test('Cloudinary unsigned upload uses only configured public keys and never exposes secret', () => {
  const uploader = read('src/lib/cloudinaryUpload.js');
  assert.match(uploader, /VITE_CLOUDINARY_CLOUD_NAME/);
  assert.match(uploader, /VITE_CLOUDINARY_UPLOAD_PRESET/);
  assert.doesNotMatch(uploader, /VITE_CLOUDINARY_API_SECRET|api_secret|signature\s*=/);
  assert.match(uploader, /https:\/\/api\.cloudinary\.com\/v1_1\//);
  assert.match(uploader, /response\.ok/);
  assert.match(uploader, /result\.secure_url/);
  assert.match(uploader, /maximumBytes\s*=\s*5\s*\*\s*1024\s*\*\s*1024/);
  assert.match(uploader, /supportedTypes\.has\(file\.type\)/);
});

test('upload is optional and preserves original image URL input and preview', () => {
  const manager = read('src/admin/ContentManager.jsx');
  assert.match(manager, /cloudinaryUploadConfigured/);
  assert.match(manager, /handleImageUpload/);
  assert.match(manager, /updateField\('imageUrl', url\)/);
  assert.match(manager, /field\.key === 'imageUrl' && cloudinaryUploadConfigured/);
  assert.match(manager, /type="file"/);
  assert.match(manager, /form\.imageUrl/);
  assert.match(manager, /disabled=\{busy \|\| uploadingImage\}/);
});
