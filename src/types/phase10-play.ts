import { EntityId, ISODateString } from './common';

// ─── Arcade ─────────────────────────────────────────────────────

export type ArcadeGameId =
  | 'would_you_rather'
  | 'this_or_that'
  | 'guess_movie'
  | 'guess_football_player'
  | 'emoji_quiz'
  | 'trivia'
  | 'twenty_questions'
  | 'word_association'
  | 'finish_sentence'
  | 'two_truths_lie'
  | 'memory_challenge'
  | 'guess_favourite'
  | 'drawing_prompt'
  | 'startup_pitch'
  | 'coding_quiz'
  | 'geography_quiz'
  | 'history_quiz'
  | 'science_quiz'
  | 'maths_challenge'
  | 'daily_brain_teaser';

export type ArcadeGameStats = {
  gameId: ArcadeGameId;
  wins: number;
  streak: number;
  gamesPlayed: number;
  bestScore: number;
  lastPlayedAt?: ISODateString;
};

export type ArcadeGameDefinition = {
  id: ArcadeGameId;
  title: string;
  emoji: string;
  description: string;
  starterPrompt: string;
  xpReward: number;
};

// ─── Daily challenge ────────────────────────────────────────────

export type DailyChallengeStatus = 'pending' | 'accepted' | 'skipped' | 'replaced' | 'completed';

export type DailyChallenge = {
  id: EntityId;
  userId: EntityId;
  date: string;
  title: string;
  description: string;
  xpReward: number;
  status: DailyChallengeStatus;
  source: 'goal' | 'routine' | 'habit' | 'coach' | 'generic';
  createdAt: ISODateString;
  completedAt?: ISODateString;
  acceptedAt?: ISODateString;
  xpAwarded?: boolean;
  xpTransactionId?: EntityId;
  replaceCount?: number;
};

// ─── Weekly mission ─────────────────────────────────────────────

export type MissionTask = {
  id: EntityId;
  label: string;
  target: number;
  completed: number;
  done: boolean;
  skipped?: boolean;
};

export type WeeklyMissionStatus = 'pending' | 'active' | 'completed' | 'abandoned';

export type WeeklyMission = {
  id: EntityId;
  userId: EntityId;
  weekKey: string;
  title: string;
  theme: string;
  tasks: MissionTask[];
  xpReward: number;
  completed: boolean;
  status: WeeklyMissionStatus;
  startedAt?: ISODateString;
  completedAt?: ISODateString;
  xpAwarded?: boolean;
  xpTransactionId?: EntityId;
  supportiveMessage?: string;
};

// ─── XP & Levels ────────────────────────────────────────────────

export type XpProfile = {
  userId: EntityId;
  totalXp: number;
  level: number;
  xpToNextLevel: number;
  lifetimeXp: number;
  updatedAt: ISODateString;
};

export type XpSource =
  | 'chat'
  | 'goal'
  | 'routine'
  | 'challenge'
  | 'journal'
  | 'voice_note'
  | 'activity'
  | 'life_os'
  | 'game'
  | 'check_in'
  | 'daily_reflection'
  | 'achievement'
  | 'mission'
  | 'spin';

// ─── Achievements ───────────────────────────────────────────────

export type AchievementId =
  | 'chats_100'
  | 'chats_1000'
  | 'streak_7'
  | 'streak_30'
  | 'first_voice_note'
  | 'first_memory'
  | 'first_routine'
  | 'first_challenge'
  | 'first_mission'
  | 'first_future_self'
  | 'first_bucket_item'
  | 'first_life_book_chapter'
  | 'future_self_done'
  | 'bucket_complete'
  | 'memories_100'
  | 'startup_milestone'
  | 'fitness_milestone'
  | 'journal_streak'
  | 'challenge_streak'
  | 'arcade_master'
  | 'level_10'
  | 'level_25'
  | 'mission_complete'
  | 'seasonal_participant';

export type Achievement = {
  id: AchievementId;
  title: string;
  description: string;
  emoji: string;
  rarity: 'common' | 'rare' | 'legendary';
  unlockedAt?: ISODateString;
};

// ─── Daily spin ─────────────────────────────────────────────────

export type SpinRewardKind =
  | 'challenge'
  | 'quote'
  | 'starter'
  | 'fact'
  | 'teaser'
  | 'xp'
  | 'badge'
  | 'relationship_boost';

export type SpinReward = {
  kind: SpinRewardKind;
  label: string;
  value: string;
  xp?: number;
};

export type DailySpinState = {
  date: string;
  spun: boolean;
  reward?: SpinReward;
  xpGranted?: boolean;
  xpTransactionId?: EntityId;
};

