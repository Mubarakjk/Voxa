import { STORAGE_KEYS } from '../../constants/storage-keys';
import { createUuid, EntityId, nowIso } from '../../types';
import { MoodEntry, MoodInsight, MoodLevel } from '../../types/phase12-experiences';
import { IStorageService } from '../contracts';

const MIN_INSIGHT_POINTS = 5;

export class MoodJournalService {
  constructor(private readonly storage: IStorageService) {}

  async list(userId: EntityId, days = 90): Promise<MoodEntry[]> {
    const map = (await this.storage.getItem<Record<string, MoodEntry[]>>(STORAGE_KEYS.moodJournalEntries)) ?? {};
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return (map[userId] ?? [])
      .filter((e) => new Date(e.date) >= cutoff)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  async getToday(userId: EntityId): Promise<MoodEntry | null> {
    const today = new Date().toISOString().slice(0, 10);
    return (await this.list(userId, 7)).find((e) => e.date === today) ?? null;
  }

  async save(userId: EntityId, entry: Omit<MoodEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<MoodEntry> {
    const map = (await this.storage.getItem<Record<string, MoodEntry[]>>(STORAGE_KEYS.moodJournalEntries)) ?? {};
    const items = map[userId] ?? [];
    const existing = items.find((e) => e.date === entry.date);
    const saved: MoodEntry = existing
      ? { ...existing, ...entry, updatedAt: nowIso() }
      : { ...entry, id: createUuid(), userId, createdAt: nowIso(), updatedAt: nowIso() };
    map[userId] = [saved, ...items.filter((e) => e.date !== entry.date)].slice(0, 365);
    await this.storage.setItem(STORAGE_KEYS.moodJournalEntries, map);
    const { getMoodIntelligenceService } = await import('../intelligence/mood-intelligence-service');
    void getMoodIntelligenceService(this.storage).recordJournalEntry(userId, saved);
    return saved;
  }

  async delete(userId: EntityId, id: EntityId): Promise<void> {
    const map = (await this.storage.getItem<Record<string, MoodEntry[]>>(STORAGE_KEYS.moodJournalEntries)) ?? {};
    map[userId] = (map[userId] ?? []).filter((e) => e.id !== id);
    await this.storage.setItem(STORAGE_KEYS.moodJournalEntries, map);
  }

  weekAverage(entries: MoodEntry[], field: keyof Pick<MoodEntry, 'mood' | 'energy' | 'stress' | 'confidence'>): number | null {
    if (!entries.length) return null;
    const sum = entries.reduce((acc, e) => acc + (e[field] as MoodLevel), 0);
    return Math.round((sum / entries.length) * 10) / 10;
  }
}

export class MoodInsightsEngine {
  constructor(private readonly storage: IStorageService) {}

  async generate(userId: EntityId, entries: MoodEntry[], gymDays: string[]): Promise<MoodInsight | null> {
    const dismissed = (await this.storage.getItem<string[]>(STORAGE_KEYS.moodInsightDismissed)) ?? [];
    if (entries.length < MIN_INSIGHT_POINTS) return null;

    const gymSet = new Set(gymDays);
    const withGym = entries.filter((e) => e.tags.includes('gym') || gymSet.has(e.date));
    const withoutGym = entries.filter((e) => !e.tags.includes('gym') && !gymSet.has(e.date));

    if (withGym.length >= 3 && withoutGym.length >= 3) {
      const gymAvg = withGym.reduce((s, e) => s + e.mood, 0) / withGym.length;
      const otherAvg = withoutGym.reduce((s, e) => s + e.mood, 0) / withoutGym.length;
      if (gymAvg - otherAvg >= 0.4) {
        const insight: MoodInsight = {
          id: createUuid(),
          userId,
          line: 'Your mood entries are usually higher on gym days.',
          dataPoints: withGym.length + withoutGym.length,
          confidence: withGym.length >= 5 ? 'high' : 'medium',
          metric: 'mood vs gym',
          nextStep: 'If it helps, schedule gym on days you expect to feel flat.',
          dismissed: false,
          createdAt: nowIso(),
        };
        if (!dismissed.includes(insight.line)) return insight;
      }
    }

    const lowSleep = entries.filter((e) => e.sleepQuality <= 2);
    const goodSleep = entries.filter((e) => e.sleepQuality >= 4);
    if (lowSleep.length >= 3 && goodSleep.length >= 2) {
      const lowEnergy = lowSleep.reduce((s, e) => s + e.energy, 0) / lowSleep.length;
      const highEnergy = goodSleep.reduce((s, e) => s + e.energy, 0) / goodSleep.length;
      if (highEnergy - lowEnergy >= 0.5) {
        const insight: MoodInsight = {
          id: createUuid(),
          userId,
          line: 'You have logged lower energy after sleeping poorly.',
          dataPoints: lowSleep.length + goodSleep.length,
          confidence: 'medium',
          metric: 'energy vs sleep',
          nextStep: 'Worth protecting one earlier wind-down this week — correlation, not a diagnosis.',
          dismissed: false,
          createdAt: nowIso(),
        };
        if (!dismissed.includes(insight.line)) return insight;
      }
    }

    const byWeekday: Record<number, MoodEntry[]> = {};
    for (const e of entries) {
      const d = new Date(e.date).getDay();
      byWeekday[d] = [...(byWeekday[d] ?? []), e];
    }
    const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    let worstDay = -1;
    let worstAvg = 6;
    for (const [day, list] of Object.entries(byWeekday)) {
      if (list.length < 2) continue;
      const avg = list.reduce((s, e) => s + e.stress, 0) / list.length;
      if (avg < worstAvg) {
        worstAvg = avg;
        worstDay = Number(day);
      }
    }
    if (worstDay >= 0 && byWeekday[worstDay]!.length >= MIN_INSIGHT_POINTS) {
      const insight: MoodInsight = {
        id: createUuid(),
        userId,
        line: `${weekdayNames[worstDay]} has been your most stressful day recently.`,
        dataPoints: byWeekday[worstDay]!.length,
        confidence: 'medium',
        metric: 'stress by weekday',
        nextStep: 'Maybe plan something restorative the night before.',
        dismissed: false,
        createdAt: nowIso(),
      };
      if (!dismissed.includes(insight.line)) return insight;
    }

    return null;
  }

  async dismiss(line: string): Promise<void> {
    const list = (await this.storage.getItem<string[]>(STORAGE_KEYS.moodInsightDismissed)) ?? [];
    if (!list.includes(line)) {
      await this.storage.setItem(STORAGE_KEYS.moodInsightDismissed, [...list, line]);
    }
  }
}

let journalInstance: MoodJournalService | null = null;
let insightInstance: MoodInsightsEngine | null = null;

export function getMoodJournalService(storage: IStorageService) {
  if (!journalInstance) journalInstance = new MoodJournalService(storage);
  return journalInstance;
}

export function getMoodInsightsEngine(storage: IStorageService) {
  if (!insightInstance) insightInstance = new MoodInsightsEngine(storage);
  return insightInstance;
}
