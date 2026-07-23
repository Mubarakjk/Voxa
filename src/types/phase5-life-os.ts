import { EntityId, ISODateString } from './common';
import { GoalCategory } from './goal';

// ─── Goal Planner ───────────────────────────────────────────────

export type GoalMilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export type GoalMilestone = {
  id: EntityId;
  goalId: EntityId;
  userId: EntityId;
  title: string;
  description?: string;
  targetDate?: ISODateString;
  status: GoalMilestoneStatus;
  sortOrder: number;
  linkedRoutineId?: EntityId;
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export type GoalNoteKind = 'progress' | 'setback' | 'win' | 'revision';

export type GoalNote = {
  id: EntityId;
  goalId: EntityId;
  userId: EntityId;
  kind: GoalNoteKind;
  body: string;
  createdAt: ISODateString;
};

export type GoalPlan = {
  goalId: EntityId;
  userId: EntityId;
  outcome: string;
  monthlyTargets: string[];
  weeklyTargets: string[];
  todaysAction?: string;
  obstacles: string[];
  successCriteria: string[];
  coachInsight?: string;
  updatedAt: ISODateString;
};

// ─── Future Self ────────────────────────────────────────────────

export type FutureSelfProfile = {
  id: EntityId;
  userId: EntityId;
  targetDate?: ISODateString;
  targetAge?: number;
  career?: string;
  finances?: string;
  health?: string;
  confidence?: string;
  lifestyle?: string;
  relationships?: string;
  location?: string;
  values: string[];
  achievements: string[];
  habitsToBuild: string[];
  habitsToReduce: string[];
  identityStatement: string;
  updatedAt: ISODateString;
  createdAt: ISODateString;
};

// ─── Vision Board ───────────────────────────────────────────────

export type VisionCategory =
  | 'career'
  | 'business'
  | 'money'
  | 'fitness'
  | 'education'
  | 'travel'
  | 'relationships'
  | 'home'
  | 'lifestyle'
  | 'custom';

export type VisionBoardItemV5 = {
  id: EntityId;
  userId: EntityId;
  title: string;
  description?: string;
  quote?: string;
  category: VisionCategory;
  imageUri?: string;
  targetDate?: ISODateString;
  progress: number;
  personalReason?: string;
  linkedGoalId?: EntityId;
  linkedBucketId?: EntityId;
  linkedChallengeId?: EntityId;
  pinned: boolean;
  sortOrder: number;
  status: 'active' | 'completed' | 'archived';
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

// ─── Bucket List ────────────────────────────────────────────────

export type BucketStatus = 'idea' | 'planned' | 'in_progress' | 'completed' | 'paused';

export type BucketListItemV5 = {
  id: EntityId;
  userId: EntityId;
  title: string;
  description?: string;
  category: string;
  priority: 1 | 2 | 3 | 4 | 5;
  targetDate?: ISODateString;
  status: BucketStatus;
  progress: number;
  personalMeaning?: string;
  linkedGoalId?: EntityId;
  linkedVisionId?: EntityId;
  completionMemoryId?: EntityId;
  sortOrder: number;
  progressNotes: string[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

// ─── Dream Journal ──────────────────────────────────────────────

export type DreamEntry = {
  id: EntityId;
  userId: EntityId;
  body: string;
  mood?: string;
  people: string[];
  places: string[];
  themes: string[];
  recurring: boolean;
  isPrivate: boolean;
  voiceNoteUri?: string;
  summary?: string;
  savedAt: ISODateString;
};

// ─── Decision Simulator ─────────────────────────────────────────

export type DecisionOption = {
  id: EntityId;
  label: string;
  benefits: string[];
  risks: string[];
  shortTerm: string[];
  longTerm: string[];
  unknowns: string[];
  fitsValues: string;
  reversible: boolean;
  score?: number;
};

export type SavedDecision = {
  id: EntityId;
  userId: EntityId;
  question: string;
  options: DecisionOption[];
  recommendedNextStep?: string;
  caution?: string;
  outcome?: string;
  predictionVsReality?: string;
  status: 'open' | 'decided' | 'revisited';
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

// ─── Debate Mode ────────────────────────────────────────────────

export type DebatePerspective =
  | 'challenge'
  | 'defend'
  | 'balanced'
  | 'devils_advocate'
  | 'investor'
  | 'coach'
  | 'customer';

export type DebateResult = {
  id: EntityId;
  userId: EntityId;
  topic: string;
  perspective: DebatePerspective;
  caseFor: string[];
  caseAgainst: string[];
  weakAssumptions: string[];
  missingEvidence: string[];
  betterQuestion: string;
  conclusion: string;
  createdAt: ISODateString;
};

// ─── Coach Score ────────────────────────────────────────────────

export type CoachScoreDomain =
  | 'consistency'
  | 'health_habits'
  | 'learning'
  | 'career_business'
  | 'routines'
  | 'reflection'
  | 'goal_momentum';

export type CoachScoreEntry = {
  domain: CoachScoreDomain;
  value: number;
  trend: 'up' | 'steady' | 'down';
  whyChanged: string;
  dataUsed: string[];
  confidence: 'high' | 'medium' | 'low' | 'insufficient';
  improveAction?: string;
  hidden: boolean;
};

export type CoachScoreSnapshot = {
  userId: EntityId;
  scores: CoachScoreEntry[];
  computedAt: ISODateString;
};

// ─── Memory Connections ─────────────────────────────────────────

export type MemoryConnectionKind =
  | 'person'
  | 'goal'
  | 'event'
  | 'emotion'
  | 'routine'
  | 'place'
  | 'photo'
  | 'dream'
  | 'decision'
  | 'bucket'
  | 'vision';

export type MemoryConnection = {
  id: EntityId;
  userId: EntityId;
  fromMemoryId: EntityId;
  toKind: MemoryConnectionKind;
  toId: EntityId;
  toLabel: string;
  confidence: 'high' | 'medium' | 'low';
  lastUsedAt?: ISODateString;
  createdAt: ISODateString;
};

// ─── Life Book ──────────────────────────────────────────────────

export type LifeBookChapter = {
  id: EntityId;
  userId: EntityId;
  monthLabel: string;
  year: number;
  month: number;
  summary?: string;
  biggestWin?: string;
  biggestChallenge?: string;
  goals: string[];
  routinePercent?: number;
  moodTrend?: string;
  journalExcerpts: string[];
  dreamThemes: string[];
  decisions: string[];
  bucketProgress: string[];
  visionProgress: string[];
  favouriteMemory?: string;
  voxaNoticed?: string;
  nextFocus?: string;
  isPrivate: boolean;
  generatedAt: ISODateString;
  refreshedAt?: ISODateString;
};

// ─── Memory Movie ───────────────────────────────────────────────

export type MemoryMovieScene = {
  id: EntityId;
  title: string;
  narration: string;
  photoUri?: string;
  memoryId?: EntityId;
  durationSec: number;
};

export type MemoryMovieStoryboard = {
  id: EntityId;
  userId: EntityId;
  title: string;
  scenes: MemoryMovieScene[];
  totalDurationSec: number;
  musicPlaceholder: string;
  exportStatus: 'preview_only' | 'coming_soon';
  createdAt: ISODateString;
};

// ─── Dashboard ──────────────────────────────────────────────────

export type Phase5DashboardData = {
  goalPlans: number;
  futureSelfReady: boolean;
  visionCount: number;
  bucketCount: number;
  dreamCount: number;
  openDecisions: number;
  coachScore: CoachScoreSnapshot | null;
  memoryConnectionCount: number;
  latestLifeBookChapter: LifeBookChapter | null;
  storyboardReady: boolean;
};

export const COACH_DOMAIN_LABELS: Record<CoachScoreDomain, string> = {
  consistency: 'Consistency',
  health_habits: 'Health habits',
  learning: 'Learning',
  career_business: 'Career & business',
  routines: 'Routines',
  reflection: 'Reflection',
  goal_momentum: 'Goal momentum',
};

export const VISION_CATEGORY_LABELS: Record<VisionCategory, string> = {
  career: 'Career',
  business: 'Business',
  money: 'Money',
  fitness: 'Fitness',
  education: 'Education',
  travel: 'Travel',
  relationships: 'Relationships',
  home: 'Home',
  lifestyle: 'Lifestyle',
  custom: 'Custom',
};
