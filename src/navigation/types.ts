import { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
};

export type RootStackParamList = {
  Welcome: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  CreateReminder: { presetKind?: import('../types').ReminderKind } | undefined;
  CreateGoal: undefined;
  Memory: undefined;
  Music: undefined;
  CompanionCustomisation: undefined;
  CompanionStudio: undefined;
  CompanionStudioVoice: undefined;
  CompanionStudioPersonality: undefined;
  CompanionStudioAppearance: undefined;
  CompanionStudioExtended: undefined;
  Features: undefined;
  Paywall: { source?: string } | undefined;
  VoiceCall: undefined;
  SafeCall: undefined;
  RealtimeCall:
    | {
        autoStart?: boolean;
        scheduledCallId?: string;
        fromScheduledCall?: boolean;
      }
    | undefined;
  ConversationHistory: undefined;
  RoutineCoach: undefined;
  DailyCheckIn: { period?: 'morning' | 'evening' } | undefined;
  WeeklyRecap: undefined;
  VoiceNoteRecorderDiagnostic: undefined;
  HealthCheck: undefined;
  BillingQA: undefined;
  LifeOSHub: undefined;
  LifeTimeline: undefined;
  GoalDetail: { goalId?: string } | undefined;
  FutureSelf: undefined;
  VisionBoard: undefined;
  BucketList: undefined;
  DreamJournal: undefined;
  DecisionSimulator: undefined;
  DebateMode: undefined;
  CoachScore: undefined;
  MemoryConnections: undefined;
  LifeBook: undefined;
  MemoryMovie: undefined;
  RelationshipProfile: undefined;
  Activities: undefined;
  FeatureDiscovery: undefined;
  MonthlyReplay: undefined;
  SharedChallenges: undefined;
  FocusMode: undefined;
  CompanionArcade: undefined;
  GamesHub: undefined;
  ImpostorGame: undefined;
  MafiaGame: undefined;
  PartyGame: { gameId: import('../types/social-games').PartyGameId };
  AchievementCentre: undefined;
  ConversationDecks: undefined;
  DailySpin: undefined;
  DailyChallenge: undefined;
  WeeklyMission: undefined;
  ArcadeGameSession: { gameId: import('../types/phase10-play').ArcadeGameId };
  ScheduledCheckIns: undefined;
  ProactiveCheckIns: undefined;
  WeeklyLetter: undefined;
  PhotoMemories: undefined;
  MoodJournal: undefined;
  RelationshipGrowth: undefined;
  DailyReflection: undefined;
  MoodTimeline: undefined;
  VoiceConversation: { autoStart?: boolean; safe?: boolean } | undefined;
  CoachingHub: undefined;
  ConversationWorlds: undefined;
  RelationshipTimeline: undefined;
  MyCompanion: undefined;
  CompanionChallenges: undefined;
  GiftsCollection: undefined;
  DailyNews: undefined;
  WeatherLocationSetup: undefined;
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
  NutritionOnboarding: undefined;
  NutritionDashboard: undefined;
  NutritionAddMeal: { dateKey?: string } | undefined;
  NutritionHistory: undefined;
  NutritionSettings: undefined;
  NotesHub: undefined;
  NoteEditor: { noteId: string };
  VoicePicker: undefined;
  ScheduledCalls: undefined;
  ScheduleCompanionCall: { callId?: string } | undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Talk: { starterPrompt?: string; mode?: import('../types').CompanionModeId; conversationId?: string } | undefined;
  Voxa: { action?: 'voice' | 'safe' | 'music' | 'camera' } | undefined;
  Routine: undefined;
  Journey: undefined;
  You: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
