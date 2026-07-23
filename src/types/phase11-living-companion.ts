import { EntityId, ISODateString } from './common';
import { CompanionOrbMood } from '../components/live-companion/live-companion-orb';
import { RelationshipStage } from './phase7-signature';
import { SharedTimelineEntry } from './phase8-retention';

export const LIVING_STAGE_LABELS: Record<RelationshipStage, string> = {
  new_friend: 'New Friend',
  trusted_friend: 'Good Friend',
  close_companion: 'Close Friend',
  best_friend: 'Best Friend',
  life_companion: 'Life Companion',
};

export type MemoryRecallMoment = {
  line: string;
  memoryId?: EntityId;
  memoryTitle?: string;
  confidence: 'high' | 'medium';
  source: 'memory' | 'goal' | 'follow_up' | 'mood';
};

export type LivingFollowUp = {
  id: EntityId;
  prompt: string;
  topic: string;
  dueLabel: string;
};

export type PersonalityGrowthSnapshot = {
  traits: string[];
  evolutionLine: string;
  insideJokeLine: string | null;
  humourLevel: 'low' | 'medium' | 'high';
};

export type DailyLifeRhythm = {
  period: 'morning' | 'afternoon' | 'evening' | 'night';
  greeting: string;
  focusLine: string;
  routineHint: string | null;
  weatherPlaceholder: string;
  quoteLine: string | null;
  reflectionLine: string | null;
  progressLine: string | null;
  sleepReminder: string | null;
};

export type LivingWowMoment = {
  id: string;
  line: string;
  kind: 'remembered' | 'made_for_you' | 'found_interesting';
  actionPrompt?: string;
};

export type OurStoryEntry = SharedTimelineEntry & {
  milestone?: boolean;
};

export type RelationshipProgress = {
  stage: RelationshipStage;
  stageLabel: string;
  nextStageLabel: string | null;
  progressPercent: number;
  conversationCount: number;
  sharedMemories: number;
  unlocks: string[];
};

export type Phase11DashboardData = {
  emotionalMessage: string;
  recall: MemoryRecallMoment | null;
  followUp: LivingFollowUp | null;
  rhythm: DailyLifeRhythm;
  mood: CompanionOrbMood;
  moodReason: string;
  personality: PersonalityGrowthSnapshot;
  relationship: RelationshipProgress;
  storyPreview: OurStoryEntry[];
  ourStory: OurStoryEntry[];
  wowMoment: LivingWowMoment | null;
  todayFocus: string;
  talkStarter: string | null;
};
