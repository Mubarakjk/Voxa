import { EntityId, ISODateString } from './common';
import { CompanionOrbMood, CompanionOrbState } from '../components/live-companion/live-companion-orb';

export type RelationshipStage =
  | 'new_friend'
  | 'trusted_friend'
  | 'close_companion'
  | 'best_friend'
  | 'life_companion';

export const RELATIONSHIP_STAGE_LABELS: Record<RelationshipStage, string> = {
  new_friend: 'New Friend',
  trusted_friend: 'Trusted Friend',
  close_companion: 'Close Companion',
  best_friend: 'Best Friend',
  life_companion: 'Life Companion',
};

export type LivingCompanionV2State = {
  mood: CompanionOrbMood;
  state: CompanionOrbState;
  tintShift: string;
  intensity: number;
  presenceLine: string | null;
  dataSources: string[];
};

export type DynamicPresenceLine = {
  line: string;
  memoryId?: EntityId;
  confidence: 'high' | 'medium';
};

export type Phase7DashboardData = {
  livingCompanion: LivingCompanionV2State;
  relationshipStage: RelationshipStage;
  stageLabel: string;
  dynamicPresence: DynamicPresenceLine | null;
  personalityPromptBlock: string;
  delightReady: boolean;
};

export const PERSONALITY_V4_AVOID = [
  'As an AI',
  'I understand.',
  'How can I help?',
  'I am an artificial intelligence',
  'I cannot feel',
] as const;

export const EXTENDED_ACTIVITY_IDS = [
  'deep_conversation',
  'business_brainstorm',
  'startup_advisor',
  'workout_partner',
  'coding_partner',
  'language_practice',
  'travel_planning',
  'book_club',
  'movie_discussion',
  'financial_planning',
  'mindfulness',
  'creativity_session',
  'journal_together',
  'life_reset',
  'relationship_advice',
] as const;

export type ExtendedActivityId = (typeof EXTENDED_ACTIVITY_IDS)[number];
