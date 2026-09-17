import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearRecoverySession,
  deleteRecordedLesson,
  getAllRecordedLessons,
  getRecoveryChunks,
  getRecoverySessions,
  saveRecordedLesson,
  saveRecoveryChunk,
} from './indexedDb';
import { RecordedLesson } from '../types';

// The app's indexedDb.ts module opens a fresh IDBDatabase connection on every
// call and never closes it (a real, pre-existing resource leak worth fixing
// separately). That means `indexedDB.deleteDatabase(...)` between tests would
// block forever waiting on connections from earlier tests to close. Swapping
// in a brand-new IDBFactory per test sidesteps that entirely and gives each
// test a guaranteed-empty, fully isolated store.
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

function makeLesson(overrides: Partial<RecordedLesson> = {}): RecordedLesson {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    title: 'Untitled lesson',
    createdAt: Date.now(),
    duration: 60,
    sizeBytes: 17,
    blob: new Blob(['fake video bytes'], { type: 'video/webm' }),
    mimeType: 'video/webm',
    ...overrides,
  } as RecordedLesson;
}

describe('indexedDb lesson storage', () => {
  it('returns an empty array when no lessons have been saved', async () => {
    const lessons = await getAllRecordedLessons();
    expect(lessons).toEqual([]);
  });

  it('saves a lesson and retrieves it, sorted newest first', async () => {
    const older = makeLesson({ id: 'older', createdAt: 1000 });
    const newer = makeLesson({ id: 'newer', createdAt: 2000 });

    await saveRecordedLesson(older);
    await saveRecordedLesson(newer);

    const lessons = await getAllRecordedLessons();
    expect(lessons.map((l) => l.id)).toEqual(['newer', 'older']);
  });

  it('hydrates a playable blobUrl for each stored lesson', async () => {
    await saveRecordedLesson(makeLesson({ id: 'with-blob' }));
    const [lesson] = await getAllRecordedLessons();
    expect(lesson.blobUrl).toMatch(/^blob:/);
  });

  it('deletes a lesson by id', async () => {
    await saveRecordedLesson(makeLesson({ id: 'to-delete' }));
    expect(await getAllRecordedLessons()).toHaveLength(1);

    await deleteRecordedLesson('to-delete');
    expect(await getAllRecordedLessons()).toHaveLength(0);
  });
});

describe('indexedDb crash-recovery chunks', () => {
  it('groups saved chunks into a session summary with a chunk count', async () => {
    const sessionId = 'session-a';
    await saveRecoveryChunk({
      sessionId,
      index: 0,
      blob: new Blob(['chunk-0']),
      mimeType: 'video/webm',
      createdAt: 1,
    });
    await saveRecoveryChunk({
      sessionId,
      index: 1,
      blob: new Blob(['chunk-1']),
      mimeType: 'video/webm',
      createdAt: 2,
    });

    const sessions = await getRecoverySessions();
    expect(sessions).toEqual([{ sessionId, mimeType: 'video/webm', createdAt: 1, chunks: 2 }]);
  });

  it('returns chunks for a session in index order', async () => {
    const sessionId = 'session-b';
    await saveRecoveryChunk({
      sessionId,
      index: 1,
      blob: new Blob(['second']),
      mimeType: 'video/webm',
      createdAt: 2,
    });
    await saveRecoveryChunk({
      sessionId,
      index: 0,
      blob: new Blob(['first']),
      mimeType: 'video/webm',
      createdAt: 1,
    });

    const chunks = await getRecoveryChunks(sessionId);
    expect(chunks.map((c) => c.index)).toEqual([0, 1]);
  });

  it('clears all chunks belonging to a session', async () => {
    const sessionId = 'session-c';
    await saveRecoveryChunk({
      sessionId,
      index: 0,
      blob: new Blob(['x']),
      mimeType: 'video/webm',
      createdAt: 1,
    });

    await clearRecoverySession(sessionId);
    expect(await getRecoveryChunks(sessionId)).toEqual([]);
  });
});
