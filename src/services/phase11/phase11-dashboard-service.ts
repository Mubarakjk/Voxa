import { CompanionIntelligenceBundle } from '../../types/companion-intelligence';
import { Goal, Memory, UserProfile } from '../../types';
import { Phase11DashboardData } from '../../types/phase11-living-companion';
import { RelationshipStage } from '../../types/phase7-signature';
import { TodayRoutineSummary } from '../../types/routine';
import { IStorageService } from '../contracts';
import { resolveRelationshipStage, stageGreeting, stagePromptBlock } from '../phase7/relationship-evolution-service';
import { buildDynamicPresence } from '../phase7/dynamic-presence-service';
import { buildMemoryRecall } from './memory-recall-service';
import { getFollowUpEngineService } from './follow-up-engine-service';
import { buildOurStory } from './our-story-service';
import { resolveLivingMood } from './living-mood-service';
import { buildDailyLifeRhythm } from './daily-life-rhythm-service';
import { buildPersonalityGrowth, relationshipProgress } from './personality-growth-service';
import { detectLivingWow, getLivingWowService } from './living-wow-service';
import { buildLivingConversationBlock } from './phase11-prompt-service';

export type BuildPhase11Input = {
  userId: string;
  profile: UserProfile;
  bundle: CompanionIntelligenceBundle;
  memories: Memory[];
  goals: Goal[];
  routine: TodayRoutineSummary;
  streakDays: number;
  daysAway: number;
  todayFocus: string;
  moodLabel?: string | null;
  celebrating?: boolean;
  storage?: IStorageService;
};

export async function buildPhase11Dashboard(input: BuildPhase11Input): Promise<Phase11DashboardData> {
  const rel = input.bundle.relationship;
  const daysTogether = Math.max(1, Math.floor((Date.now() - new Date(rel.relationshipStartedAt).getTime()) / 86400000));
  const stage = resolveRelationshipStage({
    daysTogether,
    conversationCount: rel.conversationCount,
    sharedMemories: rel.sharedMemoryCount,
    goalsCompleted: rel.goalsAchievedTogether,
  });

  const presence = buildDynamicPresence({
    memories: input.memories,
    goals: input.goals.map((g) => ({ title: g.title, status: g.status })),
    daysAway: input.daysAway,
    streakDays: input.streakDays,
  });

  const recall = buildMemoryRecall({
    memories: input.memories,
    goals: input.goals,
    daysAway: input.daysAway,
    dynamicLine: presence?.line ?? null,
  });

  let followUp = null;
  let wowMoment = null;
  if (input.storage) {
    followUp = await getFollowUpEngineService(input.storage).getDueFollowUp(input.userId);
    const wowSvc = getLivingWowService(input.storage);
    const shown = await wowSvc.wasShownToday(input.userId);
    wowMoment = detectLivingWow({
      memories: input.memories,
      goals: input.goals,
      shownToday: shown,
    });
  }

  const moodRes = resolveLivingMood({
    hour: new Date().getHours(),
    streakDays: input.streakDays,
    daysAway: input.daysAway,
    moodLabel: input.moodLabel,
    celebrating: input.celebrating,
    stage,
  });

  const rhythm = buildDailyLifeRhythm({
    firstName: input.profile.displayName.split(' ')[0] || input.profile.displayName,
    todayFocus: input.todayFocus,
    routineNext: input.routine.nextBlock?.title ?? null,
    routineDone: input.routine.completedCount,
    routineTotal: input.routine.totalCount,
  });

  const personality = buildPersonalityGrowth({ bundle: input.bundle, stage });
  const relationship = relationshipProgress({
    stage,
    conversationCount: rel.conversationCount,
    sharedMemories: rel.sharedMemoryCount,
    daysTogether,
  });

  const ourStory = buildOurStory({
    bundle: input.bundle,
    memories: input.memories,
    goals: input.goals,
  });
  const storyPreview = ourStory.slice(0, 3);

  const emotionalMessage =
    recall?.line ??
    followUp?.prompt ??
    personality.insideJokeLine ??
    rhythm.reflectionLine ??
    stageGreeting(stage, input.profile.displayName.split(' ')[0]);

  const talkStarter = followUp?.prompt ?? recall?.line ?? wowMoment?.actionPrompt ?? null;

  return {
    emotionalMessage,
    recall,
    followUp,
    rhythm,
    mood: moodRes.mood,
    moodReason: moodRes.reason,
    personality,
    relationship,
    storyPreview,
    ourStory,
    wowMoment,
    todayFocus: input.todayFocus,
    talkStarter,
  };
}

export function buildPhase11PromptForChat(input: {
  dashboard: Phase11DashboardData;
  stage: RelationshipStage;
  styleHints?: string[];
}): string {
  return buildLivingConversationBlock({
    stageBlock: stagePromptBlock(input.stage),
    recallLine: input.dashboard.recall?.line,
    followUpPrompt: input.dashboard.followUp?.prompt,
    insideJoke: input.dashboard.personality.insideJokeLine,
    personalityLine: input.dashboard.personality.evolutionLine,
    styleHints: input.styleHints,
  });
}
