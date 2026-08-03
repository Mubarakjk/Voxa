import AsyncStorage from '@react-native-async-storage/async-storage';

import { GreetingStyle } from '../../constants/companion-studio-extended';
import { Goal, Memory, UserProfile } from '../../types';
import { dailyPersonalityEngine } from '../personality/daily-personality-engine';
import { CompanionFocusState, getCompanionFocusState, upsertCompanionFocusState } from './companion-focus-state';

const LAST_SEEN_KEY = '@voxa/companion_last_seen';
const LAST_GREETING_KEY = '@voxa/companion_last_greeting';

export type CompanionMood = 'calm' | 'celebrating' | 'sleepy' | 'energetic' | 'warm';

export type CompanionGreeting = {
  /** Time / welcome eyebrow */
  greeting: string;
  headline: string;
  subline: string;
  /** Today's focus line for dashboard / CTAs */
  todayFocus: string | null;
  mood: CompanionMood;
  isReturnAfterAbsence: boolean;
  daysAway: number;
};

export type PresenceContext = {
  profile: UserProfile;
  memories: Memory[];
  streakDays?: number;
  daysAway?: number;
  voxaName?: string;
  activeGoal?: Goal | null;
  nextRoutineTitle?: string | null;
  followUpTopic?: string | null;
  conversationSummary?: string | null;
  greetingStyle?: GreetingStyle;
  focusState?: CompanionFocusState | null;
  /** Today's check-in mood label, if any */
  moodLabel?: string | null;
  /** Avoid repeating the exact prior headline/subline pair */
  lastGreetingKey?: string | null;
};

export async function recordCompanionVisit(): Promise<void> {
  await AsyncStorage.setItem(LAST_SEEN_KEY, new Date().toISOString());
}

export async function getDaysSinceLastVisit(): Promise<number> {
  const raw = await AsyncStorage.getItem(LAST_SEEN_KEY);
  if (!raw) return 0;
  const diff = Date.now() - new Date(raw).getTime();
  return Math.floor(diff / 86_400_000);
}

function timeGreetingPool(hour: number, firstName: string, style?: GreetingStyle): string[] {
  if (style === 'minimal') return [firstName, `Hi ${firstName}`, firstName];
  if (style === 'formal') {
    if (hour < 12) return [`Good morning, ${firstName}`, `Morning, ${firstName}`];
    if (hour < 17) return [`Good afternoon, ${firstName}`, `Hello, ${firstName}`];
    return [`Good evening, ${firstName}`, `Evening, ${firstName}`];
  }
  if (style === 'energetic') {
    if (hour < 12) return [`Morning, ${firstName}!`, `Let's go, ${firstName}`];
    if (hour < 17) return [`Hey ${firstName}!`, `${firstName} — good to see you`];
    return [`Evening energy, ${firstName}`, `Hey ${firstName}`];
  }
  if (style === 'casual') {
    if (hour < 12) return [`Morning, ${firstName}`, `Hey ${firstName}`];
    if (hour < 17) return [`Hey ${firstName}`, `What's up, ${firstName}`];
    return [`Hey ${firstName}`, `Night check-in, ${firstName}`];
  }
  if (hour < 12) return [`Good morning, ${firstName}`, `Morning, ${firstName}`, `Hi ${firstName}`];
  if (hour < 17) return [`Good afternoon, ${firstName}`, `Hey ${firstName}`, `Hi ${firstName}`];
  return [`Good evening, ${firstName}`, `Hey ${firstName}`, `Evening, ${firstName}`];
}

function pickRotated(options: string[], seed: number, avoid?: string | null): string {
  if (options.length === 0) return '';
  const start = Math.abs(seed) % options.length;
  for (let i = 0; i < options.length; i += 1) {
    const candidate = options[(start + i) % options.length];
    if (!avoid || candidate !== avoid) return candidate;
  }
  return options[start];
}

function moodAwareHeadline(firstName: string, moodLabel?: string | null, seed = 0): string | null {
  const mood = (moodLabel ?? '').toLowerCase();
  if (!mood) return null;
  if (/stress|anx|overwhelm/.test(mood)) {
    return pickRotated(
      [`I'm with you, ${firstName}`, `Slow day — I've got you`, `We'll take it gently`],
      seed,
    );
  }
  if (/tired|exhaust|drain/.test(mood)) {
    return pickRotated(
      [`Rest is allowed, ${firstName}`, `Easy pace today`, `Glad you showed up`],
      seed,
    );
  }
  if (/motivat|great|good|excit|energ/.test(mood)) {
    return pickRotated(
      [`Love this energy, ${firstName}`, `Let's use this momentum`, `You're on today`],
      seed,
    );
  }
  if (/okay|ok|fine|calm|meh/.test(mood)) {
    return pickRotated([`Steady is good, ${firstName}`, `I'm here with you`, `How's the middle feeling?`], seed);
  }
  return null;
}

