import { STORAGE_KEYS } from '../../constants/storage-keys';
import { createUuid, EntityId, nowIso } from '../../types';
import {
  ChallengeDayEntry,
  ChallengeTemplateId,
  CheckInStyle,
  CompanionChallengeV2,
} from '../../types/phase12-experiences';
import { IStorageService } from '../contracts';

export const CHALLENGE_TEMPLATES: Array<{ id: ChallengeTemplateId; title: string; days: number; target: string }> = [
  { id: '7_day_reset', title: '7-Day Reset', days: 7, target: 'One small win each day' },
  { id: '30_day_coding', title: '30-Day Coding', days: 30, target: 'Code for 30 minutes' },
  { id: 'gym_consistency', title: 'Gym Consistency', days: 14, target: 'Show up at the gym' },
  { id: 'daily_walking', title: 'Daily Walking', days: 14, target: 'Walk 20 minutes' },
  { id: 'read_daily', title: 'Read Every Day', days: 21, target: 'Read for 15 minutes' },
  { id: 'earlier_sleep', title: 'Earlier Sleep', days: 14, target: 'Wind down by target time' },
  { id: 'earlier_wake', title: 'Earlier Wake-Up', days: 14, target: 'Get up on time' },
  { id: 'hydration', title: 'Hydration', days: 7, target: 'Drink enough water' },
  { id: 'daily_journal', title: 'Daily Journal', days: 14, target: 'Write a short entry' },
  { id: 'study_sprint', title: 'Study Sprint', days: 7, target: 'Focused study block' },
  { id: 'no_fizzy', title: 'No Fizzy Drinks', days: 14, target: 'Skip fizzy drinks' },
  { id: 'confidence_practice', title: 'Confidence Practice', days: 7, target: 'One brave small action' },
  { id: 'startup_sprint', title: 'Startup Sprint', days: 14, target: 'Ship one thing daily' },
  { id: 'social_confidence', title: 'Social Confidence', days: 7, target: 'One social step' },
  { id: 'custom', title: 'Custom Challenge', days: 7, target: 'Your daily target' },
];

export class CompanionChallengeV2Service {
  constructor(private readonly storage: IStorageService) {}

  async list(userId: EntityId): Promise<CompanionChallengeV2[]> {
    const map = (await this.storage.getItem<Record<string, CompanionChallengeV2[]>>(STORAGE_KEYS.companionChallengesV2)) ?? {};
    return map[userId] ?? [];
  }

  async getActive(userId: EntityId): Promise<CompanionChallengeV2 | null> {
    return (await this.list(userId)).find((c) => c.status === 'active' || c.status === 'paused') ?? null;
  }

  async start(userId: EntityId, templateId: ChallengeTemplateId, opts?: Partial<CompanionChallengeV2>): Promise<CompanionChallengeV2> {
    const tpl = CHALLENGE_TEMPLATES.find((t) => t.id === templateId)!;
    const challenge: CompanionChallengeV2 = {
      id: createUuid(),
      userId,
      templateId,
      title: tpl.title,
      durationDays: tpl.days,
      dailyTarget: tpl.target,
      difficulty: 'medium',
      coachStyle: 'friendly' as CheckInStyle,
      accountabilityLevel: 'balanced',
      status: 'active',
      startedAt: nowIso(),
      completedDays: 0,
      currentStreak: 0,
      bestStreak: 0,
      adherencePercent: 0,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      ...opts,
    };
    await this.save(userId, challenge);
    return challenge;
  }

  async completeDay(userId: EntityId, challengeId: EntityId, note?: string): Promise<CompanionChallengeV2 | null> {
    const challenge = (await this.list(userId)).find((c) => c.id === challengeId);
    if (!challenge) return null;
    const today = new Date().toISOString().slice(0, 10);
    await this.saveDayEntry(challengeId, { id: createUuid(), challengeId, date: today, status: 'completed', note });
    const completedDays = challenge.completedDays + 1;
    const currentStreak = challenge.currentStreak + 1;
    const updated: CompanionChallengeV2 = {
      ...challenge,
      completedDays,
      currentStreak,
      bestStreak: Math.max(challenge.bestStreak, currentStreak),
      adherencePercent: Math.min(100, Math.round((completedDays / challenge.durationDays) * 100)),
      status: completedDays >= challenge.durationDays ? 'completed' : 'active',
      updatedAt: nowIso(),
    };
    await this.save(userId, updated);
    return updated;
  }

  async skipDay(userId: EntityId, challengeId: EntityId): Promise<CompanionChallengeV2 | null> {
    const challenge = (await this.list(userId)).find((c) => c.id === challengeId);
    if (!challenge) return null;
    const today = new Date().toISOString().slice(0, 10);
    await this.saveDayEntry(challengeId, { id: createUuid(), challengeId, date: today, status: 'skipped' });
    const updated = { ...challenge, currentStreak: 0, updatedAt: nowIso() };
    await this.save(userId, updated);
    return updated;
  }

  async pause(userId: EntityId, id: EntityId): Promise<void> {
    await this.setStatus(userId, id, 'paused');
  }

  async resume(userId: EntityId, id: EntityId): Promise<void> {
    await this.setStatus(userId, id, 'active');
  }

  async abandon(userId: EntityId, id: EntityId): Promise<void> {
    await this.setStatus(userId, id, 'abandoned');
  }

  async dayEntries(challengeId: EntityId): Promise<ChallengeDayEntry[]> {
    const map = (await this.storage.getItem<Record<string, ChallengeDayEntry[]>>(STORAGE_KEYS.challengeDayEntries)) ?? {};
    return map[challengeId] ?? [];
  }

  private async saveDayEntry(challengeId: EntityId, entry: ChallengeDayEntry): Promise<void> {
    const map = (await this.storage.getItem<Record<string, ChallengeDayEntry[]>>(STORAGE_KEYS.challengeDayEntries)) ?? {};
    map[challengeId] = [entry, ...(map[challengeId] ?? []).filter((e) => e.date !== entry.date)];
    await this.storage.setItem(STORAGE_KEYS.challengeDayEntries, map);
  }

  private async save(userId: EntityId, challenge: CompanionChallengeV2): Promise<void> {
    const map = (await this.storage.getItem<Record<string, CompanionChallengeV2[]>>(STORAGE_KEYS.companionChallengesV2)) ?? {};
    const items = map[userId] ?? [];
    const idx = items.findIndex((c) => c.id === challenge.id);
    if (idx >= 0) items[idx] = challenge;
    else items.unshift(challenge);
    map[userId] = items.slice(0, 20);
    await this.storage.setItem(STORAGE_KEYS.companionChallengesV2, map);
  }

  private async setStatus(userId: EntityId, id: EntityId, status: CompanionChallengeV2['status']): Promise<void> {
    const items = await this.list(userId);
    const item = items.find((c) => c.id === id);
    if (item) await this.save(userId, { ...item, status, updatedAt: nowIso() });
  }
}

let instance: CompanionChallengeV2Service | null = null;

export function getCompanionChallengeV2Service(storage: IStorageService) {
  if (!instance) instance = new CompanionChallengeV2Service(storage);
  return instance;
}
