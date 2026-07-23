import { STORAGE_KEYS } from '../../constants/storage-keys';
import { IStorageService } from '../contracts';
import { EntityId } from '../../types';

/** Generic local-first store for Phase 5 Life OS entities. */
export class LifeOSStore {
  constructor(private readonly storage: IStorageService) {}

  async list<T extends { userId: EntityId }>(key: string, userId: EntityId): Promise<T[]> {
    const map = (await this.storage.getItem<Record<string, T[]>>(key)) ?? {};
    return (map[userId] ?? []).sort((a, b) => {
      const aTime = (a as { updatedAt?: string; savedAt?: string; createdAt?: string }).updatedAt
        ?? (a as { savedAt?: string }).savedAt
        ?? (a as { createdAt?: string }).createdAt
        ?? '';
      const bTime = (b as { updatedAt?: string; savedAt?: string; createdAt?: string }).updatedAt
        ?? (b as { savedAt?: string }).savedAt
        ?? (b as { createdAt?: string }).createdAt
        ?? '';
      return bTime.localeCompare(aTime);
    });
  }

  async get<T extends { id: EntityId }>(key: string, userId: EntityId, id: EntityId): Promise<T | null> {
    const items = await this.list<T & { userId: EntityId }>(key, userId);
    return items.find((i) => i.id === id) ?? null;
  }

  async getOne<T>(key: string, userId: EntityId): Promise<T | null> {
    const map = (await this.storage.getItem<Record<string, T>>(key)) ?? {};
    return map[userId] ?? null;
  }

  async upsert<T extends { userId: EntityId; id: EntityId }>(key: string, item: T): Promise<T> {
    const map = (await this.storage.getItem<Record<string, T[]>>(key)) ?? {};
    const list = map[item.userId] ?? [];
    const idx = list.findIndex((i) => i.id === item.id);
    if (idx >= 0) list[idx] = item;
    else list.unshift(item);
    map[item.userId] = list;
    await this.storage.setItem(key, map);
    return item;
  }

  async upsertOne<T>(key: string, userId: EntityId, item: T): Promise<T> {
    const map = (await this.storage.getItem<Record<string, T>>(key)) ?? {};
    map[userId] = item;
    await this.storage.setItem(key, map);
    return item;
  }

  async remove(key: string, userId: EntityId, id: EntityId): Promise<void> {
    const map = (await this.storage.getItem<Record<string, Array<{ id: EntityId }>>>(key)) ?? {};
    map[userId] = (map[userId] ?? []).filter((i) => i.id !== id);
    await this.storage.setItem(key, map);
  }

  async listByGoal<T extends { goalId: EntityId }>(key: string, userId: EntityId, goalId: EntityId): Promise<T[]> {
    const all = await this.list<T & { userId: EntityId }>(key, userId);
    return all.filter((i) => i.goalId === goalId);
  }
}

let instance: LifeOSStore | null = null;

export function getLifeOSStore(storage: IStorageService): LifeOSStore {
  if (!instance) instance = new LifeOSStore(storage);
  return instance;
}

export const LIFE_OS_KEYS = {
  goalPlans: STORAGE_KEYS.goalPlans,
  goalMilestones: STORAGE_KEYS.goalMilestones,
  goalNotes: STORAGE_KEYS.goalNotes,
  futureSelf: STORAGE_KEYS.futureSelfProfiles,
  visionBoard: STORAGE_KEYS.visionBoardV5,
  bucketList: STORAGE_KEYS.bucketListV5,
  dreamEntries: STORAGE_KEYS.dreamEntries,
  savedDecisions: STORAGE_KEYS.savedDecisions,
  debateResults: STORAGE_KEYS.debateResults,
  coachScores: STORAGE_KEYS.coachScores,
  memoryConnections: STORAGE_KEYS.memoryConnections,
  lifeBookChapters: STORAGE_KEYS.lifeBookChapters,
  memoryMovie: STORAGE_KEYS.memoryMovieStoryboards,
} as const;
