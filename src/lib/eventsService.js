/** Firestore Events service. Stores eventDate in YYYY-MM-DD (local calendar date). */
import { createContentRepository } from './contentRepository';

const fields = {
  title: { required: true, max: 180 },
  description: { required: true, max: 3000 },
  eventDate: { type: 'date', required: true, max: 10 },
  location: { required: true, max: 200 },
  color: { type: 'hexcolor', max: 7 },
  imageUrl: { type: 'url', max: 2048 },
  published: { type: 'boolean' },
};

const events = createContentRepository('events', fields, {
  defaults: { color: '#7B1C1C', imageUrl: '', published: false },
});

export const listPublishedEvents = events.listPublished;
export const subscribePublishedEvents = events.subscribePublished;
export const getPublishedEvent = events.getPublished;
export const listAdminEvents = events.listAdmin;
export const subscribeAdminEvents = events.subscribeAdmin;
export const getAdminEvent = events.getAdmin;
export const createEvent = events.create;
export const updateEvent = events.update;
export const deleteEvent = events.remove;
