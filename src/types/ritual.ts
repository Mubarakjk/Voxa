export type RitualPeriod = 'morning' | 'evening';

export type RitualStreaks = {
  morning: number;
  evening: number;
  combined: number;
  reflection: number;
  coach: number;
};

export type RitualDayStatus = {
  date: string;
  morningCompleted: boolean;
  eveningCompleted: boolean;
  morningSkipped: boolean;
  eveningSkipped: boolean;
  morningRemindLater: boolean;
  eveningRemindLater: boolean;
};

export type SpecialMoment = {
  id: string;
  title: string;
  message: string;
  kind: 'birthday' | 'anniversary' | 'milestone' | 'goal_complete' | 'streak' | 'return';
  showConfetti: boolean;
};

export type MorningRitualContent = {
  greeting: string;
  subGreeting: string;
  streaks: RitualStreaks;
  routineStreak: number;
  mainGoal: string | null;
  routineSummary: string;
  coachMessage: string;
  moodLabel: string;
  todaysFocus: string;
  dailyQuote: string;
  dailyChallenge: string;
  specialMoment: SpecialMoment | null;
  smartContext: string | null;
  missedDayMessage: string | null;
};

export type EveningRitualContent = {
  greeting: string;
  subGreeting: string;
  wins: string[];
  completedRoutines: number;
  missedRoutines: number;
  totalRoutines: number;
  moodLabel: string;
  photosToday: number;
  memoriesToday: number;
  conversationHighlight: string | null;
  coachAdvice: string;
  tomorrowFocus: string;
  goodnightMessage: string;
  specialMoment: SpecialMoment | null;
  missedDayMessage: string | null;
  streaks: RitualStreaks;
};

export type RitualHomeState = {
  date: string;
  progressPercent: number;
  morningDone: boolean;
  eveningDone: boolean;
  pendingPeriod: RitualPeriod | null;
  streaks: RitualStreaks;
  continueLabel: string | null;
};
