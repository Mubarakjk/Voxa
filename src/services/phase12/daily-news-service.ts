import { STORAGE_KEYS } from '../../constants/storage-keys';
import { createUuid, EntityId, nowIso } from '../../types';
import { DailyNewsDigest, DailyNewsItem } from '../../types/phase12-experiences';
import { Goal, Memory } from '../../types';
import { IStorageService } from '../contracts';

export type NewsBuildInput = {
  userId: EntityId;
  firstName: string;
  goals: Goal[];
  memories: Memory[];
  todayFocus?: string | null;
  streakDays?: number;
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export class DailyNewsService {
  constructor(private readonly storage: IStorageService) {}

  async getToday(userId: EntityId): Promise<DailyNewsDigest | null> {
    const map = (await this.storage.getItem<Record<string, DailyNewsDigest[]>>(STORAGE_KEYS.dailyNewsDigests)) ?? {};
    const key = todayKey();
    return (map[userId] ?? []).find((d) => d.date === key) ?? null;
  }

  async build(input: NewsBuildInput): Promise<DailyNewsDigest> {
    const cached = await this.getToday(input.userId);
    if (cached) return cached;

    const items: DailyNewsItem[] = [];
    const activeGoal = input.goals.find((g) => g.status === 'active');

    items.push({
      id: createUuid(),
      title: 'Your day with Voxa',
      summary: input.todayFocus
        ? `Today's focus: ${input.todayFocus}`
        : activeGoal
          ? `Still moving on "${activeGoal.title}".`
          : 'A fresh day — pick one thing that matters.',
      category: 'personal',
      publishedAt: nowIso(),
    });

    if (input.streakDays && input.streakDays >= 3) {
      items.push({
        id: createUuid(),
        title: 'Streak update',
        summary: `${input.streakDays} days of showing up. Consistency compounds.`,
        category: 'wellness',
        publishedAt: nowIso(),
      });
    }

    const recentMem = input.memories[0];
    if (recentMem) {
      items.push({
        id: createUuid(),
        title: 'On your mind',
        summary: `Voxa remembers "${recentMem.title}" — worth a callback today?`,
        category: 'companion',
        publishedAt: nowIso(),
      });
    }

    items.push({
      id: createUuid(),
      title: 'Wellness note',
      summary: 'Small steps beat perfect plans. Hydrate, move, rest.',
      category: 'wellness',
      source: 'Voxa Daily',
      publishedAt: nowIso(),
    });

    items.push({
      id: createUuid(),
      title: 'Tech & tools',
      summary: 'Use Talk composer shortcuts to plan, coach, or reflect in one tap.',
      category: 'tech',
      source: 'Voxa Daily',
      publishedAt: nowIso(),
    });

    const digest: DailyNewsDigest = {
      date: todayKey(),
      userId: input.userId,
      headline: `Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, ${input.firstName}`,
      items,
      companionTake: activeGoal
        ? `If you only do one thing today, let it connect to "${activeGoal.title}".`
        : 'Pick one small win before the day runs away.',
      cachedAt: nowIso(),
    };

    const map = (await this.storage.getItem<Record<string, DailyNewsDigest[]>>(STORAGE_KEYS.dailyNewsDigests)) ?? {};
    map[input.userId] = [digest, ...(map[input.userId] ?? []).filter((d) => d.date !== digest.date)].slice(0, 30);
    await this.storage.setItem(STORAGE_KEYS.dailyNewsDigests, map);
    return digest;
  }
}

let instance: DailyNewsService | null = null;

export function getDailyNewsService(storage: IStorageService) {
  if (!instance) instance = new DailyNewsService(storage);
  return instance;
}
