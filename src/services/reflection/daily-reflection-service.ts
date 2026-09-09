import { STORAGE_KEYS } from '../../constants/storage-keys';
import { EntityId, createUuid, nowIso } from '../../types';
import {
  DAILY_REFLECTION_XP,
  DailyReflectionAnswers,
  DailyReflectionEntry,
} from '../../types/daily-reflection';
import { IStorageService } from '../contracts';
import { extractJournalSignal, formatJournalSignalsForTalk } from '../journal/journal-signal';
import { getXpService } from '../phase10/xp-service';

export class DailyReflectionService {
  constructor(private readonly storage: IStorageService) {}

  private async readMap(): Promise<Record<string, DailyReflectionEntry[]>> {
    return (await this.storage.getItem<Record<string, DailyReflectionEntry[]>>(STORAGE_KEYS.dailyReflections)) ?? {};
  }

  async list(userId: EntityId, days = 90): Promise<DailyReflectionEntry[]> {
    const map = await this.readMap();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return (map[userId] ?? [])
      .filter((entry) => new Date(entry.date) >= cutoff)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  async getToday(userId: EntityId): Promise<DailyReflectionEntry | null> {
    const today = new Date().toISOString().slice(0, 10);
    return (await this.list(userId, 7)).find((entry) => entry.date === today) ?? null;
  }

  async save(
    userId: EntityId,
    answers: DailyReflectionAnswers,
    date = new Date().toISOString().slice(0, 10),
  ): Promise<{ entry: DailyReflectionEntry; xpAwarded: number }> {
    const map = await this.readMap();
    const items = map[userId] ?? [];
    const existing = items.find((entry) => entry.date === date);
    const now = nowIso();
    const entry: DailyReflectionEntry = existing
      ? { ...existing, answers, updatedAt: now }
      : {
          id: createUuid(),
          userId,
          date,
          answers,
          createdAt: now,
          updatedAt: now,
          xpAwarded: false,
        };

    map[userId] = [entry, ...items.filter((item) => item.date !== date)].slice(0, 365);
    await this.storage.setItem(STORAGE_KEYS.dailyReflections, map);

    let xpAwarded = 0;
    if (!entry.xpAwarded && answers.smiled.trim() && answers.grateful.trim()) {
      const result = await getXpService(this.storage).award(
        userId,
        DAILY_REFLECTION_XP,
        'daily_reflection',
        `reflection-${date}`,
      );
      xpAwarded = result.transaction.amount;
      entry.xpAwarded = true;
      map[userId] = map[userId]!.map((item) => (item.id === entry.id ? entry : item));
      await this.storage.setItem(STORAGE_KEYS.dailyReflections, map);
    }

    return { entry, xpAwarded };
  }

  formatForPrompt(entries: DailyReflectionEntry[], limit = 5): string {
    if (!entries.length) return '';
    const signals = entries.slice(0, limit).map((entry) =>
      extractJournalSignal({
        id: entry.id,
        source: 'daily_reflection',
        dateKey: entry.date,
        text: [entry.answers.smiled, entry.answers.challenged, entry.answers.grateful].join(' '),
        occurredAt: entry.updatedAt,
      }),
    );
    return formatJournalSignalsForTalk({
      signals,
      patterns: [],
      userMessage: 'reflection',
      intent: 'journaling',
      explicitRetrieval: false,
    });
  }
}

let instance: DailyReflectionService | null = null;

export function getDailyReflectionService(storage: IStorageService) {
  if (!instance) instance = new DailyReflectionService(storage);
  return instance;
}

export function resetDailyReflectionService() {
  instance = null;
}
