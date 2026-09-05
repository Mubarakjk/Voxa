/** Confirmed upload path: `{userId}/{conversationId}/{messageId}/{fileName}` */
export const CHAT_ATTACHMENTS_BUCKET = 'chat-attachments';

export type StorageListItem = {
  name: string;
  id: string | null;
};

export type StorageListResult = {
  data: StorageListItem[] | null;
  error: { message: string; name?: string; statusCode?: string } | null;
};

export type StorageRemoveResult = {
  error: { message: string; name?: string; statusCode?: string } | null;
};

export type StorageBucketClient = {
  list: (path: string, options: { limit: number; offset: number }) => Promise<StorageListResult>;
  remove: (paths: string[]) => Promise<StorageRemoveResult>;
};

export type PurgeUserStorageOptions = {
  pageSize?: number;
  removeBatchSize?: number;
  maxListRequests?: number;
};

export type PurgeUserStorageResult = {
  removedCount: number;
  listRequests: number;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Reject malformed IDs so storage prefixes cannot escape the user's folder. */
export function assertSafeUserStoragePrefix(userId: string): void {
  if (!UUID_PATTERN.test(userId)) {
    throw new Error('Invalid user id for storage purge');
  }
}

export function buildUserAttachmentPrefix(userId: string): string {
  assertSafeUserStoragePrefix(userId);
  return userId;
}

function joinStoragePath(prefix: string, name: string): string {
  return prefix ? `${prefix}/${name}` : name;
}

function isStorageFolder(item: StorageListItem): boolean {
  return item.id == null;
}

/**
 * Recursively discover every file object beneath `prefix`.
 * Supabase returns immediate children per list call; folders have `id: null`.
 */
export async function listAllStorageObjectPaths(
  bucket: StorageBucketClient,
  prefix: string,
  options: PurgeUserStorageOptions = {},
): Promise<{ paths: string[]; listRequests: number }> {
  const pageSize = options.pageSize ?? 100;
  const maxListRequests = options.maxListRequests ?? 500;
  const paths: string[] = [];
  let listRequests = 0;

  async function walk(currentPrefix: string): Promise<void> {
    let offset = 0;
    while (true) {
      listRequests += 1;
      if (listRequests > maxListRequests) {
        throw new Error('storage_list_limit_exceeded');
      }

      const { data, error } = await bucket.list(currentPrefix, { limit: pageSize, offset });
      if (error) {
        throw new Error(`storage_list_failed:${error.message}`);
      }

      const entries = data ?? [];
      if (entries.length === 0) {
        break;
      }

      for (const entry of entries) {
        const entryPath = joinStoragePath(currentPrefix, entry.name);
        if (isStorageFolder(entry)) {
          await walk(entryPath);
        } else {
          paths.push(entryPath);
        }
      }

      if (entries.length < pageSize) {
        break;
      }
      offset += pageSize;
    }
  }

  await walk(prefix);
  return { paths, listRequests };
}

/** Remove every object under `{userId}/` in the chat-attachments bucket. */
export async function purgeUserChatAttachments(
  bucket: StorageBucketClient,
  userId: string,
  options: PurgeUserStorageOptions = {},
): Promise<PurgeUserStorageResult> {
  const prefix = buildUserAttachmentPrefix(userId);
  const removeBatchSize = options.removeBatchSize ?? 100;
  const { paths, listRequests } = await listAllStorageObjectPaths(bucket, prefix, options);

  if (paths.length === 0) {
    return { removedCount: 0, listRequests };
  }

  for (let index = 0; index < paths.length; index += removeBatchSize) {
    const batch = paths.slice(index, index + removeBatchSize);
    for (const path of batch) {
      if (!path.startsWith(`${prefix}/`) && path !== prefix) {
        throw new Error('storage_remove_out_of_scope');
      }
    }

    const { error } = await bucket.remove(batch);
    if (error) {
      throw new Error(`storage_remove_failed:${error.message}`);
    }
  }

  return { removedCount: paths.length, listRequests };
}
