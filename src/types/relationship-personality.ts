import { EntityId, ISODateString } from './common';

/** Gradual personality traits (0–1). Never jump more than ~4% per conversation. */
export type EvolvingPersonalityTraits = {
  humourPreference: number;
  conversationLengthPreference: number;
  emojiPreference: number;
  motivationalStyle: number;
  preferredWordingWarmth: number;
  encouragementStyle: number;
  accountabilityStyle: number;
  curiosityLevel: number;
  detailLevel: number;
  favouriteTopics: string[];
  updatedAt: ISODateString;
};

export type InsideJoke = {
  id: EntityId;
  label: string;
  context: string;
  kind: 'funny_moment' | 'repeated_joke' | 'nickname' | 'memorable_chat' | 'catchphrase' | 'meme';
  userApproved: boolean;
  timesReferenced: number;
  lastReferencedAt?: ISODateString;
  createdAt: ISODateString;
};

export type ConversationStyleProfile = {
  prefersShortAnswers: number;
  prefersLongExplanations: number;
  prefersBulletPoints: number;
  casualTone: number;
  professionalTone: number;
  motivationalTone: number;
  /** 0 = quick back-and-forth, 1 = thoughtful pacing */
  pacingPreference: number;
  /** 0 = direct questions, 1 = open reflective questions */
  questioningStyle: number;
  /** Learned from user emoji usage */
  emojiAffinity: number;
  /** Learned from user humour signals */
  humourAffinity: number;
  updatedAt: ISODateString;
};

export type DailyPersonalityModifier = {
  energy: number;
  relaxation: number;
  conversational: number;
  productivityFocus: number;
  label: string;
  guidance: string;
};

export type WeeklyReflection = {
  id: EntityId;
  weekStarting: ISODateString;
  generatedAt: ISODateString;
  wins: string[];
  challenges: string[];
  progress: string;
  relationshipGrowth: string;
  goalsAchieved: string[];
  favouriteConversation?: string;
  suggestionsForNextWeek: string[];
};

export type MemoryLevel = 'minimal' | 'balanced' | 'deep';

/** User-facing controls that shape how Voxa behaves. */
export type CompanionControlPreferences = {
  memoryLevel: MemoryLevel;
  proactivity: number;
  humour: number;
  emojiUsage: number;
  conversationDepth: number;
  voiceWarmth: number;
  coachStrictness: number;
  friendliness: number;
  kindness: number;
  curiosity: number;
  confidence: number;
  patience: number;
  empathy: number;
  motivation: number;
  talkativeness: number;
  honesty: number;
  playfulness: number;
  optimism: number;
  respectfulness: number;
  /** When false, relationship insight surfaces stay hidden */
  showRelationshipInsights?: boolean;
};

export function createDefaultEvolvingPersonality(now: ISODateString): EvolvingPersonalityTraits {
  return {
    humourPreference: 0.5,
    conversationLengthPreference: 0.5,
    emojiPreference: 0.3,
    motivationalStyle: 0.5,
    preferredWordingWarmth: 0.7,
    encouragementStyle: 0.65,
    accountabilityStyle: 0.45,
    curiosityLevel: 0.6,
    detailLevel: 0.5,
    favouriteTopics: [],
    updatedAt: now,
  };
}

export function createDefaultConversationStyle(now: ISODateString): ConversationStyleProfile {
  return {
    prefersShortAnswers: 0.5,
    prefersLongExplanations: 0.5,
    prefersBulletPoints: 0.2,
    casualTone: 0.65,
    professionalTone: 0.35,
    motivationalTone: 0.5,
    pacingPreference: 0.5,
    questioningStyle: 0.5,
    emojiAffinity: 0.3,
    humourAffinity: 0.5,
    updatedAt: now,
  };
}

export function createDefaultCompanionControls(): CompanionControlPreferences {
  return {
    memoryLevel: 'balanced',
    proactivity: 0.45,
    humour: 0.5,
    emojiUsage: 0.3,
    conversationDepth: 0.5,
    voiceWarmth: 0.7,
    coachStrictness: 0.4,
    friendliness: 0.75,
    kindness: 0.75,
    curiosity: 0.6,
    confidence: 0.55,
    patience: 0.7,
    empathy: 0.8,
    motivation: 0.6,
    talkativeness: 0.5,
    honesty: 0.7,
    playfulness: 0.45,
    optimism: 0.65,
    respectfulness: 0.85,
    showRelationshipInsights: true,
  };
}

export const PERSONALITY_SLIDER_KEYS: Array<{
  key: keyof CompanionControlPreferences;
  label: string;
  description: string;
}> = [
  { key: 'friendliness', label: 'Friendliness', description: 'How warm and welcoming Voxa feels.' },
  { key: 'humour', label: 'Humour', description: 'How often Voxa uses light humour.' },
  { key: 'kindness', label: 'Kindness', description: 'Gentleness and compassion in replies.' },
  { key: 'curiosity', label: 'Curiosity', description: 'How inquisitive Voxa is about your life.' },
  { key: 'confidence', label: 'Confidence', description: 'Assuredness in guidance and opinions.' },
  { key: 'patience', label: 'Patience', description: 'Unhurried, understanding responses.' },
  { key: 'coachStrictness', label: 'Coach Strictness', description: 'Accountability vs gentle encouragement.' },
  { key: 'empathy', label: 'Empathy', description: 'Emotional attunement to how you feel.' },
  { key: 'motivation', label: 'Motivation', description: 'Energy toward goals and action.' },
  { key: 'talkativeness', label: 'Talkativeness', description: 'How much Voxa says in each reply.' },
  { key: 'emojiUsage', label: 'Emoji usage', description: 'Frequency of emoji in messages.' },
  { key: 'conversationDepth', label: 'Conversation depth', description: 'Surface chat vs deeper exploration.' },
  { key: 'proactivity', label: 'Proactivity', description: 'How often Voxa initiates topics.' },
  { key: 'honesty', label: 'Honesty', description: 'Direct truth vs softening difficult topics.' },
  { key: 'playfulness', label: 'Playfulness', description: 'Spontaneity and fun in conversation.' },
  { key: 'optimism', label: 'Optimism', description: 'Positive framing vs realistic balance.' },
  { key: 'respectfulness', label: 'Respectfulness', description: 'Formality and consideration.' },
];

/** Future-ready architecture interfaces (not wired to providers yet). */
export type VoicePersonalityEvolutionState = {
  warmth: number;
  pace: number;
  expressiveness: number;
  lastUpdated: ISODateString;
};

export type AvatarPersonalityState = {
  expressiveness: number;
  animationEnergy: number;
};

export type RelationshipAnalyticsSnapshot = {
  engagementScore: number;
  consistencyScore: number;
  trustScore: number;
  computedAt: ISODateString;
};

export type YearlyRecapPlaceholder = {
  year: number;
  headline?: string;
  ready: boolean;
};

export interface IPersonalityFutureServices {
  voiceEvolution?: { getState(userId: string): Promise<VoicePersonalityEvolutionState> };
  avatarPersonality?: { getState(userId: string): Promise<AvatarPersonalityState> };
  relationshipAnalytics?: { snapshot(userId: string): Promise<RelationshipAnalyticsSnapshot> };
  lifeTimelineUi?: { listEvents(userId: string): Promise<unknown[]> };
  memoryVisualization?: { graph(userId: string): Promise<unknown> };
  yearlyRecap?: { prepare(userId: string, year: number): Promise<YearlyRecapPlaceholder> };
}
