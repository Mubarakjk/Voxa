import { STORAGE_KEYS } from '../../constants/storage-keys';
import { EntityId, nowIso } from '../../types';
import { ArcadeGameId, EnjoymentProfile } from '../../types/phase10-play';
import { IStorageService } from '../contracts';

export class EnjoymentTrackingService {
  constructor(private readonly storage: IStorageService) {}

  async get(userId: EntityId): Promise<EnjoymentProfile> {
    const map = (await this.storage.getItem<Record<string, EnjoymentProfile>>(STORAGE_KEYS.enjoymentProfile)) ?? {};
    return map[userId] ?? {
      favouriteGames: [],
      favouriteActivities: [],
      favouriteTopics: [],
      humourPreference: 'medium',
      updatedAt: nowIso(),
    };
  }

  async recordGame(userId: EntityId, gameId: ArcadeGameId): Promise<void> {
    const profile = await this.get(userId);
    const games = [gameId, ...profile.favouriteGames.filter((g) => g !== gameId)].slice(0, 5);
    await this.save(userId, { ...profile, favouriteGames: games });
  }

  async recordActivity(userId: EntityId, activityId: string): Promise<void> {
    const profile = await this.get(userId);
    const activities = [activityId, ...profile.favouriteActivities.filter((a) => a !== activityId)].slice(0, 8);
    await this.save(userId, { ...profile, favouriteActivities: activities });
  }

  async recordTopic(userId: EntityId, topic: string): Promise<void> {
    const profile = await this.get(userId);
    const topics = [topic, ...profile.favouriteTopics.filter((t) => t !== topic)].slice(0, 10);
    await this.save(userId, { ...profile, favouriteTopics: topics });
  }

  private async save(userId: EntityId, profile: EnjoymentProfile): Promise<void> {
    const map = (await this.storage.getItem<Record<string, EnjoymentProfile>>(STORAGE_KEYS.enjoymentProfile)) ?? {};
    map[userId] = { ...profile, updatedAt: nowIso() };
    await this.storage.setItem(STORAGE_KEYS.enjoymentProfile, map);
  }
}

let instance: EnjoymentTrackingService | null = null;

export function getEnjoymentTrackingService(storage: IStorageService) {
  if (!instance) instance = new EnjoymentTrackingService(storage);
  return instance;
}
