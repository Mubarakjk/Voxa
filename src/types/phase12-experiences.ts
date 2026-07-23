import { EntityId, ISODateString } from './common';
import { CompanionModeId } from './companion-mode';

// ─── Scheduled Check-Ins ───────────────────────────────────────────

export type CheckInStyle =
  | 'gentle'
  | 'friendly'
  | 'motivational'
  | 'funny'
  | 'direct'
  | 'coach'
  | 'calm';

export type CheckInTemplate =
  | 'morning'
  | 'evening'
  | 'before_interview'
  | 'before_exam'
  | 'before_gym'
  | 'after_work'
  | 'after_event'
  | 'missed_routine'
  | 'custom';

export type CheckInRecurrence = 'once' | 'daily' | 'weekly' | 'weekdays' | 'custom_days';

export type ScheduledCheckIn = {
  id: EntityId;
  userId: EntityId;
  title: string;
  template: CheckInTemplate;
  style: CheckInStyle;
  scheduledAt: ISODateString;
  recurrence: CheckInRecurrence;
  customDays?: number[];
  enabled: boolean;
  openingMessage?: string;
  linkedGoalId?: EntityId;
  linkedRoutineId?: EntityId;
  linkedEventId?: EntityId;
  quietHoursRespect: boolean;
  notificationId?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export type CheckInHistoryEntry = {
  id: EntityId;
  checkInId: EntityId;
  userId: EntityId;
  status: 'delivered' | 'opened' | 'missed' | 'dismissed';
  deliveredAt: ISODateString;
  openedAt?: ISODateString;
};

export type NotificationPermissionState = 'granted' | 'denied' | 'undetermined';

// ─── Photo Memories ────────────────────────────────────────────────

export type PhotoMemoryCategory =
  | 'achievement'
  | 'fitness'
  | 'family'
  | 'friends'
  | 'travel'
  | 'food'
  | 'pet'
  | 'work'
  | 'education'
  | 'celebration'
  | 'everyday'
  | 'custom';

export type PhotoMemory = {
  id: EntityId;
  userId: EntityId;
  title: string;
  caption: string;
  localUri?: string;
  remoteUrl?: string;
  thumbnailUri?: string;
  occurredAt: ISODateString;
  category: PhotoMemoryCategory;
  customCategory?: string;
  people: string[];
  placeText?: string;
  emotion?: string;
  isPrivate: boolean;
  pinned: boolean;
  favourite: boolean;
  analysisSummary?: string;
  memoryId?: EntityId;
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

// ─── Mood Journal ──────────────────────────────────────────────────

export type MoodLevel = 1 | 2 | 3 | 4 | 5;

export type MoodEntry = {
  id: EntityId;
  userId: EntityId;
  date: string;
  mood: MoodLevel;
  energy: MoodLevel;
  stress: MoodLevel;
  confidence: MoodLevel;
  sleepQuality: MoodLevel;
  note?: string;
  voiceNoteUri?: string;
  linkedRoutineId?: EntityId;
  linkedEventId?: EntityId;
  linkedPhotoId?: EntityId;
  tags: string[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export type MoodInsightConfidence = 'low' | 'medium' | 'high';

export type MoodInsight = {
  id: EntityId;
  userId: EntityId;
  line: string;
  dataPoints: number;
  confidence: MoodInsightConfidence;
  metric: string;
  nextStep: string;
  dismissed: boolean;
  createdAt: ISODateString;
};

// ─── Specialist Coaching ───────────────────────────────────────────

export type CoachId =
  | 'startup'
  | 'coding'
  | 'study'
  | 'interview'
  | 'fitness'
  | 'confidence'
  | 'career'
  | 'productivity'
  | 'relationship'
  | 'financial';

export type CoachingProfile = {
  coachId: CoachId;
  userId: EntityId;
  status: 'active' | 'paused' | 'ended';
  currentFocus: string;
  activePlan: string[];
  startedAt: ISODateString;
  updatedAt: ISODateString;
};

export type CoachingSession = {
  id: EntityId;
  coachId: CoachId;
  userId: EntityId;
  summary: string;
  actionSteps: string[];
  startedAt: ISODateString;
  endedAt?: ISODateString;
};

// ─── Conversation Worlds ───────────────────────────────────────────

export type WorldId =
  | 'coffee_shop'
  | 'park_walk'
  | 'rainy_evening'
  | 'beach_sunset'
  | 'late_night_drive'
  | 'study_room'
  | 'startup_office'
  | 'gym_corner'
  | 'airport_lounge'
  | 'rooftop_night'
  | 'quiet_library'
  | 'gaming_room';

export type ConversationWorld = {
  id: WorldId;
  name: string;
  description: string;
  gradient: [string, string];
  accentColor: string;
  starters: string[];
  suitableActivities: string[];
  moodHint: string;
};

export type WorldPreference = {
  userId: EntityId;
  favouriteWorldIds: WorldId[];
  lastUsedWorldId?: WorldId;
  lastUsedAt?: ISODateString;
  reducedMotion: boolean;
};

// ─── Relationship Timeline ─────────────────────────────────────────

export type TimelineMilestoneSource =
  | 'system'
  | 'conversation'
  | 'memory'
  | 'photo'
  | 'challenge'
  | 'coaching'
  | 'ritual'
  | 'user';

export type RelationshipMilestone = {
  id: EntityId;
  userId: EntityId;
  title: string;
  description: string;
  occurredAt: ISODateString;
  source: TimelineMilestoneSource;
  confidence: 'verified' | 'inferred';
  linkedConversationId?: EntityId;
  linkedMemoryId?: EntityId;
  linkedPhotoId?: EntityId;
  favourite: boolean;
  hidden: boolean;
  userCreated: boolean;
};

// ─── Companion Challenges 2.0 ──────────────────────────────────────

export type ChallengeTemplateId =
  | '7_day_reset'
  | '30_day_coding'
  | 'gym_consistency'
  | 'daily_walking'
  | 'read_daily'
  | 'earlier_sleep'
  | 'earlier_wake'
  | 'hydration'
  | 'daily_journal'
  | 'study_sprint'
  | 'no_fizzy'
  | 'confidence_practice'
  | 'startup_sprint'
  | 'social_confidence'
  | 'custom';

export type ChallengeDifficulty = 'easy' | 'medium' | 'hard';

export type CompanionChallengeV2 = {
  id: EntityId;
  userId: EntityId;
  templateId: ChallengeTemplateId;
  title: string;
  durationDays: number;
  dailyTarget: string;
  difficulty: ChallengeDifficulty;
  reminderTime?: string;
  linkedGoalId?: EntityId;
  linkedRoutineId?: EntityId;
  coachStyle: CheckInStyle;
  accountabilityLevel: 'gentle' | 'balanced' | 'firm';
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  startedAt: ISODateString;
  completedDays: number;
  currentStreak: number;
  bestStreak: number;
  adherencePercent: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export type ChallengeDayEntry = {
  id: EntityId;
  challengeId: EntityId;
  date: string;
  status: 'completed' | 'skipped' | 'missed' | 'pending';
  note?: string;
  photoId?: EntityId;
  voiceNoteUri?: string;
};

// ─── Cosmetic Rewards ────────────────────────────────────────────────

export type CosmeticKind =
  | 'orb_color'
  | 'orb_glow'
  | 'chat_theme'
  | 'world_theme'
  | 'badge'
  | 'journey_cover'
  | 'wallpaper'
  | 'quote_card'
  | 'celebration_effect'
  | 'companion_expression';

export type CosmeticReward = {
  id: EntityId;
  kind: CosmeticKind;
  title: string;
  description: string;
  previewColor?: string;
  unlockReason?: string;
  unlockedAt?: ISODateString;
  equipped: boolean;
};

// ─── Premium Composer ────────────────────────────────────────────────

export type ComposerActionId =
  | 'just_listen'
  | 'help_plan'
  | 'motivate'
  | 'teach'
  | 'challenge_thinking'
  | 'coach_me'
  | 'make_laugh'
  | 'reflect'
  | 'sports_talk'
  | 'focus_session'
  | 'add_reminder'
  | 'schedule_checkin'
  | 'start_challenge'
  | 'open_world';

export type ComposerAction = {
  id: ComposerActionId;
  label: string;
  icon: string;
  instruction: string;
  mode?: CompanionModeId;
  navigateTo?: string;
};

export type ComposerPreferences = {
  userId: EntityId;
  favouriteActionIds: ComposerActionId[];
  recentActionIds: ComposerActionId[];
  updatedAt: ISODateString;
};

// ─── Weekly Companion Letter ───────────────────────────────────────

export type WeeklyCompanionLetter = {
  id: EntityId;
  userId: EntityId;
  weekKey: string;
  opening: string;
  noticed: string;
  achievement: string;
  challenge: string;
  memory: string;
  observation: string;
  encouragement: string;
  nextWeekFocus: string;
  closing: string;
  dataSources: string[];
  generatedAt: ISODateString;
  editedAt?: ISODateString;
  favourite: boolean;
  isPrivate: boolean;
};

// ─── Daily News / Updates ────────────────────────────────────────────

export type DailyNewsItem = {
  id: EntityId;
  title: string;
  summary: string;
  category: 'personal' | 'world' | 'tech' | 'wellness' | 'companion';
  source?: string;
  publishedAt: ISODateString;
};

export type DailyNewsDigest = {
  date: string;
  userId: EntityId;
  headline: string;
  items: DailyNewsItem[];
  companionTake: string;
  cachedAt: ISODateString;
};

// ─── Dashboard ─────────────────────────────────────────────────────

export type Phase12HomeMoment =
  | { kind: 'check_in'; title: string; subtitle: string; actionLabel: string }
  | { kind: 'photo'; title: string; subtitle: string; photoId: EntityId }
  | { kind: 'letter'; title: string; subtitle: string; letterId: EntityId }
  | { kind: 'challenge'; title: string; subtitle: string; challengeId: EntityId }
  | { kind: 'news'; title: string; subtitle: string }
  | { kind: 'mood'; title: string; subtitle: string };

export type Phase12DashboardData = {
  nextCheckIn: ScheduledCheckIn | null;
  checkInPermission: NotificationPermissionState;
  nextCheckInLabel: string | null;
  weeklyLetter: WeeklyCompanionLetter | null;
  weeklyLetterReady: boolean;
  photoCount: number;
  featuredPhoto: PhotoMemory | null;
  moodLoggedToday: boolean;
  moodInsight: MoodInsight | null;
  activeCoach: CoachingProfile | null;
  activeWorld: WorldId | null;
  timelinePreview: RelationshipMilestone[];
  activeChallenge: CompanionChallengeV2 | null;
  newRewards: CosmeticReward[];
  dailyNews: DailyNewsDigest | null;
  homeMoment: Phase12HomeMoment | null;
  composerPrefs: ComposerPreferences;
};
