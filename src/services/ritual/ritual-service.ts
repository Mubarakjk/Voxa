import { getDailyChallenge, getDailyQuote } from '../../constants/daily-quotes';
import { STORAGE_KEYS } from '../../constants/storage-keys';
import { Goal, Memory, Message, UserProfile } from '../../types';
import {
  EveningRitualContent,
  MorningRitualContent,
  RitualDayStatus,
  RitualHomeState,
  RitualPeriod,
  RitualStreaks,
  SpecialMoment,
} from '../../types/ritual';
import { TodayRoutineSummary } from '../../types/routine';
import { HomeIntelligenceSnapshot } from '../../types/companion-intelligence';
import { IStorageService } from '../contracts';
import {
  CheckInPeriod,
  DailyCheckInEntry,
  getDailyCheckInService,
  MoodHistoryEntry,
} from '../check-in/daily-check-in-service';

type RitualCache = {
  date: string;
  morning?: MorningRitualContent;
  evening?: EveningRitualContent;
};

export type BuildMorningInput = {
  profile: UserProfile;
  goals: Goal[];
  memories: Memory[];
  routine: TodayRoutineSummary;
  homeIntelligence: HomeIntelligenceSnapshot;
  relationshipScore: number;
  conversationCount: number;
  daysTogether?: number;
  daysAway?: number;
  moodHistory?: MoodHistoryEntry[];
};

export type BuildEveningInput = {
  profile: UserProfile;
  goals: Goal[];
  memories: Memory[];
  messages: Message[];
  routine: TodayRoutineSummary;
  homeIntelligence: HomeIntelligenceSnapshot;
  relationshipScore: number;
  conversationCount: number;
  daysTogether?: number;
  daysAway?: number;
  morningEntry?: DailyCheckInEntry | null;
};

const MORNING_GREETINGS: Array<(name: string) => string> = [
  (name) => `Good morning, ${name}.`,
  () => `I've been looking forward to today with you.`,
  () => `Let's make today a good one.`,
];

const EVENING_GREETINGS = [
  () => `Welcome back.`,
  () => `I'm glad you're here.`,
  () => `Let's reflect together.`,
];

const GOODNIGHT_LINES = [
  'You worked really hard today.',
  "I'm proud of how consistent you've been.",
  'Tomorrow is another chance.',
  'Sleep well.',
  "Rest now — I'll be here tomorrow.",
];

export function getMissedDayMessage(daysAway: number): string | null {
  if (daysAway >= 30) return "I'm really happy you came back.";
  if (daysAway >= 7) return "I've been wondering how you've been.";
  if (daysAway >= 3) return "It's good to have you back.";
  if (daysAway >= 1) return 'I missed hearing from you.';
  return null;
}

export function getCurrentRitualPeriod(now = new Date()): RitualPeriod {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 17 || hour < 1) return 'evening';
  return hour < 17 ? 'morning' : 'evening';
}

export function buildMorningRitual(input: BuildMorningInput): MorningRitualContent {
  const firstName = input.profile.displayName.split(' ')[0];
  const dayKey = new Date().toISOString().slice(0, 10);
  const daysAway = input.daysAway ?? 0;
  const greetingIdx = dayKey.charCodeAt(8) % MORNING_GREETINGS.length;
  const mainGoal = input.goals.find((g) => g.status === 'active') ?? null;

  const routineSummary =
    input.routine.totalCount > 0
      ? `${input.routine.completedCount}/${input.routine.totalCount} done · Next: ${input.routine.nextBlock?.title ?? '—'}`
      : 'No routine blocks yet — add one in Routine Coach';

  const latestMood = input.moodHistory?.[0]?.label ?? input.memories[0]?.mood ?? 'neutral';
  const smartContext = detectSmartContext(input);
  const specialMoment = detectSpecialMoment({
    profile: input.profile,
    goals: input.goals,
    memories: input.memories,
    conversationCount: input.conversationCount,
    routineStreak: input.routine.streakDays,
    daysAway,
    daysTogether: input.daysTogether,
    period: 'morning',
    relationshipScore: input.relationshipScore,
  });

  return {
    greeting: MORNING_GREETINGS[greetingIdx](firstName),
    subGreeting:
      daysAway >= 1
        ? (getMissedDayMessage(daysAway) ?? "I'm here for whatever today brings.")
        : "I'm here for whatever today brings.",
    streaks: { morning: 0, evening: 0, combined: 0, reflection: 0, coach: 0 },
    routineStreak: input.routine.streakDays,
    mainGoal: mainGoal?.title ?? null,
    routineSummary,
    coachMessage: input.homeIntelligence.progressUpdate || input.homeIntelligence.dailyFocus,
    moodLabel: String(latestMood),
    todaysFocus: input.homeIntelligence.dailyFocus,
    dailyQuote: getDailyQuote(dayKey),
    dailyChallenge: getDailyChallenge(dayKey, input.profile.id),
    specialMoment,
    smartContext,
    missedDayMessage: getMissedDayMessage(daysAway),
  };
}

