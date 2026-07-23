import { STORAGE_KEYS } from '../../constants/storage-keys';
import { createUuid, EntityId, nowIso } from '../../types';
import { CosmeticKind, CosmeticReward } from '../../types/phase12-experiences';
import { IStorageService } from '../contracts';

const STARTER_REWARDS: Array<Omit<CosmeticReward, 'id' | 'unlockedAt' | 'equipped'>> = [
  { kind: 'orb_color', title: 'Violet Core', description: 'Classic Voxa purple glow', previewColor: '#8b7cf6' },
  { kind: 'orb_glow', title: 'Soft Pulse', description: 'Gentle breathing glow', previewColor: '#a78bfa' },
  { kind: 'chat_theme', title: 'Midnight', description: 'Deep black chat theme', previewColor: '#12121e' },
  { kind: 'badge', title: 'Early Friend', description: 'New Friend milestone', previewColor: '#6366f1' },
  { kind: 'celebration_effect', title: 'Star Shower', description: 'Level-up celebration', previewColor: '#fbbf24' },
];

export class CosmeticRewardsService {
  constructor(private readonly storage: IStorageService) {}

  async list(userId: EntityId): Promise<CosmeticReward[]> {
    const map = (await this.storage.getItem<Record<string, CosmeticReward[]>>(STORAGE_KEYS.cosmeticRewards)) ?? {};
    return map[userId] ?? [];
  }

  async unlock(userId: EntityId, kind: CosmeticKind, title: string, reason: string, previewColor?: string): Promise<CosmeticReward | null> {
    const items = await this.list(userId);
    if (items.some((r) => r.title === title)) return null;
    const reward: CosmeticReward = {
      id: createUuid(),
      kind,
      title,
      description: reason,
      previewColor,
      unlockReason: reason,
      unlockedAt: nowIso(),
      equipped: false,
    };
    const map = (await this.storage.getItem<Record<string, CosmeticReward[]>>(STORAGE_KEYS.cosmeticRewards)) ?? {};
    map[userId] = [reward, ...(map[userId] ?? [])];
    await this.storage.setItem(STORAGE_KEYS.cosmeticRewards, map);
    return reward;
  }

  async equip(userId: EntityId, id: EntityId, kind: CosmeticKind): Promise<void> {
    const map = (await this.storage.getItem<Record<string, CosmeticReward[]>>(STORAGE_KEYS.cosmeticRewards)) ?? {};
    map[userId] = (map[userId] ?? []).map((r) => ({
      ...r,
      equipped: r.id === id ? true : r.kind === kind ? false : r.equipped,
    }));
    await this.storage.setItem(STORAGE_KEYS.cosmeticRewards, map);
  }

  async seedDefaults(userId: EntityId): Promise<void> {
    const items = await this.list(userId);
    if (items.length) return;
    for (const r of STARTER_REWARDS) {
      await this.unlock(userId, r.kind, r.title, 'Welcome gift', r.previewColor);
    }
    const violet = (await this.list(userId)).find((r) => r.title === 'Violet Core');
    if (violet) await this.equip(userId, violet.id, 'orb_color');
  }

  equipped(items: CosmeticReward[], kind: CosmeticKind): CosmeticReward | null {
    return items.find((r) => r.kind === kind && r.equipped) ?? null;
  }
}

let instance: CosmeticRewardsService | null = null;

export function getCosmeticRewardsService(storage: IStorageService) {
  if (!instance) instance = new CosmeticRewardsService(storage);
  return instance;
}
