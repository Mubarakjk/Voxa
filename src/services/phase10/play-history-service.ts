import { STORAGE_KEYS } from '../../constants/storage-keys';
import { createUuid, EntityId, nowIso } from '../../types';
import { DailyChallenge, PlayHistoryEntry, WeeklyMission } from '../../types/phase10-play';
import { IStorageService } from '../contracts';

export class PlayHistoryService {
  constructor(private readonly storage: IStorageService) {}

  async append(userId: EntityId, entry: Omit<PlayHistoryEntry, 'id' | 'userId' | 'at'>): Promise<void> {
    const map = (await this.storage.getItem<Record<string, PlayHistoryEntry[]>>(STORAGE_KEYS.playHistory)) ?? {};
    const item: PlayHistoryEntry = {
      id: createUuid(),
      userId,
      at: nowIso(),
      ...entry,
    };
    map[userId] = [item, ...(map[userId] ?? [])].slice(0, 100);
    await this.storage.setItem(STORAGE_KEYS.playHistory, map);
  }

  async list(userId: EntityId, limit = 12): Promise<PlayHistoryEntry[]> {
    const map = (await this.storage.getItem<Record<string, PlayHistoryEntry[]>>(STORAGE_KEYS.playHistory)) ?? {};
    return (map[userId] ?? []).slice(0, limit);
  }

  async listChallenges(userId: EntityId): Promise<DailyChallenge[]> {
    const map = (await this.storage.getItem<Record<string, DailyChallenge>>(STORAGE_KEYS.dailyChallenges)) ?? {};
    return Object.values(map)
      .filter((c) => c.userId === userId && c.status === 'completed')
      .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
      .slice(0, 8);
  }

  async listMissions(userId: EntityId): Promise<WeeklyMission[]> {
    const map = (await this.storage.getItem<Record<string, WeeklyMission>>(STORAGE_KEYS.weeklyMissions)) ?? {};
    return Object.values(map)
      .filter((m) => m.userId === userId && (m.completed || m.status === 'abandoned'))
      .sort((a, b) => b.weekKey.localeCompare(a.weekKey))
      .slice(0, 6);
  }
}

let instance: PlayHistoryService | null = null;

export function getPlayHistoryService(storage: IStorageService) {
  if (!instance) instance = new PlayHistoryService(storage);
  return instance;
}
