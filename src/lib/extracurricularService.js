/** Admin-authorized Extracurricular content, filtered to published records on public pages. */
import { createContentRepository } from './contentRepository';

const fields = {
  title: { required: true, max: 180 },
  category: { max: 80 },
  description: { required: true, max: 3000 },
  imageUrl: { type: 'url', max: 2048 },
  published: { type: 'boolean' },
};

const repository = createContentRepository('extracurricular', fields, { defaults: { category: '', imageUrl: '', published: false } });

export const subscribePublishedExtracurricular = repository.subscribePublished;
export const listPublishedExtracurricular = repository.listPublished;
export const subscribeAdminExtracurricular = repository.subscribeAdmin;
export const createActivity = repository.create;
export const updateActivity = repository.update;
export const deleteActivity = repository.remove;