function timeGreeting(hour: number, firstName: string, style?: GreetingStyle, seed = 0, avoid?: string | null): string {
  return pickRotated(timeGreetingPool(hour, firstName, style), seed, avoid);
}

function deriveTodayFocus(input: PresenceContext): string | null {
  if (input.focusState?.focus) return input.focusState.focus;
  if (input.activeGoal?.title) {
    const progress = typeof input.activeGoal.progress === 'number' ? ` (${input.activeGoal.progress}%)` : '';
    return `${input.activeGoal.title}${progress}`;
  }
  if (input.followUpTopic) return input.followUpTopic;
  if (input.nextRoutineTitle) return input.nextRoutineTitle;
  if (input.conversationSummary) return input.conversationSummary.slice(0, 80);
  return null;
}

function buildContextualSubline(input: PresenceContext, todayFocus: string | null): string | null {
  const previous = input.focusState?.previousFocus;
  if (previous && todayFocus && previous !== todayFocus) {
    return `Yesterday you worked on ${previous}. Today your biggest focus is ${todayFocus}.`;
  }
  if (todayFocus && input.activeGoal?.title && todayFocus.includes(input.activeGoal.title)) {
    return `Today your biggest focus is ${todayFocus}.`;
  }
  if (todayFocus && input.nextRoutineTitle) {
    return `Today’s focus is ${todayFocus}. Next up: ${input.nextRoutineTitle}.`;
  }
  if (todayFocus) {
    return `Today your biggest focus is ${todayFocus}.`;
  }
  if (input.followUpTopic) {
    return `I wanted to check in about ${input.followUpTopic}.`;
  }
  if (input.nextRoutineTitle) {
    return `Next on your routine: ${input.nextRoutineTitle}.`;
  }
  return null;
}

