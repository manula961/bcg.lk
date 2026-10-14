/** Firestore Societies CMS. Existing UI components remain unchanged. */
import { createContentRepository } from './contentRepository';

const fields = {
  title: { required: true, max: 180 },
  description: { required: true, max: 1200 },
  category: { max: 80 },
  imageUrl: { type: 'url', max: 2048 },
  websiteUrl: { type: 'url', max: 2048 },
  published: { type: 'boolean' },
};

const societies = createContentRepository('societies', fields, {
  defaults: { category: '', imageUrl: '', websiteUrl: '', published: false },
});

export const subscribePublishedSocieties = societies.subscribePublished;
export const listPublishedSocieties = societies.listPublished;
export const subscribeAdminSocieties = societies.subscribeAdmin;
export const listAdminSocieties = societies.listAdmin;
export const createSociety = societies.create;
export const updateSociety = societies.update;
export const deleteSociety = societies.remove;
