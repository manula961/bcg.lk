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
  defaults: { category: '', imageUrl: '', websiteUrl: '', published: false, rank: 999 },
});

export const subscribePublishedSocieties = societies.subscribePublished;
export const listPublishedSocieties = societies.listPublished;
export const subscribeAdminSocieties = societies.subscribeAdmin;
export const listAdminSocieties = societies.listAdmin;
export const createSociety = societies.create;
export const updateSociety = societies.update;
export const reorderSocieties = societies.reorderBatch;
export const deleteSociety = societies.remove;