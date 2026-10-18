/**
 * Firestore-only CMS repository.
 */
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from './firebase';

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

function database() {
  if (!db) throw new Error('Firebase Firestore is not configured.');
  return db;
}

function adminUser() {
  if (!auth?.currentUser) {
    throw new Error('Sign in as an administrator before editing content.');
  }
  return auth.currentUser;
}

function documentId(value) {
  if (typeof value !== 'string' || !value.trim() || value.includes('/') || value.length > 1500) {
    throw new TypeError('A valid document ID is required.');
  }
  return value;
}

function cleanField(key, value, definition) {
  const { type = 'text', max = 1000, required = false } = definition;

  if (type === 'number') {
    if (value === '' || value === null || value === undefined) return null;
    const num = Number(value);
    if (!Number.isFinite(num)) throw new TypeError(key + ' must be a valid number.');
    return num;
  }

  if (type === 'boolean') {
    if (typeof value !== 'boolean') throw new TypeError(key + ' must be a boolean.');
    return value;
  }

  if (typeof value !== 'string') throw new TypeError(key + ' must be a string.');
  const cleaned = value.trim();
  if (cleaned.length > max) throw new RangeError(key + ' is too long (maximum ' + max + ' characters).');
  if (required && !cleaned) throw new TypeError(key + ' is required.');

  if (type === 'url' && cleaned) {
    let parsed;
    try { parsed = new URL(cleaned); } catch { throw new TypeError(key + ' must be a valid HTTPS URL.'); }
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) {
      throw new TypeError(key + ' must be a valid HTTPS URL without embedded credentials.');
    }
  }

  if (type === 'slug' && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(cleaned)) {
    throw new TypeError(key + ' must contain lowercase letters, digits, and hyphens only.');
  }

  if (type === 'date' && cleaned) {
    const date = new Date(cleaned + 'T00:00:00.000Z');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cleaned) ||
        !Number.isFinite(date.getTime()) ||
        date.toISOString().slice(0, 10) !== cleaned) {
      throw new TypeError(key + ' must be a real calendar date in YYYY-MM-DD format.');
    }
  }

  if (type === 'hexcolor' && cleaned && !/^#[0-9a-fA-F]{6}$/.test(cleaned)) {
    throw new TypeError(key + ' must be a six-digit hex color.');
  }

  if (definition.allowed && !definition.allowed.includes(cleaned)) {
    throw new TypeError(key + ' must be one of: ' + definition.allowed.join(', '));
  }

  return cleaned;
}

function validate(input, fields, { create = false, defaults = {} } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('Content must be a plain object.');
  }
  const data = create ? { ...defaults, ...input } : { ...input };
  for (const key of Object.keys(data)) {
    if (!hasOwn(fields, key)) throw new TypeError('Unsupported content field: ' + key);
    data[key] = cleanField(key, data[key], fields[key]);
  }
  if (create) {
    for (const [key, definition] of Object.entries(fields)) {
      if (definition.required && (!hasOwn(data, key) || data[key] === '')) {
        throw new TypeError(key + ' is required.');
      }
    }
  }
  if (!create && Object.keys(data).length === 0) {
    throw new TypeError('Provide at least one field to update.');
  }
  return data;
}

function assertCurrentRevision(snapshot, expectedUpdatedAt) {
  if (expectedUpdatedAt === undefined) return;
  const current = snapshot.data()?.updatedAt ?? null;
  const expected = expectedUpdatedAt ?? null;
  if ((current === null) !== (expected === null) ||
      (current !== null && (!expected?.isEqual || !expected.isEqual(current)))) {
    throw new Error('This item changed since you opened it. Copy your changes, reload the item, and try again.');
  }
}

function fromSnapshot(snapshot) {
  return { id: snapshot.id, ...snapshot.data() };
}

function newestFirst(items) {
  return items.sort((a, b) => {
    const aRank = typeof a.rank === 'number' ? a.rank : Infinity;
    const bRank = typeof b.rank === 'number' ? b.rank : Infinity;

    if (aRank !== bRank) {
      return aRank - bRank;
    }

    const aTime = a.publishedAt?.toMillis?.() ?? a.updatedAt?.toMillis?.() ?? a.createdAt?.toMillis?.() ?? 0;
    const bTime = b.publishedAt?.toMillis?.() ?? b.updatedAt?.toMillis?.() ?? b.createdAt?.toMillis?.() ?? 0;
    return bTime - aTime;
  });
}