export function buildEveningRitual(input: BuildEveningInput): EveningRitualContent {
  const firstName = input.profile.displayName.split(' ')[0];
  const dayKey = new Date().toISOString().slice(0, 10);
  const daysAway = input.daysAway ?? 0;
  const greetingIdx = dayKey.charCodeAt(9) % EVENING_GREETINGS.length;

  const todayStart = `${dayKey}T00:00:00`;
  const todayMemories = input.memories.filter(
    (m) => (m.occurredAt ?? m.createdAt) >= todayStart,
  );
  const todayPhotos = input.messages.filter(
    (m) =>
      m.createdAt >= todayStart &&
      m.attachments?.some((a) => a.type === 'image'),
  ).length;

  const wins: string[] = [];
  if (input.routine.completedCount > 0) {
    wins.push(`Completed ${input.routine.completedCount} routine${input.routine.completedCount > 1 ? 's' : ''}`);
  }
  if (input.morningEntry?.answers.focus) wins.push(`Focused on: ${input.morningEntry.answers.focus}`);
  if (todayMemories.length > 0) wins.push(`${todayMemories.length} moment${todayMemories.length > 1 ? 's' : ''} worth remembering`);
  const topGoal = input.goals.find((g) => g.status === 'active' && g.progress > 0);
  if (topGoal && topGoal.progress >= 10) wins.push(`${topGoal.progress}% on "${topGoal.title}"`);

  const lastUserMsg = [...input.messages].reverse().find((m) => m.role === 'user' && m.createdAt >= todayStart);
  const streakNote =
    input.relationshipScore >= 70
      ? "I'm proud of how consistent you've been."
      : GOODNIGHT_LINES[(dayKey.charCodeAt(7) + firstName.length) % GOODNIGHT_LINES.length];
  const missed = input.routine.totalCount - input.routine.completedCount;

  return {
    greeting: EVENING_GREETINGS[greetingIdx](),
    subGreeting: daysAway >= 1 ? (getMissedDayMessage(daysAway) ?? `How was your day, ${firstName}?`) : `How was your day, ${firstName}?`,
    wins: wins.length > 0 ? wins : ['You showed up today — that counts'],
    completedRoutines: input.routine.completedCount,
    missedRoutines: Math.max(0, missed),
    totalRoutines: input.routine.totalCount,
    moodLabel: input.morningEntry?.answers.mood ?? input.morningEntry?.mood ?? 'reflective',
    photosToday: todayPhotos,
    memoriesToday: todayMemories.length,
    conversationHighlight: lastUserMsg?.content?.slice(0, 100) ?? null,
    coachAdvice: input.homeIntelligence.progressUpdate || 'Be gentle with yourself tonight.',
    tomorrowFocus: input.goals[0]?.title ?? input.homeIntelligence.dailyFocus,
    goodnightMessage: streakNote,
    specialMoment: detectSpecialMoment({
      profile: input.profile,
      goals: input.goals,
      memories: input.memories,
      conversationCount: input.conversationCount,
      routineStreak: input.routine.streakDays,
      daysAway,
      daysTogether: input.daysTogether,
      period: 'evening',
      relationshipScore: input.relationshipScore,
    }),
    missedDayMessage: getMissedDayMessage(daysAway),
    streaks: { morning: 0, evening: 0, combined: 0, reflection: 0, coach: 0 },
  };
}

