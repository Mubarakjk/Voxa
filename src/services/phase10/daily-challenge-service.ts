import { STORAGE_KEYS } from '../../constants/storage-keys';
import { createUuid, EntityId, Goal, nowIso } from '../../types';
import { DailyChallenge, DailyChallengeStatus } from '../../types/phase10-play';
import { TodayRoutineSummary } from '../../types/routine';
import { IStorageService } from '../contracts';
import { getAchievementTriggersService } from './achievement-triggers-service';
import { getCelebrationService } from './celebration-service';
import { getPlayHistoryService } from './play-history-service';
import { getXpService } from './xp-service';

const TEMPLATES = [
  { title: 'Journal tonight', description: 'Spend 5 minutes reflecting on today.', source: 'habit' as const, xp: 30 },
  { title: 'Drink enough water', description: 'Stay hydrated through the day.', source: 'habit' as const, xp: 20 },
  { title: 'Talk to someone', description: 'Reach out to one person who matters.', source: 'generic' as const, xp: 25 },
  { title: 'Complete one goal step', description: 'Move one active goal forward.', source: 'goal' as const, xp: 40 },
  { title: 'Finish one routine block', description: 'Complete your next scheduled block.', source: 'routine' as const, xp: 35 },
  { title: 'Code for 45 minutes', description: 'Focused building time.', source: 'habit' as const, xp: 45 },
  { title: 'Walk 8000 steps', description: 'Move your body today.', source: 'habit' as const, xp: 30 },
  { title: 'Read 20 pages', description: 'Quiet reading time.', source: 'habit' as const, xp: 35 },
  { title: 'Complete one Voxa task', description: 'Finish something you planned with Voxa.', source: 'generic' as const, xp: 30 },
  { title: 'Gym session', description: 'Move with intention today.', source: 'habit' as const, xp: 35 },
];