function documents(snapshot, publishedOnly = false) {
  return newestFirst(snapshot.docs.map(fromSnapshot).filter(item => !publishedOnly || item.published === true));
}

export function createContentRepository(name, fields, options = {}) {
  if (!['news', 'events', 'pages', 'societies', 'sports', 'extracurricular', 'leadership'].includes(name)) {
    throw new TypeError('Unsupported collection.');
  }

  const enrichedFields = {
    ...fields,
    rank: { type: 'number' },
  };

  const records = () => collection(database(), name);
  const record = id => doc(database(), name, documentId(id));
  const publishedQuery = () => query(records(), where('published', '==', true));
  const onError = callback => error => {
    if (typeof callback === 'function') callback(error);
  };

  return Object.freeze({
    async listPublished() {
      return documents(await getDocs(publishedQuery()), true);
    },
    subscribePublished(callback, handleError) {
      if (typeof callback !== 'function') throw new TypeError('callback is required.');
      return onSnapshot(publishedQuery(), snapshot => callback(documents(snapshot, true)), onError(handleError));
    },
    async getPublished(id) {
      const snapshot = await getDoc(record(id));
      return snapshot.exists() && snapshot.data().published === true ? fromSnapshot(snapshot) : null;
    },
    async listAdmin() {
      adminUser();
      return documents(await getDocs(records()));
    },
    subscribeAdmin(callback, handleError) {
      adminUser();
      if (typeof callback !== 'function') throw new TypeError('callback is required.');
      return onSnapshot(records(), snapshot => callback(documents(snapshot)), onError(handleError));
    },
    async getAdmin(id) {
      adminUser();
      const snapshot = await getDoc(record(id));
      return snapshot.exists() ? fromSnapshot(snapshot) : null;
    },
    async create(input) {
      const user = adminUser();
      const data = validate(input, enrichedFields, { create: true, defaults: options.defaults });
      const payload = {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        publishedAt: data.published ? serverTimestamp() : null,
        createdBy: user.uid,
        updatedBy: user.uid,
      };
      if (options.idField) {
        const id = documentId(data[options.idField]);
        const ref = record(id);
        await runTransaction(database(), async transaction => {
          const existing = await transaction.get(ref);
          if (existing.exists()) throw new Error('An entry with this ' + options.idField + ' already exists.');
          transaction.set(ref, payload);
        });
        return id;
      }
      const ref = await addDoc(records(), payload);
      return ref.id;
    },
    async update(id, patch, { expectedUpdatedAt } = {}) {
      const user = adminUser();
      const ref = record(id);
      const input = validate(patch, enrichedFields);
      if (options.idField && hasOwn(input, options.idField) && input[options.idField] !== id) {
        throw new Error(options.idField + ' cannot be changed after creation.');
      }
      await runTransaction(database(), async transaction => {
        const existing = await transaction.get(ref);
        if (!existing.exists()) throw new Error('Content entry not found.');
        assertCurrentRevision(existing, expectedUpdatedAt);
        const payload = { ...input, updatedAt: serverTimestamp(), updatedBy: user.uid };
        if (hasOwn(input, 'published') && input.published !== existing.data().published) {
          payload.publishedAt = input.published ? serverTimestamp() : null;
        }
        transaction.update(ref, payload);
      });
    },
    async reorderBatch(orderedIds) {
      const user = adminUser();
      if (!Array.isArray(orderedIds) || orderedIds.length > 400 ||
          new Set(orderedIds).size !== orderedIds.length) {
        throw new TypeError('Provide up to 400 unique content IDs for reordering.');
      }
      const batch = writeBatch(database());
      orderedIds.forEach((id, index) => {
        const ref = record(id);
        batch.update(ref, { rank: index + 1, updatedAt: serverTimestamp(), updatedBy: user.uid });
      });
      await batch.commit();
    },
    async remove(id, { expectedUpdatedAt } = {}) {
      adminUser();
      if (expectedUpdatedAt === undefined) {
        await deleteDoc(record(id));
        return;
      }
      await runTransaction(database(), async transaction => {
        const ref = record(id);
        const existing = await transaction.get(ref);
        if (!existing.exists()) throw new Error('Content entry not found.');
        assertCurrentRevision(existing, expectedUpdatedAt);
        transaction.delete(ref);
      });
    },
  });
}