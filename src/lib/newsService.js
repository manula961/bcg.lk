/** Firestore News service. No changes to public NewsSection or dashboard markup. */
import { createContentRepository } from './contentRepository';

const fields = {
  title: { required: true, max: 180 },
  excerpt: { required: true, max: 500 },
  body: { max: 30000 },
  category: { max: 32, allowed: ['News', 'Announcements'] },
  tag: { max: 80 },
  imageUrl: { type: 'url', max: 2048 },
  published: { type: 'boolean' },
};

const news = createContentRepository('news', fields, {
  defaults: { category: 'News', body: '', tag: '', imageUrl: '', published: false },
});

export const listPublishedNews = news.listPublished;
export const subscribePublishedNews = news.subscribePublished;
export const getPublishedNews = news.getPublished;
export const listAdminNews = news.listAdmin;
export const subscribeAdminNews = news.subscribeAdmin;
export const getAdminNews = news.getAdmin;
export const createNews = news.create;
export const updateNews = news.update;
export const deleteNews = news.remove;
