import AsyncStorage from '@react-native-async-storage/async-storage';

import { Memory, UserProfile } from '../../types';
import { dailyPersonalityEngine } from '../personality/daily-personality-engine';

const LAST_SEEN_KEY = '@voxa/companion_last_seen';

export type CompanionMood = 'calm' | 'celebrating' | 'sleepy' | 'energetic' | 'warm';

export type CompanionGreeting = {
  headline: string;
  subline: string;
  mood: CompanionMood;
  isReturnAfterAbsence: boolean;
  daysAway: number;
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

export function buildCompanionGreeting(input: {
  profile: UserProfile;
  memories: Memory[];
  streakDays?: number;
  daysAway?: number;
  voxaName?: string;
}): CompanionGreeting {
  const firstName = input.profile.displayName.split(' ')[0];
  const voxaName = input.voxaName ?? input.profile.companionIdentity?.voxaName ?? 'Voxa';
  const hour = new Date().getHours();
  const daysAway = input.daysAway ?? 0;
  const personality = dailyPersonalityEngine.resolve();
  const rememberMoments = input.memories.filter((m) => m.tags?.includes('remember-this'));
  const recentMemory = input.memories[0];

  let mood: CompanionMood = 'calm';
  if (hour >= 23 || hour < 6) mood = 'sleepy';
  else if (hour >= 6 && hour < 11) mood = 'energetic';
  else if (personality.relaxation >= 0.7) mood = 'warm';

  if (daysAway >= 30) {
    return {
      headline: `${firstName} — you're back`,
      subline: "I'm really happy you came back. Your memories are safe, and I'm here.",
      mood: 'warm',
      isReturnAfterAbsence: true,
      daysAway,
    };
  }

  if (daysAway >= 7) {
    return {
      headline: `Good to see you, ${firstName}`,
      subline: "I've been wondering how you've been. No pressure — just glad you're here.",
      mood: 'warm',
      isReturnAfterAbsence: true,
      daysAway,
    };
  }

  if (daysAway >= 3) {
    return {
      headline: `Hey ${firstName}`,
      subline: "It's good to have you back. Want to ease in together?",
      mood: 'warm',
      isReturnAfterAbsence: true,
      daysAway,
    };
  }

  if (daysAway >= 1) {
    return {
      headline: `Good to see you, ${firstName}`,
      subline: 'I missed hearing from you yesterday.',
      mood: 'warm',
      isReturnAfterAbsence: true,
      daysAway,
    };
  }

  if (input.streakDays && input.streakDays >= 7 && input.streakDays % 7 === 0) {
    mood = 'celebrating';
    return {
      headline: `${input.streakDays}-day streak 🔥`,
      subline: `${voxaName} sees how consistently you show up. That matters.`,
      mood,
      isReturnAfterAbsence: false,
      daysAway: 0,
    };
  }

  if (rememberMoments.length > 0 && Math.random() < 0.35) {
    const moment = rememberMoments[0];
    return {
      headline: hour < 12 ? `Morning, ${firstName}` : hour < 17 ? `Hey ${firstName}` : `Evening, ${firstName}`,
      subline: `I still remember when you said: "${moment.content.slice(0, 56)}${moment.content.length > 56 ? '…' : ''}"`,
      mood: 'warm',
      isReturnAfterAbsence: false,
      daysAway: 0,
    };
  }

  const morningLines = [
    `Ready when you are, ${firstName}.`,
    `What's on your mind this morning?`,
    `A new day — I'm here.`,
  ];
  const afternoonLines = [
    `How's your day going, ${firstName}?`,
    `I'm here if you want to talk.`,
    `Anything I can help with?`,
  ];
  const eveningLines = [
    `Winding down together, ${firstName}?`,
    `How are you feeling tonight?`,
    `I'm glad you're here.`,
  ];

  const pool = hour < 12 ? morningLines : hour < 17 ? afternoonLines : eveningLines;
  const subline = pool[Math.floor(Math.random() * pool.length)];

  const timeLabel = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return {
    headline: `${timeLabel}, ${firstName}`,
    subline,
    mood,
    isReturnAfterAbsence: false,
    daysAway: 0,
  };
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
