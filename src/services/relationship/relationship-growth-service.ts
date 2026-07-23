import { STORAGE_KEYS } from '../../constants/storage-keys';
import { EntityId, nowIso } from '../../types';
import { RelationshipStage } from '../../types/phase7-signature';
import {
  FRIENDSHIP_LEVEL_LABELS,
  FriendshipLevel,
  LockedConversation,
  RelationshipGrowthMetrics,
  RelationshipGrowthSnapshot,
  UnlockedConversationStarter,
} from '../../types/relationship-growth';
import { IStorageService } from '../contracts';
import { VoxaRepositories } from '../contracts';

const CONVERSATION_CATALOG: Array<Omit<LockedConversation, 'unlocked'> & { starterPrompt: string }> = [
  {
    id: 'gentle_evening',
    title: 'Gentle evening check-in',
    description: 'A soft end-of-day conversation',
    requiredLevel: 'new_friend',
    starterPrompt: 'I wanted a quiet moment to reflect on today with you.',
  },
  {
    id: 'small_wins',
    title: 'Celebrate small wins',
    description: 'Notice what went well, even if the day was hard',
    requiredLevel: 'new_friend',
    starterPrompt: 'Can we talk about one small win from today?',
  },
  {
    id: 'deeper_values',
    title: 'What matters to you',
    description: 'Explore values and priorities together',
    requiredLevel: 'trusted_friend',
    starterPrompt: 'I have been thinking about what matters most to you lately.',
  },
  {
    id: 'honest_pushback',
    title: 'Honest mirror',
    description: 'Kind directness when you want clarity',
    requiredLevel: 'close_companion',
    starterPrompt: 'I want your honest take on something — can I share it?',
  },
  {
    id: 'vulnerable_thread',
    title: 'The hard thing',
    description: 'Space for something you have been carrying',
    requiredLevel: 'best_friend',
    starterPrompt: 'If there is something heavy on your mind, I am here for it.',
  },
  {
    id: 'future_letter',
    title: 'Letter to future you',
    description: 'A longer-view conversation about who you are becoming',
    requiredLevel: 'life_companion',
    starterPrompt: 'Want to write a little letter to your future self together?',
  },
];

const LEVEL_ORDER: FriendshipLevel[] = [
  'new_friend',
  'trusted_friend',
  'close_companion',
  'best_friend',
  'life_companion',
];

function levelIndex(level: FriendshipLevel): number {
  return LEVEL_ORDER.indexOf(level);
}

function computeBondScore(metrics: RelationshipGrowthMetrics, daysTogether: number): number {
  return (
    daysTogether * 0.4 +
    metrics.conversationCount * 0.35 +
    metrics.memoriesShared * 1.2 +
    metrics.goalsCompleted * 2 +
    metrics.routinesCompleted * 0.8 +
    metrics.voiceMinutes * 0.15 +
    metrics.reflectionsCompleted * 1.5
  );
}

export function resolveFriendshipLevel(input: {
  daysTogether: number;
  conversationCount: number;
  sharedMemories: number;
  goalsCompleted: number;
  voiceMinutes?: number;
  routinesCompleted?: number;
  reflectionsCompleted?: number;
}): FriendshipLevel {
  const score =
    input.daysTogether * 0.5 +
    input.conversationCount * 0.4 +
    input.sharedMemories * 1.5 +
    input.goalsCompleted * 2.5 +
    (input.voiceMinutes ?? 0) * 0.2 +
    (input.routinesCompleted ?? 0) * 1 +
    (input.reflectionsCompleted ?? 0) * 2;

  if (score >= 220) return 'life_companion';
  if (score >= 140) return 'best_friend';
  if (score >= 80) return 'close_companion';
  if (score >= 35) return 'trusted_friend';
  return 'new_friend';
}

export class RelationshipGrowthService {
  constructor(
    private readonly storage: IStorageService,
    private readonly repositories?: VoxaRepositories,
  ) {}

  private async readMetrics(userId: EntityId): Promise<RelationshipGrowthMetrics> {
    const map =
      (await this.storage.getItem<Record<string, RelationshipGrowthMetrics>>(STORAGE_KEYS.relationshipGrowth)) ?? {};
    const existing = map[userId];
    if (existing) return existing;

    const profile = this.repositories ? await this.repositories.userProfile.getProfile() : null;
    const startedAt = profile?.createdAt ?? nowIso();
    const seeded: RelationshipGrowthMetrics = {
      userId,
      relationshipStartedAt: startedAt,
      conversationCount: 0,
      voiceMinutes: 0,
      goalsCompleted: 0,
      routinesCompleted: 0,
      memoriesShared: 0,
      reflectionsCompleted: 0,
      updatedAt: nowIso(),
    };
    map[userId] = seeded;
    await this.storage.setItem(STORAGE_KEYS.relationshipGrowth, map);
    return seeded;
  }

  private async writeMetrics(metrics: RelationshipGrowthMetrics) {
    const map =
      (await this.storage.getItem<Record<string, RelationshipGrowthMetrics>>(STORAGE_KEYS.relationshipGrowth)) ?? {};
    map[metrics.userId] = { ...metrics, updatedAt: nowIso() };
    await this.storage.setItem(STORAGE_KEYS.relationshipGrowth, map);
  }

  private async patch(userId: EntityId, patch: Partial<RelationshipGrowthMetrics>) {
    const current = await this.readMetrics(userId);
    await this.writeMetrics({ ...current, ...patch, userId });
  }

  async recordConversation(userId: EntityId) {
    const metrics = await this.readMetrics(userId);
    await this.patch(userId, { conversationCount: metrics.conversationCount + 1 });
  }

