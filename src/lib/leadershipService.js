/** Admin-authorized Leadership content, filtered to published records on public pages. */
import { createContentRepository } from './contentRepository';

const fields = {
  title: { required: true, max: 180 },
  role: { required: true, max: 80, allowed: ['Principal', 'Deputy Principal', 'Assistant Principal', 'Sectional Head', 'Other Senior Staff'] },
  rank: { required: true, allowed: Array.from({ length: 20 }, (_, index) => String(index + 1)) },
  description: { max: 1200 },
  imageUrl: { type: 'url', max: 2048 },
  published: { type: 'boolean' },
};

const repository = createContentRepository('leadership', fields, { defaults: { role: 'Principal', rank: '1', description: '', imageUrl: '', published: false } });

export const subscribePublishedLeadership = repository.subscribePublished;
export const listPublishedLeadership = repository.listPublished;
export const subscribeAdminLeadership = repository.subscribeAdmin;
export const createLeader = repository.create;
export const updateLeader = repository.update;
export const deleteLeader = repository.remove;