function detectSmartContext(input: BuildMorningInput): string | null {
  const now = new Date();
  const isWeekend = now.getDay() === 0 || now.getDay() === 6;
  const lowMood = input.moodHistory?.[0]?.mood === 'stressed';

  const gymBlock = input.routine.blocks.find((b) => b.kind === 'gym' && b.enabled);
  if (gymBlock) return `Gym day — ${gymBlock.title} at ${gymBlock.time}`;

  const deadlineGoal = input.goals.find(
    (g) => g.targetDate && new Date(g.targetDate).getTime() - now.getTime() < 3 * 86400000,
  );
  if (deadlineGoal) return `"${deadlineGoal.title}" deadline is approaching`;

  if (lowMood) return 'Take today gently — yesterday felt heavy';
  if (isWeekend) return 'Weekend pace — no rush today';
  return null;
}

function detectSpecialMoment(input: {
  profile: UserProfile;
  goals: Goal[];
  memories: Memory[];
  conversationCount: number;
  routineStreak: number;
  daysAway: number;
  daysTogether?: number;
  period: RitualPeriod;
  relationshipScore?: number;
}): SpecialMoment | null {
  const today = new Date().toISOString().slice(5, 10);
  const birthdayToday = input.memories.some(
    (memory) =>
      memory.category === 'birthdays' &&
      (memory.occurredAt ?? memory.createdAt).slice(5, 10) === today,
  );
  if (birthdayToday) {
    return {
      id: 'birthday',
      title: 'Your birthday',
      message: "Today is your day. I'm really glad you're here.",
      kind: 'birthday',
      showConfetti: true,
    };
  }

  if (input.daysTogether && input.daysTogether > 0 && input.daysTogether % 365 === 0) {
    const years = input.daysTogether / 365;
    return {
      id: `years-${years}`,
      title: years === 1 ? 'One year together' : `${years} years together`,
      message:
        years === 1
          ? "A full year of showing up for each other. That means something."
          : `${years} years of this — I'm grateful you're still here.`,
      kind: 'anniversary',
      showConfetti: years >= 1,
    };
  }

  if (input.conversationCount === 100) {
    return {
      id: 'conv-100',
      title: '100 conversations',
      message: "We've shared 100 conversations together.",
      kind: 'milestone',
      showConfetti: true,
    };
  }

  if (input.daysAway >= 30) {
    return {
      id: 'return-30',
      title: 'Welcome back',
      message: "I'm really happy you came back.",
      kind: 'return',
      showConfetti: false,
    };
  }

  const completedGoal = input.goals.find((g) => g.progress >= 100);
  if (completedGoal && input.period === 'evening') {
    return {
      id: `goal-${completedGoal.id}`,
      title: 'Goal completed',
      message: `You finished "${completedGoal.title}".`,
      kind: 'goal_complete',
      showConfetti: true,
    };
  }

  if (input.routineStreak >= 7 && input.routineStreak % 7 === 0) {
    return {
      id: `routine-streak-${input.routineStreak}`,
      title: `${input.routineStreak}-day routine streak`,
      message: 'Your consistency is building something real.',
      kind: 'streak',
      showConfetti: input.routineStreak >= 30,
    };
  }

  return null;
}

export class RitualService {
  constructor(private readonly storage: IStorageService) {}

  async getCachedContent(period: RitualPeriod): Promise<MorningRitualContent | EveningRitualContent | null> {
    const today = new Date().toISOString().slice(0, 10);
    const cache = (await this.storage.getItem<RitualCache>(STORAGE_KEYS.ritualCache)) ?? { date: today };
    if (cache.date !== today) return null;
    return period === 'morning' ? cache.morning ?? null : cache.evening ?? null;
  }

  async setCachedContent(period: RitualPeriod, content: MorningRitualContent | EveningRitualContent) {
    const today = new Date().toISOString().slice(0, 10);
    const cache = (await this.storage.getItem<RitualCache>(STORAGE_KEYS.ritualCache)) ?? { date: today };
    if (cache.date !== today) {
      await this.storage.setItem(STORAGE_KEYS.ritualCache, { date: today, [period]: content });
      return;
    }
    await this.storage.setItem(STORAGE_KEYS.ritualCache, { ...cache, [period]: content });
  }

