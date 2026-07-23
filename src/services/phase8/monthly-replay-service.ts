import { STORAGE_KEYS } from '../../constants/storage-keys';
import { createUuid, EntityId, Goal, Memory, nowIso } from '../../types';
import { CompanionIntelligenceBundle } from '../../types/companion-intelligence';
import { MonthlyReplayData } from '../../types/phase8-retention';
import { TodayRoutineSummary } from '../../types/routine';
import { IStorageService } from '../contracts';

export function buildMonthlyReplay(input: {
  bundle: CompanionIntelligenceBundle;
  memories: Memory[];
  goals: Goal[];
  routine: TodayRoutineSummary;
  moodHistory: Array<{ label: string; date: string }>;
  now?: Date;
}): MonthlyReplayData {
  const now = input.now ?? new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthLabel = now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const inMonth = (iso: string) => new Date(iso) >= monthStart;

  const monthMemories = input.memories.filter((m) => inMonth(m.createdAt));
  const completedGoals = input.goals.filter((g) => g.status === 'completed' && inMonth(g.updatedAt ?? g.createdAt));
  const photoCount = monthMemories.filter((m) => m.tags?.includes('photo-memory')).length;

  const topics = input.bundle.relationship.favouriteTopics;
  const moods = input.moodHistory.filter((m) => inMonth(m.date)).map((m) => m.label);
  const moodTrend = moods.length >= 2
    ? `Mostly ${moods.slice(0, 5).join(', ')}`
    : null;

  const biggestAchievement = completedGoals[0]?.title
    ?? monthMemories.find((m) => m.importance >= 7)?.title
    ?? null;

  const bestMemory = monthMemories.sort((a, b) => b.importance - a.importance)[0];

  const lessons: string[] = [];
  if (input.routine.completionPercent >= 50) lessons.push('You showed up for your routines.');
  if (completedGoals.length > 0) lessons.push(`You completed ${completedGoals.length} goal${completedGoals.length > 1 ? 's' : ''}.`);
  if (input.bundle.relationship.conversationCount > 0) lessons.push('We kept the conversation going.');

  return {
    monthLabel,
    biggestAchievement,
    mostDiscussedTopic: topics[0] ?? null,
    moodTrend,
    routineConsistency: `${input.routine.completionPercent}% routine completion recently`,
    favouriteConversation: input.bundle.weeklyReflections[0]?.favouriteConversation ?? null,
    bestMemory: bestMemory ? bestMemory.title : null,
    goalsCompleted: completedGoals.length,
    lessonsLearned: lessons.slice(0, 4),
    photoCount,
    generatedAt: nowIso(),
  };
}

export class MonthlyReplayService {
  constructor(private readonly storage: IStorageService) {}

  async getCached(userId: EntityId): Promise<MonthlyReplayData | null> {
    const map = (await this.storage.getItem<Record<string, MonthlyReplayData>>(STORAGE_KEYS.monthlyReplays)) ?? {};
    const cached = map[userId];
    if (!cached) return null;
    const month = new Date().toISOString().slice(0, 7);
    if (cached.generatedAt.slice(0, 7) !== month) return null;
    return cached;
  }

  async save(userId: EntityId, replay: MonthlyReplayData): Promise<void> {
    const map = (await this.storage.getItem<Record<string, MonthlyReplayData>>(STORAGE_KEYS.monthlyReplays)) ?? {};
    map[userId] = replay;
    await this.storage.setItem(STORAGE_KEYS.monthlyReplays, map);
  }
}

let instance: MonthlyReplayService | null = null;

export function getMonthlyReplayService(storage: IStorageService) {
  if (!instance) instance = new MonthlyReplayService(storage);
  return instance;
}
