import { EntityId, ISODateString } from './common';

// ─── Response Engine 2.0 ────────────────────────────────────────

export type ResponseIntent =
  | 'listen'
  | 'support'
  | 'coach'
  | 'challenge'
  | 'inform'
  | 'celebrate'
  | 'plan';

export type ThinkingStyle =
  | 'strategic'
  | 'technical'
  | 'coach'
  | 'sports_analyst'
  | 'listener'
  | 'supportive'
  | 'tutor'
  | 'creative'
  | 'friend';

export type ResponsePlan = {
  intent: ResponseIntent;
  thinkingStyle: ThinkingStyle;
  userGoal: string;
  detectedEmotion: string;
  shouldAskQuestion: boolean;
  keepShort: boolean;
  useChecklist: boolean;
  useTimeline: boolean;
  useHumour: boolean;
  relevantMemoryTitles: string[];
  relevantGoalTitles: string[];
  promptBlock: string;
};

export type ResponseQualityScore = {
  score: number;
  issues: string[];
  passed: boolean;
};

// ─── Conversation style memory ────────────────────────────────

export type ConversationStylePreference = {
  prefersBullets: boolean;
  prefersShort: boolean;
  prefersDeep: boolean;
  prefersHumour: boolean;
  prefersExamples: boolean;
  prefersStepByStep: boolean;
  updatedAt: ISODateString;
};

// ─── Wake companion ───────────────────────────────────────────

export type WakePersonality = 'gentle' | 'motivational' | 'funny' | 'strict' | 'coach' | 'friend';

export type AlarmCompanionPrefs = {
  defaultPersonality: WakePersonality;
  usePersonalisedLines: boolean;
  updatedAt: ISODateString;
};

// ─── Daily planner ────────────────────────────────────────────

export type DailyPlanItem = {
  id: EntityId;
  label: string;
  kind: 'focus' | 'routine' | 'goal' | 'reminder' | 'custom';
  scheduledAt?: ISODateString;
  completed: boolean;
};

export type DailyPlan = {
  date: string;
  headline: string;
  items: DailyPlanItem[];
  generatedAt: ISODateString;
};

// ─── Focus mode ─────────────────────────────────────────────────

export type FocusDuration = 25 | 45 | 60 | 90;

export type FocusSession = {
  id: EntityId;
  userId: EntityId;
  durationMin: FocusDuration;
  label: string;
  startedAt: ISODateString;
  endsAt: ISODateString;
  completed: boolean;
  paused: boolean;
};

// ─── Relationship intelligence ──────────────────────────────────

export type RelationshipTrend = 'stable' | 'stressed' | 'burnout_risk' | 'excited' | 'motivated' | 'frustrated' | 'low_confidence' | 'success';

export type RelationshipIntelligenceSnapshot = {
  trend: RelationshipTrend;
  label: string;
  detail: string;
  dataPoints: string[];
};

// ─── Smart suggestions ──────────────────────────────────────────

export type SmartSuggestionKind =
  | 'create_routine'
  | 'save_memory'
  | 'journal'
  | 'create_goal'
  | 'future_self'
  | 'bucket_list'
  | 'decision_sim'
  | 'debate'
  | 'focus_session'
  | 'create_challenge';

export type SmartSuggestion = {
  id: EntityId;
  kind: SmartSuggestionKind;
  label: string;
  prompt: string;
  priority: number;
};

// ─── Personal knowledge profile ─────────────────────────────────

export type KnowledgeProfileEntry = {
  category: string;
  value: string;
  confidence: 'high' | 'medium';
};

export type PersonalKnowledgeProfile = {
  entries: KnowledgeProfileEntry[];
  learningStyle?: string;
  workStyle?: string;
  motivationStyle?: string;
  updatedAt: ISODateString;
};

// ─── Future platform interfaces (stubs) ───────────────────────

export type FuturePlatformCapability =
  | 'apple_watch'
  | 'wear_os'
  | 'desktop'
  | 'carplay'
  | 'siri_shortcuts'
  | 'live_activities'
  | 'calendar_sync'
  | 'email_assistant'
  | 'document_assistant';

export type FuturePlatformStatus = {
  capability: FuturePlatformCapability;
  available: boolean;
  reason: string;
};

// ─── Dashboard ──────────────────────────────────────────────────

export type Phase9DashboardData = {
  dailyPlan: DailyPlan;
  relationshipIntel: RelationshipIntelligenceSnapshot;
  knowledgeProfile: PersonalKnowledgeProfile;
  stylePrefs: ConversationStylePreference;
  activeFocus: FocusSession | null;
  smartSuggestions: SmartSuggestion[];
  quickPrompts: string[];
  thinkingStyle: ThinkingStyle;
  promptBlock: string;
  futurePlatforms: FuturePlatformStatus[];
};

export const QUICK_PROMPTS = [
  'Help me think through this',
  'What should I focus on today?',
  'I need to vent',
  'Break this into steps',
  'Challenge my thinking',
  'Celebrate a win with me',
] as const;

export const FAVOURITE_STARTER_PROMPTS = [
  'Morning check-in',
  'Plan my day',
  'I feel stuck',
  'Quick motivation',
  'Reflect on today',
] as const;
