import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  USER_OWNED_TABLES,
  deleteUserOwnedRows,
  isMissingTableError,
} from '../supabase/functions/_shared/account-deletion-db.ts';
import {
  CHAT_ATTACHMENTS_BUCKET,
  assertSafeUserStoragePrefix,
  buildUserAttachmentPrefix,
  listAllStorageObjectPaths,
  purgeUserChatAttachments,
  type StorageBucketClient,
  type StorageListItem,
} from '../supabase/functions/_shared/account-deletion-storage.ts';

const USER_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

type MockTree = Map<string, MockTree | true>;

function createMockStorageBucket(tree: MockTree): StorageBucketClient & {
  removed: string[];
} {
  const removed: string[] = [];

  function nodeAt(prefix: string): MockTree | null {
    if (!prefix) return tree;
    const parts = prefix.split('/').filter(Boolean);
    let current: MockTree | true | undefined = tree;
    for (const part of parts) {
      if (!current || current === true || !(current instanceof Map)) return null;
      current = current.get(part);
    }
    return current instanceof Map ? current : null;
  }

  return {
    removed,
    async list(path: string, options: { limit: number; offset: number }) {
      const folder = nodeAt(path);
      if (!folder || folder === true) {
        return { data: [], error: null };
      }

      const entries: StorageListItem[] = [];
      for (const [name, value] of folder.entries()) {
        entries.push({
          name,
          id: value === true ? `${path}/${name}` : null,
        });
      }
      entries.sort((a, b) => a.name.localeCompare(b.name));
      const slice = entries.slice(options.offset, options.offset + options.limit);
      return { data: slice, error: null };
    },
    async remove(paths: string[]) {
      for (const fullPath of paths) {
        const parts = fullPath.split('/').filter(Boolean);
        const fileName = parts.pop();
        if (!fileName) {
          return { error: { message: 'invalid path' } };
        }
        const folder = nodeAt(parts.join('/'));
        if (!folder || folder === true || !(folder instanceof Map) || !folder.has(fileName)) {
          return { error: { message: 'object not found' } };
        }
        folder.delete(fileName);
        removed.push(fullPath);
      }
      return { error: null };
    },
  };
}

describe('account deletion storage purge', () => {
  it('uses the confirmed chat-attachments bucket convention', () => {
    assert.equal(CHAT_ATTACHMENTS_BUCKET, 'chat-attachments');
    assert.equal(buildUserAttachmentPrefix(USER_A), USER_A);
  });

  it('rejects unsafe storage prefixes', () => {
    assert.throws(() => assertSafeUserStoragePrefix('../other-user'), /Invalid user id/);
    assert.throws(() => buildUserAttachmentPrefix('not-a-uuid'), /Invalid user id/);
  });

  it('purges nothing for a user with no attachments', async () => {
    const bucket = createMockStorageBucket(new Map());
    const result = await purgeUserChatAttachments(bucket, USER_A);
    assert.equal(result.removedCount, 0);
    assert.deepEqual(bucket.removed, []);
  });

  it('purges a single attachment file', async () => {
    const bucket = createMockStorageBucket(
      new Map([
        [
          USER_A,
          new Map([
            ['conv-1', new Map([['msg-1', new Map([['photo.jpg', true]])]])],
          ]),
        ],
      ]),
    );

    const result = await purgeUserChatAttachments(bucket, USER_A);
    assert.equal(result.removedCount, 1);
    assert.deepEqual(bucket.removed, [`${USER_A}/conv-1/msg-1/photo.jpg`]);
  });

  it('purges multiple attachments across nested folders', async () => {
    const bucket = createMockStorageBucket(
      new Map([
        [
          USER_A,
          new Map([
            [
              'conv-1',
              new Map([
                ['msg-1', new Map([['a.jpg', true]])],
                ['msg-2', new Map([['b.jpg', true]])],
              ]),
            ],
            ['conv-2', new Map([['msg-3', new Map([['c.jpg', true]])]])],
          ]),
        ],
      ]),
    );

    const result = await purgeUserChatAttachments(bucket, USER_A);
    assert.equal(result.removedCount, 3);
    assert.deepEqual(bucket.removed.sort(), [
      `${USER_A}/conv-1/msg-1/a.jpg`,
      `${USER_A}/conv-1/msg-2/b.jpg`,
      `${USER_A}/conv-2/msg-3/c.jpg`,
    ].sort());
  });

  it('paginates storage listing for large folders', async () => {
    const convFolder = new Map<string, MockTree | true>();
    for (let index = 0; index < 150; index += 1) {
      convFolder.set(`msg-${index}`, new Map([[`file-${index}.jpg`, true]]));
    }

    const bucket = createMockStorageBucket(new Map([[USER_A, new Map([['conv-1', convFolder]])]]));
    const listed = await listAllStorageObjectPaths(bucket, USER_A, { pageSize: 40 });
    assert.equal(listed.paths.length, 150);
    assert.ok(listed.listRequests >= 4);
  });

  it('batches attachment removal', async () => {
    const convFolder = new Map<string, MockTree | true>();
    for (let index = 0; index < 250; index += 1) {
      convFolder.set(`msg-${index}`, new Map([[`file-${index}.jpg`, true]]));
    }
    const bucket = createMockStorageBucket(new Map([[USER_A, new Map([['conv-1', convFolder]])]]));

    const result = await purgeUserChatAttachments(bucket, USER_A, { removeBatchSize: 100 });
    assert.equal(result.removedCount, 250);
    assert.equal(bucket.removed.length, 250);
  });

  it('fails when storage removal fails', async () => {
    const fileFolder = new Map<string, MockTree | true>([['photo.jpg', true]]);
    const msgFolder = new Map<string, MockTree | true>([['msg-1', fileFolder]]);
    const convFolder = new Map<string, MockTree | true>([['conv-1', msgFolder]]);
    const bucket = createMockStorageBucket(new Map([[USER_A, convFolder]]));
    bucket.remove = async () => ({ error: { message: 'permission denied' } });

    await assert.rejects(
      () => purgeUserChatAttachments(bucket, USER_A),
      /storage_remove_failed:permission denied/,
    );
  });

  it('does not delete another user prefix', async () => {
    const bucket = createMockStorageBucket(
      new Map([
        [USER_A, new Map([['conv-1', new Map([['msg-1', new Map([['a.jpg', true]])]])]])],
        [USER_B, new Map([['conv-1', new Map([['msg-1', new Map([['b.jpg', true]])]])]])],
      ]),
    );

    await purgeUserChatAttachments(bucket, USER_A);
    assert.deepEqual(bucket.removed, [`${USER_A}/conv-1/msg-1/a.jpg`]);
    const remaining = await listAllStorageObjectPaths(bucket, USER_B);
    assert.equal(remaining.paths.length, 1);
  });
});

