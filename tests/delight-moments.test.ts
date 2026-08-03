import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DelightMomentsService } from '../src/services/intelligence/delight-moments-service';
import { createDefaultIntelligenceBundle } from '../src/types/companion-intelligence';

describe('DelightMomentsService shownIds contract', () => {
  it('does not throw when shownIds is a corrupted non-array', () => {
    const service = new DelightMomentsService();
    const bundle = createDefaultIntelligenceBundle('user-1', 'Alex', new Date().toISOString());

    assert.doesNotThrow(() => {
      service.detect({
        bundle,
        goals: [],
        memories: [],
        shownIds: { '0': 'old-id' } as unknown as string[],
      });
    });
  });

  it('migrates corrupted storage to an empty string array', async () => {
    const store = new Map<string, unknown>();
    const storage = {
      getItem: async <T,>(key: string) => (store.has(key) ? (store.get(key) as T) : null),
      setItem: async <T,>(key: string, value: T) => {
        store.set(key, value);
      },
      removeItem: async (key: string) => {
        store.delete(key);
      },
      multiRemove: async (keys: string[]) => {
        keys.forEach((key) => store.delete(key));
      },
    };

    store.set('@voxa/delight_shown', { shown: true });
    const service = new DelightMomentsService(storage);
    const shown = await service.loadShownIds();
    assert.deepEqual(shown, []);
    assert.deepEqual(store.get('@voxa/delight_shown'), []);
  });
});
