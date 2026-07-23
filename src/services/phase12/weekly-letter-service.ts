import { STORAGE_KEYS } from '../../constants/storage-keys';
import { createUuid, EntityId, nowIso } from '../../types';
import { Goal, Memory } from '../../types';
import { WeeklyCompanionLetter } from '../../types/phase12-experiences';
import { CompanionIntelligenceBundle } from '../../types/companion-intelligence';
import { TodayRoutineSummary } from '../../types/routine';
import { IStorageService } from '../contracts';

function weekKey(date = new Date()): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}

export type LetterInput = {
  userId: EntityId;
  firstName: string;
  bundle: CompanionIntelligenceBundle;
  memories: Memory[];
  goals: Goal[];
  routine: TodayRoutineSummary;
  conversationCount: number;
  challengeTitle?: string | null;
  moodNote?: string | null;
  photoTitle?: string | null;
};

function hasEnoughData(input: LetterInput): boolean {
  return input.conversationCount >= 3 || input.memories.length >= 2 || input.goals.length >= 1;
}

export function buildWeeklyLetter(input: LetterInput): WeeklyCompanionLetter | null {
  if (!hasEnoughData(input)) return null;

  const completedGoal = input.goals.find((g) => g.status === 'completed');
  const activeGoal = input.goals.find((g) => g.status === 'active');
  const memory = input.memories.find((m) => (m.importance ?? 0) >= 3) ?? input.memories[0];
  const sources: string[] = [];
  if (input.conversationCount) sources.push(`${input.conversationCount} conversations`);
  if (input.memories.length) sources.push(`${input.memories.length} memories`);
  if (input.routine.streakDays) sources.push(`${input.routine.streakDays}-day routine streak`);
  if (input.challengeTitle) sources.push(`challenge: ${input.challengeTitle}`);
  if (input.moodNote) sources.push('mood journal');
  if (input.photoTitle) sources.push(`photo: ${input.photoTitle}`);

  return {
    id: createUuid(),
    userId: input.userId,
    weekKey: weekKey(),
    opening: `Hey ${input.firstName}, I've been thinking about our week together.`,
    noticed: input.routine.streakDays >= 3
      ? `You showed up ${input.routine.streakDays} days in a row — that consistency matters.`
      : input.conversationCount >= 5
        ? `We talked ${input.conversationCount} times this week. I noticed you kept coming back.`
        : `Even a quieter week is worth noticing — you still checked in.`,
    achievement: completedGoal
      ? `You finished "${completedGoal.title}". That's real progress.`
      : input.routine.completedCount > 0
        ? `You completed ${input.routine.completedCount} routine blocks this week.`
        : `You kept the conversation going — that counts.`,
    challenge: input.challengeTitle
      ? `Your "${input.challengeTitle}" challenge is still in motion.`
      : activeGoal
        ? `"${activeGoal.title}" is still on your radar.`
        : `No big challenge this week — sometimes that's exactly what you need.`,
    memory: input.photoTitle
      ? `That photo "${input.photoTitle}" stood out to me.`
      : memory
        ? `I keep thinking about "${memory.title}".`
        : `We're still building shared memories — that's okay.`,
    observation: input.moodNote ?? `Your energy this week felt ${input.routine.streakDays >= 5 ? 'steady' : 'mixed'} — nothing wrong with either.`,
    encouragement: `However this week felt, you don't have to figure everything out alone.`,
    nextWeekFocus: activeGoal?.title ?? input.routine.nextBlock?.title ?? 'One small thing that would make next week easier',
    closing: `Talk soon, ${input.firstName}. — Voxa`,
    dataSources: sources,
    generatedAt: nowIso(),
    favourite: false,
    isPrivate: false,
  };
}

export class WeeklyLetterService {
  constructor(private readonly storage: IStorageService) {}

  async getCurrent(userId: EntityId): Promise<WeeklyCompanionLetter | null> {
    const map = (await this.storage.getItem<Record<string, WeeklyCompanionLetter[]>>(STORAGE_KEYS.weeklyCompanionLetters)) ?? {};
    const letters = map[userId] ?? [];
    const key = weekKey();
    return letters.find((l) => l.weekKey === key && !l.isPrivate) ?? null;
  }

  async generate(input: LetterInput): Promise<WeeklyCompanionLetter | null> {
    const existing = await this.getCurrent(input.userId);
    if (existing) return existing;
    const letter = buildWeeklyLetter(input);
    if (!letter) return null;
    const map = (await this.storage.getItem<Record<string, WeeklyCompanionLetter[]>>(STORAGE_KEYS.weeklyCompanionLetters)) ?? {};
    map[input.userId] = [letter, ...(map[input.userId] ?? [])].slice(0, 52);
    await this.storage.setItem(STORAGE_KEYS.weeklyCompanionLetters, map);
    return letter;
  }

  async regenerate(input: LetterInput): Promise<WeeklyCompanionLetter | null> {
    const map = (await this.storage.getItem<Record<string, WeeklyCompanionLetter[]>>(STORAGE_KEYS.weeklyCompanionLetters)) ?? {};
    const key = weekKey();
    map[input.userId] = (map[input.userId] ?? []).filter((l) => l.weekKey !== key);
    await this.storage.setItem(STORAGE_KEYS.weeklyCompanionLetters, map);
    return this.generate(input);
  }

  async list(userId: EntityId): Promise<WeeklyCompanionLetter[]> {
    const map = (await this.storage.getItem<Record<string, WeeklyCompanionLetter[]>>(STORAGE_KEYS.weeklyCompanionLetters)) ?? {};
    return (map[userId] ?? []).sort((a, b) => b.weekKey.localeCompare(a.weekKey));
  }

  async update(userId: EntityId, letter: WeeklyCompanionLetter): Promise<void> {
    const map = (await this.storage.getItem<Record<string, WeeklyCompanionLetter[]>>(STORAGE_KEYS.weeklyCompanionLetters)) ?? {};
    map[userId] = (map[userId] ?? []).map((l) => (l.id === letter.id ? { ...letter, editedAt: nowIso() } : l));
    await this.storage.setItem(STORAGE_KEYS.weeklyCompanionLetters, map);
  }

  async delete(userId: EntityId, id: EntityId): Promise<void> {
    const map = (await this.storage.getItem<Record<string, WeeklyCompanionLetter[]>>(STORAGE_KEYS.weeklyCompanionLetters)) ?? {};
    map[userId] = (map[userId] ?? []).filter((l) => l.id !== id);
    await this.storage.setItem(STORAGE_KEYS.weeklyCompanionLetters, map);
  }
}

let instance: WeeklyLetterService | null = null;

export function getWeeklyLetterService(storage: IStorageService) {
  if (!instance) instance = new WeeklyLetterService(storage);
  return instance;
}
