import { STORAGE_KEYS } from '../../constants/storage-keys';
import { Conversation, EntityId, Goal, Memory, nowIso, UserProfile } from '../../types';
import { CompanionRelationshipProfile, RelationshipFraming } from '../../types/phase6-premium';
import { CompanionIntelligenceBundle } from '../../types/companion-intelligence';
import { relationshipGrowthService } from '../intelligence/relationship-growth-service';
import { IStorageService } from '../contracts';

export class RelationshipProfileService {
  constructor(private readonly storage: IStorageService) {}

  async getFraming(userId: EntityId): Promise<RelationshipFraming> {
    const map = (await this.storage.getItem<Record<string, { framing: RelationshipFraming }>>(STORAGE_KEYS.relationshipPreferences)) ?? {};
    return map[userId]?.framing ?? 'friend';
  }

  async setFraming(userId: EntityId, framing: RelationshipFraming): Promise<void> {
    const map = (await this.storage.getItem<Record<string, { framing: RelationshipFraming; proactiveEnabled?: boolean }>>(STORAGE_KEYS.relationshipPreferences)) ?? {};
    map[userId] = { ...map[userId], framing };
    await this.storage.setItem(STORAGE_KEYS.relationshipPreferences, map);
  }

  async isProactiveEnabled(userId: EntityId): Promise<boolean> {
    const map = (await this.storage.getItem<Record<string, { proactiveEnabled?: boolean }>>(STORAGE_KEYS.relationshipPreferences)) ?? {};
    return map[userId]?.proactiveEnabled !== false;
  }

  async setProactiveEnabled(userId: EntityId, enabled: boolean): Promise<void> {
    const map = (await this.storage.getItem<Record<string, Record<string, unknown>>>(STORAGE_KEYS.relationshipPreferences)) ?? {};
    map[userId] = { ...map[userId], proactiveEnabled: enabled };
    await this.storage.setItem(STORAGE_KEYS.relationshipPreferences, map);
  }

  build(input: {
    userId: EntityId;
    profile: UserProfile;
    bundle: CompanionIntelligenceBundle;
    memories: Memory[];
    goals: Goal[];
    conversations: Conversation[];
    routinesCompleted?: number;
    ritualsCompleted?: number;
  }): CompanionRelationshipProfile {
    const growth = relationshipGrowthService.build(input.bundle);
    const framing = input.profile.companion?.lastUsedMode === 'coach' ? 'coach'
      : input.profile.companion?.lastUsedMode === 'teacher' ? 'mentor'
      : 'friend';

    const firstConversation = [...input.conversations].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
    const completedGoals = input.goals.filter((g) => g.status === 'completed').length;

    const topics = input.bundle.profile.interests.slice(0, 5);
    if (topics.length === 0) {
      const categories = new Set(input.memories.slice(0, 20).map((m) => m.category));
      topics.push(...[...categories].slice(0, 4));
    }

    return {
      userId: input.userId,
      daysTogether: growth.daysTogether,
      firstConversationDate: firstConversation?.createdAt,
      stage: stageLabel(growth.daysTogether, input.memories.length),
      sharedMemories: growth.sharedMemories,
      milestones: growth.milestones,
      favouriteTopics: topics,
      routinesCompleted: input.routinesCompleted ?? 0,
      goalsAchieved: completedGoals,
      ritualsCompleted: input.ritualsCompleted ?? 0,
      communicationStyle: input.bundle.adaptive.lastModeLabel ?? 'Warm and thoughtful',
      insideJokes: growth.insideJokes.slice(0, 5),
      learnedSummary: growth.evolutionLine ?? 'Still learning what matters to you.',
      framing,
      updatedAt: nowIso(),
    };
  }
}

function stageLabel(days: number, memories: number): string {
  if (days < 3) return 'Getting acquainted';
  if (days < 14) return 'Building trust';
  if (memories < 5) return 'Finding rhythm';
  if (days < 60) return 'Growing together';
  return 'Deepening bond';
}

let instance: RelationshipProfileService | null = null;

export function getRelationshipProfileService(storage: IStorageService): RelationshipProfileService {
  if (!instance) instance = new RelationshipProfileService(storage);
  return instance;
}
