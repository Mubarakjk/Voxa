import { STORAGE_KEYS } from '../../constants/storage-keys';
import { createUuid, EntityId, nowIso } from '../../types';
import {
  CHALLENGE_TEMPLATES,
  ChallengeTemplateId,
  SharedChallenge,
} from '../../types/phase8-retention';
import { IStorageService } from '../contracts';

export class SharedChallengesService {
  constructor(private readonly storage: IStorageService) {}

  listTemplates() {
    return CHALLENGE_TEMPLATES;
  }

  async list(userId: EntityId): Promise<SharedChallenge[]> {
    const map = (await this.storage.getItem<Record<string, SharedChallenge[]>>(STORAGE_KEYS.sharedChallenges)) ?? {};
    return (map[userId] ?? []).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }

  async getActive(userId: EntityId): Promise<SharedChallenge | null> {
    return (await this.list(userId)).find((c) => c.status === 'active') ?? null;
  }

  async start(userId: EntityId, templateId: ChallengeTemplateId): Promise<SharedChallenge> {
    const template = CHALLENGE_TEMPLATES.find((t) => t.id === templateId);
    if (!template) throw new Error('Unknown challenge');

    const existing = await this.list(userId);
    const paused = existing.map((c) => (c.status === 'active' ? { ...c, status: 'paused' as const } : c));

    const challenge: SharedChallenge = {
      id: createUuid(),
      userId,
      templateId,
      title: template.title,
      description: template.description,
      durationDays: template.durationDays,
      startedAt: nowIso(),
      completedDays: 0,
      streakDays: 0,
      status: 'active',
    };

    await this.save(userId, [challenge, ...paused]);
    return challenge;
  }

  async checkInToday(userId: EntityId, challengeId: EntityId): Promise<SharedChallenge | null> {
    const items = await this.list(userId);
    const idx = items.findIndex((c) => c.id === challengeId);
    if (idx < 0) return null;

    const today = new Date().toISOString().slice(0, 10);
    const c = items[idx];
    if (c.lastCheckInDate === today) return c;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().slice(0, 10);
    const newStreak = c.lastCheckInDate === yStr ? c.streakDays + 1 : 1;
    const completedDays = c.completedDays + 1;
    const done = completedDays >= c.durationDays;

    items[idx] = {
      ...c,
      completedDays,
      streakDays: newStreak,
      lastCheckInDate: today,
      status: done ? 'completed' : 'active',
      completedAt: done ? nowIso() : undefined,
    };
    await this.save(userId, items);
    return items[idx];
  }

  private async save(userId: EntityId, items: SharedChallenge[]) {
    const map = (await this.storage.getItem<Record<string, SharedChallenge[]>>(STORAGE_KEYS.sharedChallenges)) ?? {};
    map[userId] = items.slice(0, 20);
    await this.storage.setItem(STORAGE_KEYS.sharedChallenges, map);
  }
}

let instance: SharedChallengesService | null = null;

export function getSharedChallengesService(storage: IStorageService) {
  if (!instance) instance = new SharedChallengesService(storage);
  return instance;
}
