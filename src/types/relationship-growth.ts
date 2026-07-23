import { EntityId, ISODateString } from './common';
import { RelationshipStage } from './phase7-signature';

export type FriendshipLevel = RelationshipStage;

export const FRIENDSHIP_LEVEL_LABELS: Record<FriendshipLevel, string> = {
  new_friend: 'Getting Started',
  trusted_friend: 'Getting to Know You',
  close_companion: 'Close Companion',
  best_friend: 'Trusted Friend',
  life_companion: 'Inner Circle',
};

export type RelationshipGrowthMetrics = {
  userId: EntityId;
  relationshipStartedAt: ISODateString;
  conversationCount: number;
  voiceMinutes: number;
  goalsCompleted: number;
  routinesCompleted: number;
  memoriesShared: number;
  reflectionsCompleted: number;
  updatedAt: ISODateString;
};

export type RelationshipGrowthSnapshot = {
  level: FriendshipLevel;
  levelLabel: string;
  nextLevelLabel: string | null;
  progressPercent: number;
  daysTogether: number;
  metrics: RelationshipGrowthMetrics;
  familiarityLine: string;
  unlocks: string[];
  lockedConversations: LockedConversation[];
};

export type LockedConversation = {
  id: string;
  title: string;
  description: string;
  requiredLevel: FriendshipLevel;
  unlocked: boolean;
};

export type UnlockedConversationStarter = {
  id: string;
  title: string;
  starterPrompt: string;
  requiredLevel: FriendshipLevel;
};
