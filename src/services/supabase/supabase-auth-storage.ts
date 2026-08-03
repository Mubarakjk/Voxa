import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

/**
 * Supabase auth storage adapter.
 * Keeps session material in the iOS Keychain / Android Keystore via SecureStore.
 * Values over ~2KB are chunked across SecureStore keys (SecureStore warns / may fail above 2048 bytes).
 * Never places access/refresh tokens in plain AsyncStorage.
 */

const CHUNK_SIZE = 1800;
const CHUNK_META_PREFIX = '__voxa_chunked__:';
const LEGACY_OVERFLOW_PREFIX = '@voxa/secure_overflow:';

async function deleteChunkParts(key: string, count: number) {
  const removals: Promise<void>[] = [];
  for (let i = 0; i < count; i += 1) {
    removals.push(SecureStore.deleteItemAsync(`${key}__${i}`).then(() => undefined).catch(() => undefined));
  }
  await Promise.all(removals);
}

async function readChunked(key: string, meta: string): Promise<string | null> {
  const count = Number(meta.slice(CHUNK_META_PREFIX.length));
  if (!Number.isFinite(count) || count < 1 || count > 64) return null;
  const parts: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const part = await SecureStore.getItemAsync(`${key}__${i}`);
    if (part == null) return null;
    parts.push(part);
  }
  return parts.join('');
}

export const supabaseAuthStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const value = await SecureStore.getItemAsync(key);
      if (value?.startsWith(CHUNK_META_PREFIX)) {
        return readChunked(key, value);
      }
      if (value != null) return value;

      // Legacy: oversized writes that never fit SecureStore may have been dropped.
      // Do not read tokens from AsyncStorage — return null so auth re-establishes cleanly.
      await AsyncStorage.removeItem(`${LEGACY_OVERFLOW_PREFIX}${key}`).catch(() => undefined);
      return null;
    } catch (err) {
      if (__DEV__) console.warn('[Voxa AuthStorage] getItem failed', err);
      return null;
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    try {
      const existing = await SecureStore.getItemAsync(key);
      if (existing?.startsWith(CHUNK_META_PREFIX)) {
        const prevCount = Number(existing.slice(CHUNK_META_PREFIX.length));
        if (Number.isFinite(prevCount) && prevCount > 0) {
          await deleteChunkParts(key, prevCount);
        }
      }

      if (value.length <= CHUNK_SIZE) {
        await SecureStore.setItemAsync(key, value);
        return;
      }

      const count = Math.ceil(value.length / CHUNK_SIZE);
      for (let i = 0; i < count; i += 1) {
        const slice = value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        await SecureStore.setItemAsync(`${key}__${i}`, slice);
      }
      await SecureStore.setItemAsync(key, `${CHUNK_META_PREFIX}${count}`);

      if (__DEV__) {
        console.log('[Voxa AuthStorage] Stored chunked SecureStore value', {
          key,
          bytes: value.length,
          chunks: count,
        });
      }
    } catch (err) {
      if (__DEV__) console.error('[Voxa AuthStorage] setItem failed', err);
      throw err;
    }
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      const existing = await SecureStore.getItemAsync(key);
      if (existing?.startsWith(CHUNK_META_PREFIX)) {
        const count = Number(existing.slice(CHUNK_META_PREFIX.length));
        if (Number.isFinite(count) && count > 0) {
          await deleteChunkParts(key, count);
        }
      }
      await SecureStore.deleteItemAsync(key).catch(() => undefined);
      await AsyncStorage.removeItem(`${LEGACY_OVERFLOW_PREFIX}${key}`).catch(() => undefined);
    } catch (err) {
      if (__DEV__) console.warn('[Voxa AuthStorage] removeItem failed', err);
    }
  },
};
