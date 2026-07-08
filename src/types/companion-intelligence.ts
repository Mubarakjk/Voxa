import { CompanionModeId } from './companion-mode';
import { EntityId, ISODateString } from './common';
import {
  ConversationStyleProfile,
  EvolvingPersonalityTraits,
  InsideJoke,
  WeeklyReflection,
  createDefaultConversationStyle,
  createDefaultEvolvingPersonality,
} from './relationship-personality';
import { GoalCategory } from './goal';
import { MemoryCategory, MemoryMood } from './memory';

/** Continuously updated understanding of who the user is. */
export type CompanionIntelligenceProfile = {
  userId: EntityId;
  updatedAt: ISODateString;
  goals: string[];
  routines: string[];
  habits: string[];
  moodTrend: MoodTrendPoint[];
  favouriteTopics: string[];
  communicationStyle: 'casual' | 'direct' | 'reflective' | 'mixed';
  preferredMode: CompanionModeId;
  sleepSchedule?: { wake: string; sleep: string };
  productivityPatterns: string[];
  fitnessProgress: string[];
  studyProgress: string[];
  interests: string[];
  relationships: ImportantPerson[];
  importantDates: ImportantDate[];
  recentAchievements: string[];
  currentChallenges: string[];
};

export type MoodTrendPoint = {
  mood: MemoryMood;
  at: ISODateString;
  source?: string;
};

export type ImportantPerson = {
  name: string;
  relation?: string;
  notes?: string;
};

export type ImportantDate = {
  label: string;
  date?: string;
  category: 'birthday' | 'anniversary' | 'deadline' | 'other';
};

/** Bond between user and Voxa over time. */
export type RelationshipProfile = {
  userId: EntityId;
  updatedAt: ISODateString;
  relationshipStartedAt: ISODateString;
  conversationCount: number;
  voiceCallCount: number;
  sharedMemoryCount: number;
  goalsAchievedTogether: number;
  milestones: RelationshipMilestone[];
  favouriteTopics: string[];
  preferredConversationHours: number[];
  summary: string;
};

export type RelationshipMilestone = {
  id: string;
  label: string;
  achievedAt: ISODateString;
};

/** Anti-repetition tracker for natural conversation variety. */
export type ConversationQualityState = {
  recentQuestions: string[];
  recentGreetings: string[];
  recentSuggestedTopics: string[];
  updatedAt: ISODateString;
};

export type LifeTimelineEventKind =
  | 'goal'
  | 'achievement'
  | 'birthday'
  | 'study'
  | 'work'
  | 'conversation'
  | 'trip'
  | 'fitness'
  | 'relationship'
  | 'memory'
  | 'custom';

export type LifeTimelineEvent = {
  id: EntityId;
  userId: EntityId;
  kind: LifeTimelineEventKind;
  title: string;
  description?: string;
  occurredAt: ISODateString;
  relatedGoalCategory?: GoalCategory;
  relatedMemoryCategory?: MemoryCategory;
  metadata?: Record<string, unknown>;
};

/** Unified bundle persisted with the user profile. */
export type CompanionIntelligenceBundle = {
  profile: CompanionIntelligenceProfile;
  relationship: RelationshipProfile;
  conversationQuality: ConversationQualityState;
  lifeTimeline: LifeTimelineEvent[];
  personality: EvolvingPersonalityTraits;
  insideJokes: InsideJoke[];
  conversationStyle: ConversationStyleProfile;
  weeklyReflections: WeeklyReflection[];
};

/** Built before every AI reply. */
export type UnifiedCompanionContext = {
  userProfile: import('./user-profile').UserProfile;
  intelligenceProfile: CompanionIntelligenceProfile;
  relationship: RelationshipProfile;
  mode: CompanionModeId;
  topMemories: import('./memory').Memory[];
  activeGoals: import('./goal').Goal[];
  upcomingReminders: import('./reminder').Reminder[];
  recentMessages: import('./message').Message[];
  recentConversations: import('./conversation').Conversation[];
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  currentDate: string;
  currentTime: string;
  conversationQuality: ConversationQualityState;
  principlesBlock: string;
  personality: EvolvingPersonalityTraits;
  conversationStyle: ConversationStyleProfile;
  dailyPersonality: import('./relationship-personality').DailyPersonalityModifier;
  availableInsideJokes: InsideJoke[];
  companionControls: import('./relationship-personality').CompanionControlPreferences;
  weeklyReflectionHint?: string;
};

export type HomeIntelligenceSnapshot = {
  personalGreeting: string;
  dailyFocus: string;
  progressUpdate: string;
  goalReminder: string | null;
  relationshipMessage: string;
  memoryHighlight: string | null;
  suggestedConversation: string;
  nextReminderLabel: string | null;
  daySignature: string;
};

export type ProactiveDecision = {
  shouldReachOut: boolean;
  reason: string | null;
  kind:
    | 'missed_goal'
    | 'missed_reminder'
    | 'birthday'
    | 'inactivity'
    | 'morning_greeting'
    | 'evening_reflection'
    | 'study_routine'
    | 'workout_routine'
    | 'user_check_in'
    | null;
  priority: 'low' | 'medium' | 'high';
  suggestedMessage: string | null;
};

export function createDefaultIntelligenceBundle(
  userId: EntityId,
  displayName: string,
  startedAt: ISODateString,
): CompanionIntelligenceBundle {
  return {
    profile: {
      userId,
      updatedAt: startedAt,
      goals: [],
      routines: [],
      habits: [],
      moodTrend: [],
      favouriteTopics: [],
      communicationStyle: 'mixed',
      preferredMode: 'friend',
      productivityPatterns: [],
      fitnessProgress: [],
      studyProgress: [],
      interests: [],
      relationships: [],
      importantDates: [],
      recentAchievements: [],
      currentChallenges: [],
    },
    relationship: {
      userId,
      updatedAt: startedAt,
      relationshipStartedAt: startedAt,
      conversationCount: 0,
      voiceCallCount: 0,
      sharedMemoryCount: 0,
      goalsAchievedTogether: 0,
      milestones: [],
      favouriteTopics: [],
      preferredConversationHours: [],
      summary: `${displayName} and Voxa are just getting started.`,
    },
    conversationQuality: {
      recentQuestions: [],
      recentGreetings: [],
      recentSuggestedTopics: [],
      updatedAt: startedAt,
    },
    lifeTimeline: [],
    personality: createDefaultEvolvingPersonality(startedAt),
    insideJokes: [],
    conversationStyle: createDefaultConversationStyle(startedAt),
    weeklyReflections: [],
  };
}
