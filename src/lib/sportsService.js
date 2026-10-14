/** Admin-authorized Sports content, filtered to published records on public pages. */
import { createContentRepository } from './contentRepository';

const fields = {
  title: { required: true, max: 180 },
  category: { max: 80 },
  description: { required: true, max: 3000 },
  achievements: { max: 2000 },
  imageUrl: { type: 'url', max: 2048 },
  published: { type: 'boolean' },
};

const repository = createContentRepository('sports', fields, { defaults: { category: '', achievements: '', imageUrl: '', published: false } });

export const subscribePublishedSports = repository.subscribePublished;
export const listPublishedSports = repository.listPublished;
export const subscribeAdminSports = repository.subscribeAdmin;
export const createSport = repository.create;
export const updateSport = repository.update;
export const deleteSport = repository.remove;