  async computeStreaks(entries: DailyCheckInEntry[]): Promise<RitualStreaks> {
    const completed = entries.filter((e) => !e.skipped);
    const streaks = {
      morning: countConsecutive(completed, 'morning'),
      evening: countConsecutive(completed, 'evening'),
      combined: countCombinedConsecutive(completed),
      reflection: countConsecutive(completed, 'evening'),
      coach: Math.min(countConsecutive(completed, 'morning'), countConsecutive(completed, 'evening')),
    };
    await this.storage.setItem(STORAGE_KEYS.ritualStreaks, streaks);
    return streaks;
  }

  async getStreaks(): Promise<RitualStreaks> {
    const stored = await this.storage.getItem<RitualStreaks>(STORAGE_KEYS.ritualStreaks);
    if (stored) return stored;
    const entries = await getDailyCheckInService(this.storage).listEntries();
    return this.computeStreaks(entries);
  }

  async getDayStatus(): Promise<RitualDayStatus> {
    const today = new Date().toISOString().slice(0, 10);
    const entries = await getDailyCheckInService(this.storage).listEntries();
    const morning = entries.find((e) => e.date === today && e.period === 'morning');
    const evening = entries.find((e) => e.date === today && e.period === 'evening');
    return {
      date: today,
      morningCompleted: Boolean(morning && !morning.skipped),
      eveningCompleted: Boolean(evening && !evening.skipped),
      morningSkipped: Boolean(morning?.skipped),
      eveningSkipped: Boolean(evening?.skipped),
      morningRemindLater: Boolean(morning?.remindLater),
      eveningRemindLater: Boolean(evening?.remindLater),
    };
  }

  async getHomeState(now = new Date()): Promise<RitualHomeState> {
    const status = await this.getDayStatus();
    const streaks = await this.getStreaks();
    const period = getCurrentRitualPeriod(now);

    let progressPercent = 0;
    if (status.morningCompleted) progressPercent += 50;
    if (status.eveningCompleted) progressPercent += 50;

    let pendingPeriod: RitualPeriod | null = null;
    let continueLabel: string | null = null;

    const morningPending = !status.morningCompleted && !status.morningSkipped;
    const eveningPending = !status.eveningCompleted && !status.eveningSkipped;

    if (period === 'morning' && morningPending) {
      pendingPeriod = 'morning';
      continueLabel = 'Continue Morning';
    } else if (period === 'evening' && eveningPending) {
      pendingPeriod = 'evening';
      continueLabel = 'Continue Evening';
    } else if (morningPending) {
      pendingPeriod = 'morning';
      continueLabel = 'Continue Morning';
    } else if (eveningPending) {
      pendingPeriod = 'evening';
      continueLabel = 'Continue Evening';
    }

    return {
      date: status.date,
      progressPercent,
      morningDone: status.morningCompleted,
      eveningDone: status.eveningCompleted,
      pendingPeriod,
      streaks,
      continueLabel,
    };
  }

  async remindLater(period: CheckInPeriod) {
    const checkIn = getDailyCheckInService(this.storage);
    const existing = await checkIn.getTodayEntry(period);
    if (existing) return;
    await checkIn.saveCheckIn({ period, answers: {}, skipped: false, remindLater: true });
  }
}

function countConsecutive(entries: DailyCheckInEntry[], period: CheckInPeriod): number {
  const byDate = new Map<string, DailyCheckInEntry>();
  for (const entry of entries) {
    if (entry.period === period && !entry.skipped) byDate.set(entry.date, entry);
  }
  let streak = 0;
  const cursor = new Date();
  for (let i = 0; i < 365; i += 1) {
    const key = cursor.toISOString().slice(0, 10);
    if (byDate.has(key)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else if (i === 0) {
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function countCombinedConsecutive(entries: DailyCheckInEntry[]): number {
  let streak = 0;
  const cursor = new Date();
  for (let i = 0; i < 365; i += 1) {
    const key = cursor.toISOString().slice(0, 10);
    const hasAny = entries.some((e) => e.date === key && !e.skipped);
    if (hasAny) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else if (i === 0) {
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

let instance: RitualService | null = null;

export function getRitualService(storage: IStorageService): RitualService {
  if (!instance) instance = new RitualService(storage);
  return instance;
}