function daySeed(date: string, userId: string, replaceCount = 0): number {
  let h = replaceCount * 17;
  for (const c of `${date}:${userId}`) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

export function buildDailyChallenge(input: {
  userId: EntityId;
  goals: Goal[];
  routine: TodayRoutineSummary;
  moodLabel?: string | null;
  replaceCount?: number;
}): DailyChallenge {
  const date = new Date().toISOString().slice(0, 10);
  const replaceCount = input.replaceCount ?? 0;
  const seed = daySeed(date, input.userId, replaceCount);

  if (replaceCount === 0 && input.goals[0]) {
    return {
      id: createUuid(),
      userId: input.userId,
      date,
      title: `Progress: ${input.goals[0].title}`,
      description: `Take one meaningful step on "${input.goals[0].title}" today.`,
      xpReward: 40,
      status: 'pending',
      source: 'goal',
      createdAt: nowIso(),
      replaceCount,
    };
  }

  if (replaceCount === 0 && input.routine.nextBlock) {
    return {
      id: createUuid(),
      userId: input.userId,
      date,
      title: input.routine.nextBlock.title,
      description: 'Complete this routine block today.',
      xpReward: 35,
      status: 'pending',
      source: 'routine',
      createdAt: nowIso(),
      replaceCount,
    };
  }

  const t = TEMPLATES[(seed + replaceCount) % TEMPLATES.length];
  return {
    id: createUuid(),
    userId: input.userId,
    date,
    title: t.title,
    description: t.description,
    xpReward: t.xp,
    status: 'pending',
    source: t.source,
    createdAt: nowIso(),
    replaceCount,
  };
}

export type ChallengeActionResult = {
  challenge: DailyChallenge;
  xpAwarded?: number;
  leveledUp?: boolean;
};

export class DailyChallengeService {
  constructor(private readonly storage: IStorageService) {}

  private key(userId: EntityId, date: string) {
    return `${userId}:${date}`;
  }

  private today() {
    return new Date().toISOString().slice(0, 10);
  }

  async getToday(userId: EntityId): Promise<DailyChallenge | null> {
    const map = (await this.storage.getItem<Record<string, DailyChallenge>>(STORAGE_KEYS.dailyChallenges)) ?? {};
    return map[this.key(userId, this.today())] ?? null;
  }

  async ensureToday(input: {
    userId: EntityId;
    goals: Goal[];
    routine: TodayRoutineSummary;
    moodLabel?: string | null;
  }): Promise<DailyChallenge> {
    const existing = await this.getToday(input.userId);
    if (existing) return existing;
    return this.save(buildDailyChallenge(input));
  }

  private async save(challenge: DailyChallenge): Promise<DailyChallenge> {
    const map = (await this.storage.getItem<Record<string, DailyChallenge>>(STORAGE_KEYS.dailyChallenges)) ?? {};
    map[this.key(challenge.userId, challenge.date)] = challenge;
    await this.storage.setItem(STORAGE_KEYS.dailyChallenges, map);
    return challenge;
  }

  async accept(userId: EntityId): Promise<DailyChallenge | null> {
    const c = await this.getToday(userId);
    if (!c || c.status === 'completed' || c.status === 'skipped') return c;
    return this.save({ ...c, status: 'accepted', acceptedAt: nowIso() });
  }

  async skip(userId: EntityId): Promise<DailyChallenge | null> {
    const c = await this.getToday(userId);
    if (!c || c.status === 'completed') return c;
    return this.save({ ...c, status: 'skipped' });
  }

  async replace(userId: EntityId, input: {
    goals: Goal[];
    routine: TodayRoutineSummary;
  }): Promise<DailyChallenge | null> {
    const c = await this.getToday(userId);
    if (!c || c.status === 'completed') return c;
    const replaceCount = (c.replaceCount ?? 0) + 1;
    const next = buildDailyChallenge({
      userId,
      goals: input.goals,
      routine: input.routine,
      replaceCount,
    });
    return this.save({ ...next, status: 'pending', replaceCount });
  }

  async complete(userId: EntityId): Promise<ChallengeActionResult | null> {
    const c = await this.getToday(userId);
    if (!c || c.status === 'skipped') return null;
    if (c.xpAwarded) {
      return { challenge: c };
    }

    const refId = `challenge:${c.date}:${c.id}`;
    const award = await getXpService(this.storage).award(userId, c.xpReward, 'challenge', refId);
    const completed: DailyChallenge = {
      ...c,
      status: 'completed',
      completedAt: nowIso(),
      xpAwarded: true,
      xpTransactionId: award.transaction.id,
    };
    await this.save(completed);

    await getPlayHistoryService(this.storage).append(userId, {
      kind: 'challenge',
      title: completed.title,
      detail: `+${c.xpReward} XP`,
    });

    const streakMap = (await this.storage.getItem<Record<string, number>>(STORAGE_KEYS.challengeStreak)) ?? {};
    streakMap[userId] = (streakMap[userId] ?? 0) + 1;
    await this.storage.setItem(STORAGE_KEYS.challengeStreak, streakMap);

    const celebration = getCelebrationService(this.storage);
    void celebration.showIfNew(userId, {
      kind: 'challenge_complete',
      eventKey: `challenge_complete:${c.date}`,
      title: 'Challenge complete',
      subtitle: completed.title,
      emoji: '🎯',
      amount: c.xpReward,
    });

    if (award.leveledUp) {
      await celebration.saveLevelUp({
        userId,
        oldLevel: award.oldLevel,
        newLevel: award.newLevel,
        shown: false,
        at: nowIso(),
        message: 'You showed up today — that counts.',
      });
    }

    void getAchievementTriggersService(this.storage).onChallengeComplete(userId);

    return {
      challenge: completed,
      xpAwarded: c.xpReward,
      leveledUp: award.leveledUp,
    };
  }

  async undoComplete(userId: EntityId): Promise<DailyChallenge | null> {
    const c = await this.getToday(userId);
    if (!c || c.status !== 'completed' || !c.xpTransactionId) return c;

    await getXpService(this.storage).revokeTransaction(userId, c.xpTransactionId);

    const streakMap = (await this.storage.getItem<Record<string, number>>(STORAGE_KEYS.challengeStreak)) ?? {};
    streakMap[userId] = Math.max(0, (streakMap[userId] ?? 1) - 1);
    await this.storage.setItem(STORAGE_KEYS.challengeStreak, streakMap);

    return this.save({
      ...c,
      status: c.acceptedAt ? 'accepted' : 'pending',
      completedAt: undefined,
      xpAwarded: false,
      xpTransactionId: undefined,
    });
  }

  async updateStatus(userId: EntityId, date: string, status: DailyChallengeStatus): Promise<DailyChallenge | null> {
    if (status === 'completed') {
      const result = await this.complete(userId);
      return result?.challenge ?? null;
    }
    if (status === 'accepted') return this.accept(userId);
    if (status === 'skipped') return this.skip(userId);
    const map = (await this.storage.getItem<Record<string, DailyChallenge>>(STORAGE_KEYS.dailyChallenges)) ?? {};
    const c = map[this.key(userId, date)];
    if (!c) return null;
    map[this.key(userId, date)] = { ...c, status };
    await this.storage.setItem(STORAGE_KEYS.dailyChallenges, map);
    return map[this.key(userId, date)];
  }
}

let instance: DailyChallengeService | null = null;

export function getDailyChallengeService(storage: IStorageService) {
  if (!instance) instance = new DailyChallengeService(storage);
  return instance;
}