export function buildCompanionGreeting(input: PresenceContext): CompanionGreeting {
  const firstName = input.profile.displayName.split(' ')[0];
  const voxaName = input.voxaName ?? input.profile.companionIdentity?.voxaName ?? 'Voxa';
  const hour = new Date().getHours();
  const daysAway = input.daysAway ?? 0;
  const personality = dailyPersonalityEngine.resolve();
  const rememberMoments = input.memories.filter((m) => m.tags?.includes('remember-this'));
  const daySeed = Math.floor(Date.now() / 86_400_000) + (input.profile.id?.length ?? 0);
  const lastKey = input.lastGreetingKey ?? null;
  const lastParts = lastKey?.split('||') ?? [];
  const greeting = timeGreeting(hour, firstName, input.greetingStyle, daySeed, lastParts[0]);
  const todayFocus = deriveTodayFocus(input);
  const contextual = buildContextualSubline(input, todayFocus);
  const moodHeadline = moodAwareHeadline(firstName, input.moodLabel, daySeed + 3);

  let mood: CompanionMood = 'calm';
  if (hour >= 23 || hour < 6) mood = 'sleepy';
  else if (hour >= 6 && hour < 11) mood = 'energetic';
  else if (personality.relaxation >= 0.7) mood = 'warm';
  if (input.greetingStyle === 'energetic') mood = 'energetic';
  if (input.greetingStyle === 'warm') mood = 'warm';
  const moodLower = (input.moodLabel ?? '').toLowerCase();
  if (/motivat|great|excit/.test(moodLower)) mood = 'energetic';
  if (/stress|tired|overwhelm/.test(moodLower)) mood = 'warm';

  const welcomeHeadlines = [
    `Welcome back, ${firstName}`,
    `Good to see you, ${firstName}`,
    `Hey ${firstName}`,
    `${firstName} — I'm here`,
  ];

  const finish = (partial: Omit<CompanionGreeting, 'greeting'> & { greeting?: string }): CompanionGreeting => ({
    ...partial,
    greeting: partial.greeting ?? greeting,
  });

  if (daysAway >= 30) {
    return finish({
      headline: `${firstName} — you're back`,
      subline: contextual ?? "I'm really happy you came back. Your memories are safe, and I'm here.",
      todayFocus,
      mood: 'warm',
      isReturnAfterAbsence: true,
      daysAway,
    });
  }

  if (daysAway >= 7) {
    return finish({
      headline: pickRotated([`Good to see you, ${firstName}`, `Missed this, ${firstName}`], daySeed, lastParts[1]),
      subline: contextual ?? "I've been wondering how you've been. No pressure — just glad you're here.",
      todayFocus,
      mood: 'warm',
      isReturnAfterAbsence: true,
      daysAway,
    });
  }

  if (daysAway >= 3) {
    return finish({
      headline: pickRotated([`Welcome back, ${firstName}`, `Nice to have you back`], daySeed, lastParts[1]),
      subline: contextual ?? "It's good to have you back. Want to ease in together?",
      todayFocus,
      mood: 'warm',
      isReturnAfterAbsence: true,
      daysAway,
    });
  }

  if (daysAway >= 1) {
    return finish({
      headline: pickRotated(welcomeHeadlines, daySeed + 1, lastParts[1]),
      subline: contextual ?? pickRotated(
        ['I missed hearing from you yesterday.', 'Glad you came back today.', 'How did yesterday leave you?'],
        daySeed + 2,
        lastParts[2],
      ),
      todayFocus,
      mood: 'warm',
      isReturnAfterAbsence: true,
      daysAway,
    });
  }

  if (input.streakDays && input.streakDays >= 7 && input.streakDays % 7 === 0) {
    return finish({
      headline: `${input.streakDays}-day streak`,
      subline: contextual ?? `${voxaName} sees how consistently you show up. That matters.`,
      todayFocus,
      mood: 'celebrating',
      isReturnAfterAbsence: false,
      daysAway: 0,
    });
  }

  if (moodHeadline) {
    return finish({
      headline: moodHeadline,
      subline: contextual ?? pickRotated(
        ['How are you feeling now?', 'Want to talk it through?', "I'm listening whenever you're ready."],
        daySeed + 4,
        lastParts[2],
      ),
      todayFocus,
      mood,
      isReturnAfterAbsence: false,
      daysAway: 0,
    });
  }

  if (contextual) {
    return finish({
      headline: pickRotated(welcomeHeadlines, daySeed + 5, lastParts[1]),
      subline: contextual,
      todayFocus,
      mood,
      isReturnAfterAbsence: false,
      daysAway: 0,
    });
  }

  if (rememberMoments.length > 0) {
    const moment = rememberMoments[0];
    return finish({
      headline: pickRotated(welcomeHeadlines, daySeed + 6, lastParts[1]),
      subline: `I still remember: "${moment.content.slice(0, 72)}${moment.content.length > 72 ? '…' : ''}"`,
      todayFocus,
      mood: 'warm',
      isReturnAfterAbsence: false,
      daysAway: 0,
    });
  }

  const fallbacks =
    hour < 12
      ? [
          `Ready when you are — what's on your mind this morning?`,
          `A new day. I'm here with you.`,
          `What's one thing that would make today feel better?`,
        ]
      : hour < 17
        ? [
            `How's your day going? I'm here if you want to talk.`,
            `Anything I can help you focus on?`,
            `Need a brainstorm, a plan, or just a check-in?`,
          ]
        : [
            `Winding down together? I'm glad you're here.`,
            `How are you feeling tonight?`,
            `Want to reflect, or keep it light?`,
          ];

  return finish({
    headline: pickRotated(welcomeHeadlines, daySeed + 7, lastParts[1]),
    subline: pickRotated(fallbacks, daySeed + 8, lastParts[2]),
    todayFocus,
    mood,
    isReturnAfterAbsence: false,
    daysAway: 0,
  });
}

export async function rememberLastGreeting(greeting: CompanionGreeting): Promise<void> {
  const key = `${greeting.greeting}||${greeting.headline}||${greeting.subline}`;
  await AsyncStorage.setItem(LAST_GREETING_KEY, key);
}

export async function getLastGreetingKey(): Promise<string | null> {
  return AsyncStorage.getItem(LAST_GREETING_KEY);
}

/** Sync focus state from live dashboard signals (goals / follow-ups / routines). */
export async function syncCompanionFocusFromSignals(input: {
  userId: string;
  activeGoalTitle?: string | null;
  followUpTopic?: string | null;
  nextRoutineTitle?: string | null;
  todayFocusLine?: string | null;
}): Promise<CompanionFocusState | null> {
  const focus =
    input.todayFocusLine?.trim() ||
    input.activeGoalTitle?.trim() ||
    input.followUpTopic?.trim() ||
    input.nextRoutineTitle?.trim() ||
    '';
  if (!focus) return getCompanionFocusState(input.userId);
  return upsertCompanionFocusState({ userId: input.userId, focus });
}

export function pickDailySurprise(profile: UserProfile): string | null {
  const dayKey = new Date().toISOString().slice(0, 10);
  const seed = `${profile.id}-${dayKey}`;
  const hash = seed.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const surprises = [
    'You’re doing better than you think.',
    'Small steps still count.',
    'I’m glad you opened Voxa today.',
    'Your consistency is building something real.',
    'Ask me anything — I’m listening.',
  ];
  if (hash % 5 !== 0) return null;
  return surprises[hash % surprises.length];
}

export { getCompanionFocusState, upsertCompanionFocusState };
