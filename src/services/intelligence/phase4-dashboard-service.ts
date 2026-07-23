import { CompanionIntelligenceBundle } from '../../types/companion-intelligence';
import { Conversation, Goal, Memory, UserProfile } from '../../types';
import { Phase4DashboardData } from '../../types/phase4-intelligence';
import { TodayRoutineSummary } from '../../types/routine';
import { CompanionJournalEntry } from '../journal/companion-journal-service';
import { LifeOSData } from '../life-os/life-os-service';
import { contextCardsService } from './context-cards-service';
import { delightMomentsService } from './delight-moments-service';
import { livingCompanionService } from './living-companion-service';
import { personalityV3Service } from './personality-v3-service';
import { relationshipGrowthService } from './relationship-growth-service';
import { modeInferenceEngine } from './mode-inference-engine';

export type BuildPhase4DashboardInput = {
  profile: UserProfile;
  bundle: CompanionIntelligenceBundle;
  memories: Memory[];
  goals: Goal[];
  routine: TodayRoutineSummary;
  lifeOS: LifeOSData;
  journal?: CompanionJournalEntry | null;
  recentConversations?: Conversation[];
  moodLabel?: string | null;
  daysAway?: number;
  streakDays?: number;
  bucketCompleted?: boolean;
  dreamAchieved?: boolean;
};

export async function buildPhase4Dashboard(input: BuildPhase4DashboardInput & { delightShownIds?: string[] }): Promise<Phase4DashboardData> {
  const livingCompanion = livingCompanionService.build({
    profile: input.profile,
    bundle: input.bundle,
    memories: input.memories,
    goals: input.goals,
    routine: input.routine,
    lifeOS: input.lifeOS,
    journal: input.journal,
    daysAway: input.daysAway,
    streakDays: input.streakDays ?? input.routine.streakDays,
  });

  const contextCards = contextCardsService.build({
    goals: input.goals,
    memories: input.memories,
    routine: input.routine,
    journal: input.journal,
    lifeOS: input.lifeOS,
    recentConversations: input.recentConversations,
    moodLabel: input.moodLabel,
  });

  const relationshipGrowth = relationshipGrowthService.build(input.bundle);
  const delightMoment = delightMomentsService.detect({
    bundle: input.bundle,
    goals: input.goals,
    memories: input.memories,
    shownIds: input.delightShownIds,
    streakDays: input.streakDays ?? input.routine.streakDays,
    bucketCompleted: input.bucketCompleted,
    dreamAchieved: input.dreamAchieved,
  });

  const signals = modeInferenceEngine.inferSignals('', input.bundle);
  const personalityMode = personalityV3Service.inferModeFromMessage('', signals, input.bundle);

  return {
    livingCompanion,
    contextCards,
    relationshipGrowth,
    lifeOS: input.lifeOS,
    delightMoment,
    personalityMode,
  };
}
