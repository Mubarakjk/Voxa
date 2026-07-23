import { STORAGE_KEYS } from '../../constants/storage-keys';
import { createUuid, EntityId, nowIso } from '../../types';
import { CompanionReward } from '../../types/phase10-play';
import { IStorageService } from '../contracts';

const REWARD_TEMPLATES: Array<Omit<CompanionReward, 'id' | 'unlockedAt'>> = [
  { kind: 'wallpaper', title: 'Midnight gradient' },
  { kind: 'quote_card', title: 'Momentum quote card' },
  { kind: 'journal_cover', title: 'Journal cover — Aurora' },
  { kind: 'achievement_art', title: 'Companion celebration art' },
];

export class CompanionRewardsService {
  constructor(private readonly storage: IStorageService) {}

  async list(userId: EntityId): Promise<CompanionReward[]> {
    const map = (await this.storage.getItem<Record<string, CompanionReward[]>>(STORAGE_KEYS.companionRewards)) ?? {};
    return map[userId] ?? [];
  }

  async unlockForLevel(userId: EntityId, level: number): Promise<CompanionReward | null> {
    if (level % 5 !== 0) return null;
    const existing = await this.list(userId);
    const template = REWARD_TEMPLATES[(level / 5 - 1) % REWARD_TEMPLATES.length];
    if (existing.some((r) => r.title === template.title)) return null;

    const reward: CompanionReward = {
      ...template,
      id: createUuid(),
      unlockedAt: nowIso(),
    };
    const map = (await this.storage.getItem<Record<string, CompanionReward[]>>(STORAGE_KEYS.companionRewards)) ?? {};
    map[userId] = [...existing, reward];
    await this.storage.setItem(STORAGE_KEYS.companionRewards, map);
    return reward;
  }
}

let instance: CompanionRewardsService | null = null;

export function getCompanionRewardsService(storage: IStorageService) {
  if (!instance) instance = new CompanionRewardsService(storage);
  return instance;
}