export type XpTransaction = {
  id: EntityId;
  userId: EntityId;
  amount: number;
  source: XpSource;
  referenceId?: string;
  createdAt: ISODateString;
  revoked?: boolean;
};

export type AwardXpResult = {
  profile: XpProfile;
  transaction: XpTransaction;
  leveledUp: boolean;
  oldLevel: number;
  newLevel: number;
};

export type CelebrationKind =
  | 'xp_gain'
  | 'achievement'
  | 'challenge_complete'
  | 'mission_complete'
  | 'level_up'
  | 'streak_milestone'
  | 'game_high_score'
  | 'first_milestone';

export type CelebrationPayload = {
  kind: CelebrationKind;
  eventKey: string;
  title: string;
  subtitle?: string;
  emoji?: string;
  amount?: number;
  oldLevel?: number;
  newLevel?: number;
  rewardTitle?: string;
};

export type LevelUpEvent = {
  userId: EntityId;
  oldLevel: number;
  newLevel: number;
  rewardTitle?: string;
  message: string;
  shown: boolean;
  at: ISODateString;
};

export type PlayHistoryEntry = {
  id: EntityId;
  userId: EntityId;
  kind: 'challenge' | 'mission' | 'game' | 'xp' | 'achievement';
  title: string;
  detail?: string;
  at: ISODateString;
};

export type ArcadeGameSession = {
  id: EntityId;
  userId: EntityId;
  gameId: ArcadeGameId;
  startedAt: ISODateString;
  completedAt?: ISODateString;
  score: number;
  won: boolean;
  xpAwarded?: boolean;
  xpTransactionId?: EntityId;
};

// ─── Daily surprise ─────────────────────────────────────────────

export type DailySurprise = {
  id: EntityId;
  line: string;
  kind: 'poem' | 'fact' | 'challenge' | 'observation' | 'game_invite';
  actionPrompt?: string;
  shown: boolean;
};

// ─── Conversation decks ─────────────────────────────────────────

export type DeckCategory =
  | 'deep'
  | 'fun'
  | 'business'
  | 'sports'
  | 'dating'
  | 'movies'
  | 'dreams'
  | 'travel'
  | 'philosophy'
  | 'life'
  | 'coding'
  | 'productivity'
  | 'mental_fitness'
  | 'relationships'
  | 'learning';

export type DeckCard = {
  id: EntityId;
  category: DeckCategory;
  prompt: string;
};

// ─── Enjoyment tracking ─────────────────────────────────────────

export type EnjoymentProfile = {
  favouriteGames: ArcadeGameId[];
  favouriteActivities: string[];
  favouriteTopics: string[];
  humourPreference: 'low' | 'medium' | 'high';
  updatedAt: ISODateString;
};

// ─── Seasonal ───────────────────────────────────────────────────

export type SeasonalEvent = {
  id: string;
  label: string;
  theme: string;
  greeting?: string;
  challengeHint?: string;
  active: boolean;
};

// ─── Companion rewards ──────────────────────────────────────────

export type CompanionReward = {
  id: EntityId;
  kind: 'wallpaper' | 'quote_card' | 'journal_cover' | 'achievement_art';
  title: string;
  unlockedAt: ISODateString;
};

// ─── Today's Adventure (Home) ───────────────────────────────────

export type TodaysAdventure = {
  headline: string;
  primaryAction: 'challenge' | 'mission' | 'game' | 'spin' | 'talk';
  primaryLabel: string;
  challenge: DailyChallenge | null;
  featuredGame: ArcadeGameDefinition | null;
  deckCard: DeckCard | null;
  missionProgress: string | null;
  missionPercent: number;
  surprise: DailySurprise | null;
  spinAvailable: boolean;
  spinCountdownLabel?: string;
};

// ─── Dashboard ──────────────────────────────────────────────────

export type PlayGrowthData = {
  xpHistory: XpTransaction[];
  recentAchievements: Achievement[];
  challengeHistory: DailyChallenge[];
  missionHistory: WeeklyMission[];
  arcadeHighScores: Array<{ gameId: ArcadeGameId; title: string; bestScore: number; gamesPlayed: number }>;
  favouriteGames: ArcadeGameId[];
  streaks: { challenge: number; arcade: number };
};

export type Phase10DashboardData = {
  adventure: TodaysAdventure;
  dailyChallenge: DailyChallenge | null;
  weeklyMission: WeeklyMission | null;
  xp: XpProfile;
  achievements: Achievement[];
  newlyUnlocked: Achievement[];
  spin: DailySpinState;
  seasonal: SeasonalEvent | null;
  enjoyment: EnjoymentProfile;
  featuredGames: ArcadeGameDefinition[];
  rewards: CompanionReward[];
  growth: PlayGrowthData;
  pendingLevelUp: LevelUpEvent | null;
};