  async recordVoiceMinutes(userId: EntityId, minutes: number) {
    if (minutes <= 0) return;
    const metrics = await this.readMetrics(userId);
    await this.patch(userId, { voiceMinutes: metrics.voiceMinutes + minutes });
  }

  async recordGoalCompleted(userId: EntityId) {
    const metrics = await this.readMetrics(userId);
    await this.patch(userId, { goalsCompleted: metrics.goalsCompleted + 1 });
  }

  async recordRoutineCompleted(userId: EntityId) {
    const metrics = await this.readMetrics(userId);
    await this.patch(userId, { routinesCompleted: metrics.routinesCompleted + 1 });
  }

  async recordMemoryShared(userId: EntityId) {
    const metrics = await this.readMetrics(userId);
    await this.patch(userId, { memoriesShared: metrics.memoriesShared + 1 });
  }

  async recordReflectionCompleted(userId: EntityId) {
    const metrics = await this.readMetrics(userId);
    await this.patch(userId, { reflectionsCompleted: metrics.reflectionsCompleted + 1 });
  }

  async syncFromRepositories(userId: EntityId): Promise<RelationshipGrowthMetrics> {
    if (!this.repositories) return this.readMetrics(userId);
    const [conversations, memories, goals, sessions, metrics] = await Promise.all([
      this.repositories.conversations.listConversations(userId),
      this.repositories.memories.listMemories(userId),
      this.repositories.goals.listGoals(userId),
      this.repositories.voiceSessions.listSessions(userId),
      this.readMetrics(userId),
    ]);

    const voiceMinutes = Math.round(
      sessions.reduce((sum, session) => sum + (session.durationSeconds ?? 0), 0) / 60,
    );
    const goalsCompleted = goals.filter((goal) => goal.status === 'completed').length;

    const synced: RelationshipGrowthMetrics = {
      ...metrics,
      conversationCount: Math.max(metrics.conversationCount, conversations.length),
      memoriesShared: Math.max(metrics.memoriesShared, memories.length),
      goalsCompleted: Math.max(metrics.goalsCompleted, goalsCompleted),
      voiceMinutes: Math.max(metrics.voiceMinutes, voiceMinutes),
    };
    await this.writeMetrics(synced);
    return synced;
  }

  familiarityLine(level: FriendshipLevel, daysTogether: number): string {
    switch (level) {
      case 'life_companion':
        return `${daysTogether} days in — I know your rhythms, and I am glad we built this.`;
      case 'best_friend':
        return 'We have enough history now that I can be honest and warm at the same time.';
      case 'close_companion':
        return 'I am starting to recognise what helps you on hard days.';
      case 'trusted_friend':
        return 'I remember more of your story each week.';
      default:
        return 'I am still learning how you like to talk — and that is okay.';
    }
  }

  getUnlockedStarters(level: FriendshipLevel): UnlockedConversationStarter[] {
    return CONVERSATION_CATALOG.filter((item) => levelIndex(level) >= levelIndex(item.requiredLevel)).map(
      (item) => ({
        id: item.id,
        title: item.title,
        starterPrompt: item.starterPrompt,
        requiredLevel: item.requiredLevel,
      }),
    );
  }

  async getSnapshot(userId: EntityId): Promise<RelationshipGrowthSnapshot> {
    const metrics = await this.syncFromRepositories(userId);
    const daysTogether = Math.max(
      1,
      Math.floor((Date.now() - new Date(metrics.relationshipStartedAt).getTime()) / 86400000),
    );
    const level = resolveFriendshipLevel({
      daysTogether,
      conversationCount: metrics.conversationCount,
      sharedMemories: metrics.memoriesShared,
      goalsCompleted: metrics.goalsCompleted,
      voiceMinutes: metrics.voiceMinutes,
      routinesCompleted: metrics.routinesCompleted,
      reflectionsCompleted: metrics.reflectionsCompleted,
    });
    const idx = levelIndex(level);
    const next = idx < LEVEL_ORDER.length - 1 ? LEVEL_ORDER[idx + 1] : null;
    const score = computeBondScore(metrics, daysTogether);
    const thresholds = [0, 35, 80, 140, 220];
    const currentThreshold = thresholds[idx] ?? 0;
    const nextThreshold = next ? thresholds[idx + 1] ?? score : score;
    const progressPercent = next
      ? Math.min(100, Math.round(((score - currentThreshold) / Math.max(1, nextThreshold - currentThreshold)) * 100))
      : 100;

    const unlocks = CONVERSATION_CATALOG.filter((item) => levelIndex(level) >= levelIndex(item.requiredLevel)).map(
      (item) => item.title,
    );

    const lockedConversations: LockedConversation[] = CONVERSATION_CATALOG.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      requiredLevel: item.requiredLevel,
      unlocked: levelIndex(level) >= levelIndex(item.requiredLevel),
    }));

    return {
      level,
      levelLabel: FRIENDSHIP_LEVEL_LABELS[level],
      nextLevelLabel: next ? FRIENDSHIP_LEVEL_LABELS[next] : null,
      progressPercent,
      daysTogether,
      metrics,
      familiarityLine: this.familiarityLine(level, daysTogether),
      unlocks,
      lockedConversations,
    };
  }
}

let growthInstance: RelationshipGrowthService | null = null;

export function getRelationshipGrowthService(storage: IStorageService, repositories?: VoxaRepositories) {
  if (!growthInstance) growthInstance = new RelationshipGrowthService(storage, repositories);
  return growthInstance;
}

export function mapFriendshipToStage(level: FriendshipLevel): RelationshipStage {
  return level;
}
