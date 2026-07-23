import { LifeTimelineEvent, LifeTimelineEventKind } from './companion-intelligence';
import { MemoryMood } from './memory';

export type MemoryTheme =
  | 'growth'
  | 'relationships'
  | 'health'
  | 'work'
  | 'learning'
  | 'emotional'
  | 'daily_life'
  | 'future';

export type LifeDashboardSnapshot = {
  moodLabel: string;
  moodTrend: 'up' | 'steady' | 'down';
  sleepSchedule: { wake: string; sleep: string } | null;
  routinePercent: number;
  routineStreak: number;
  activeGoals: number;
  topGoalTitle: string | null;
  journalSnippet: string | null;
  habits: string[];
  checkInStreak: number;
};

export type RelationshipDashboardSnapshot = {
  conversationCount: number;
  daysTogether: number;
  relationshipScore: number;
  ritualStreak: number;
  goalsAchieved: number;
  sharedMemories: number;
  milestones: Array<{ id: string; label: string }>;
  highlightMemory: string | null;
  naturalRecallLine: string | null;
};

export type DailyCoachSnapshot = {
  greeting: string;
  message: string;
  focus: string;
  nudge: string | null;
  adaptedFrom: string[];
};

export type EmotionalMomentSnapshot = {
  id: string;
  title: string;
  message: string;
  kind: 'celebration' | 'support' | 'callback' | 'milestone' | 'anniversary';
  priority: number;
};

export type TimelineSlice = {
  events: LifeTimelineEvent[];
  availableKinds: LifeTimelineEventKind[];
  milestoneCount: number;
};

export type Phase2DashboardData = {
  lifeDashboard: LifeDashboardSnapshot;
  relationshipDashboard: RelationshipDashboardSnapshot;
  dailyCoach: DailyCoachSnapshot;
  emotionalMoments: EmotionalMomentSnapshot[];
  timeline: TimelineSlice;
  memoryThemes: Array<{ theme: MemoryTheme; count: number; label: string }>;
};