describe('account deletion database purge', () => {
  it('deletes user-owned tables with the correct key column', async () => {
    const calls: Array<{ table: string; column: string; value: string }> = [];
    const admin = {
      from(table: string) {
        return {
          delete() {
            return {
              async eq(column: string, value: string) {
                calls.push({ table, column, value });
                return { error: null };
              },
            };
          },
        };
      },
    };

    const result = await deleteUserOwnedRows(admin, USER_A);
    assert.deepEqual(result.deletedTables, USER_OWNED_TABLES.map((entry) => entry.table));
    assert.equal(calls.find((call) => call.table === 'profiles')?.column, 'id');
    assert.equal(calls.find((call) => call.table === 'messages')?.column, 'user_id');
  });

  it('allows missing tables in partially migrated environments', async () => {
    const admin = {
      from(table: string) {
        return {
          delete() {
            return {
              async eq() {
                if (table === 'reminders') {
                  return { error: { code: 'PGRST205', message: 'Could not find the table' } };
                }
                return { error: null };
              },
            };
          },
        };
      },
    };

    const result = await deleteUserOwnedRows(admin, USER_A);
    assert.ok(result.skippedTables.includes('reminders'));
    assert.ok(result.deletedTables.includes('messages'));
  });

  it('surfaces genuine database deletion failures', async () => {
    const admin = {
      from(table: string) {
        return {
          delete() {
            return {
              async eq() {
                if (table === 'memories') {
                  return { error: { code: '42501', message: 'permission denied for table memories' } };
                }
                return { error: null };
              },
            };
          },
        };
      },
    };

    await assert.rejects(
      () => deleteUserOwnedRows(admin, USER_A),
      /database_delete_failed:memories:permission denied/,
    );
  });

  it('detects missing-table errors conservatively', () => {
    assert.equal(isMissingTableError({ code: 'PGRST205', message: 'Could not find the table' }), true);
    assert.equal(isMissingTableError({ code: '42501', message: 'permission denied' }), false);
  });
});

describe('account deletion security expectations', () => {
  it('derives the storage prefix only from the authenticated user id shape', () => {
    assert.equal(buildUserAttachmentPrefix(USER_A), USER_A);
    assert.throws(() => buildUserAttachmentPrefix(`${USER_A}/../${USER_B}`), /Invalid user id/);
  });
});
