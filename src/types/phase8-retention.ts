import { EntityId, ISODateString } from './common';

// ─── Life Calendar ──────────────────────────────────────────────

export type CalendarEventKind =
  | 'birthday'
  | 'interview'
  | 'exam'
  | 'gym'
  | 'work'
  | 'university'
  | 'holiday'
  | 'flight'
  | 'appointment'
  | 'sports'
  | 'deadline'
  | 'anniversary'
  | 'other';

export type CalendarEvent = {
  id: EntityId;
  title: string;
  kind: CalendarEventKind;
  scheduledAt: ISODateString;
  source: 'reminder' | 'memory' | 'goal';
  sourceId?: EntityId;
  allDay?: boolean;
};

export type LifeCalendarSnapshot = {
  todayEvents: CalendarEvent[];
  upcomingEvents: CalendarEvent[];
  todayLine: string | null;
  tomorrowLine: string | null;
};

// ─── Companion Mood ─────────────────────────────────────────────

export type CompanionMoodV8 =
  | 'relaxed'
  | 'excited'
  | 'thoughtful'
  | 'curious'
  | 'playful'
  | 'celebrating'
  | 'sleepy';

export type CompanionMoodState = {
  mood: CompanionMoodV8;
  greetingTone: string;
  orbMood: import('../components/live-companion/live-companion-orb').CompanionOrbMood;
  dataSources: string[];
};

// ─── Shared Challenges ──────────────────────────────────────────

export type ChallengeTemplateId =
  | 'coding_30'
  | 'gym'
  | 'reading'
  | 'no_sugar'
  | 'business_sprint'
  | 'study'
  | 'sleep'
  | 'meditation'
  | 'hydration'
  | 'morning_routine';

export type SharedChallenge = {
  id: EntityId;
  userId: EntityId;
  templateId: ChallengeTemplateId;
  title: string;
  description: string;
  durationDays: number;
  startedAt: ISODateString;
  completedDays: number;
  streakDays: number;
  lastCheckInDate?: string;
  status: 'active' | 'completed' | 'paused';
  completedAt?: ISODateString;
};

// ─── Shared Memories Timeline ───────────────────────────────────

export type SharedTimelineEntry = {
  id: EntityId;
  title: string;
  narrative: string;
  occurredAt: ISODateString;
  kind: 'memory' | 'goal' | 'milestone' | 'conversation';
  memoryId?: EntityId;
};

// ─── Monthly Replay ─────────────────────────────────────────────

export type MonthlyReplayData = {
  monthLabel: string;
  biggestAchievement: string | null;
  mostDiscussedTopic: string | null;
  moodTrend: string | null;
  routineConsistency: string | null;
  favouriteConversation: string | null;
  bestMemory: string | null;
  goalsCompleted: number;
  lessonsLearned: string[];
  photoCount: number;
  generatedAt: ISODateString;
};

// ─── Photo Story ────────────────────────────────────────────────

export type PhotoStoryItem = {
  id: EntityId;
  title: string;
  summary: string;
  category: string;
  savedAt: ISODateString;
  imageUri?: string;
};

// ─── Widget Architecture ────────────────────────────────────────

export type WidgetSnapshot = {
  todayFocus: string;
  routineProgress: string;
  moodLabel: string;
  quote: string;
  relationshipStreakDays: number;
  tapAction: 'talk';
  updatedAt: ISODateString;
};

// ─── Workspace Sessions ─────────────────────────────────────────

export type WorkspaceTopic = 'business' | 'study' | 'fitness' | 'travel' | 'coding';

export type WorkspaceSession = {
  id: EntityId;
  userId: EntityId;
  conversationId: EntityId;
  topic: WorkspaceTopic;
  title: string;
  notes: string[];
  tasks: string[];
  ideas: string[];
  progress: string[];
  startedAt: ISODateString;
  updatedAt: ISODateString;
};

// ─── Future Conversations ───────────────────────────────────────

export type FutureConversation = {
  id: EntityId;
  userId: EntityId;
  conversationId: EntityId;
  topic: string;
  resumeLine: string;
  scheduledFor: ISODateString;
  createdAt: ISODateString;
  resolved: boolean;
};

// ─── User Preferences (natural memory) ──────────────────────────

export type PreferenceCategory =
  | 'food'
  | 'movies'
  | 'sports'
  | 'music'
  | 'books'
  | 'travel'
  | 'people'
  | 'career'
  | 'learning'
  | 'conversation'
  | 'other';

export type UserPreferenceMemory = {
  id: EntityId;
  userId: EntityId;
  category: PreferenceCategory;
  label: string;
  value: string;
  sourceMemoryId?: EntityId;
  confidence: 'high' | 'medium';
  createdAt: ISODateString;
};

// ─── Conversation Milestones ────────────────────────────────────

export type ConversationMilestoneKind =
  | 'chats_100'
  | 'chats_500'
  | 'chats_1000'
  | 'month_1'
  | 'month_6'
  | 'year_1'
  | 'memories_100'
  | 'goals_50'
  | 'routines_100';

export type ConversationMilestone = {
  id: EntityId;
  kind: ConversationMilestoneKind;
  title: string;
  message: string;
  showConfetti: boolean;
};

// ─── Dashboard ──────────────────────────────────────────────────

export type Phase8DashboardData = {
  calendar: LifeCalendarSnapshot;
  companionMood: CompanionMoodState;
  activeChallenge: SharedChallenge | null;
  sharedTimeline: SharedTimelineEntry[];
  monthlyReplay: MonthlyReplayData | null;
  photoStory: PhotoStoryItem[];
  widgetSnapshot: WidgetSnapshot;
  futureConversation: FutureConversation | null;
  preferences: UserPreferenceMemory[];
  milestone: ConversationMilestone | null;
  todayFocus: string;
  promptBlock: string;
};

export const CHALLENGE_TEMPLATES: Array<{
  id: ChallengeTemplateId;
  title: string;
  description: string;
  durationDays: number;
  emoji: string;
}> = [
  { id: 'coding_30', title: '30 Day Coding', description: 'Build something every day', durationDays: 30, emoji: '⌨️' },
  { id: 'gym', title: 'Gym', description: 'Show up for your body', durationDays: 30, emoji: '💪' },
  { id: 'reading', title: 'Reading', description: 'Read a little each day', durationDays: 21, emoji: '📚' },
  { id: 'no_sugar', title: 'No Sugar', description: 'Mindful eating together', durationDays: 14, emoji: '🥗' },
  { id: 'business_sprint', title: 'Business Sprint', description: 'Ship one thing daily', durationDays: 14, emoji: '🚀' },
  { id: 'study', title: 'Study', description: 'Focused learning streak', durationDays: 21, emoji: '🎓' },
  { id: 'sleep', title: 'Sleep', description: 'Better nights, better days', durationDays: 14, emoji: '😴' },
  { id: 'meditation', title: 'Meditation', description: 'Quiet moments together', durationDays: 21, emoji: '🧘' },
  { id: 'hydration', title: 'Hydration', description: 'Water as a habit', durationDays: 14, emoji: '💧' },
  { id: 'morning_routine', title: 'Morning Routine', description: 'Start days with intention', durationDays: 21, emoji: '🌅' },
];
