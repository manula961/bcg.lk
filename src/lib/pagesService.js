/** Firestore Pages service. A page's Firestore document ID is its stable slug. */
import { createContentRepository } from './contentRepository';

const fields = {
  slug: { type: 'slug', required: true, max: 120 },
  title: { required: true, max: 180 },
  body: { required: true, max: 50000 },
  seoDescription: { max: 320 },
  imageUrl: { type: 'url', max: 2048 },
  published: { type: 'boolean' },
};

const pages = createContentRepository('pages', fields, {
  idField: 'slug',
  defaults: { seoDescription: '', imageUrl: '', published: false },
});

export const listPublishedPages = pages.listPublished;
export const subscribePublishedPages = pages.subscribePublished;
export const getPublishedPage = pages.getPublished;
export const listAdminPages = pages.listAdmin;
export const subscribeAdminPages = pages.subscribeAdmin;
export const getAdminPage = pages.getAdmin;
export const createPage = pages.create;
export const updatePage = pages.update;
export const deletePage = pages.remove;
