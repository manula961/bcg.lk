import { createContentRepository } from './contentRepository';

const fields = {
  title: { required: true, max: 180 },
  role: { required: true, max: 80, allowed: ['Principal', 'Deputy Principal', 'Assistant Principal', 'Sectional Head', 'Other Senior Staff'] },
  description: { max: 1200 },
  imageUrl: { type: 'url', max: 2048 },
  published: { type: 'boolean' },
};

const repository = createContentRepository('leadership', fields, {
  defaults: { role: 'Principal', description: '', imageUrl: '', published: false, rank: 999 },
});

export const subscribePublishedLeadership = repository.subscribePublished;
export const listPublishedLeadership = repository.listPublished;
export const subscribeAdminLeadership = repository.subscribeAdmin;
export const createLeader = repository.create;
export const updateLeader = repository.update;
export const reorderLeadership = repository.reorderBatch;
export const deleteLeader = repository.remove;