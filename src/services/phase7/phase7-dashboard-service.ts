import { Goal, Memory } from '../../types';
import { CompanionIntelligenceBundle } from '../../types/companion-intelligence';
import { Phase7DashboardData } from '../../types/phase7-signature';
import { RELATIONSHIP_STAGE_LABELS } from '../../types/phase7-signature';
import { TodayRoutineSummary } from '../../types/routine';
import { buildDynamicPresence } from './dynamic-presence-service';
import { resolveLivingCompanionV2 } from './living-companion-2-service';
import { buildPersonalityV4PromptBlock } from './personality-v4-service';
import { resolveRelationshipStage, stagePromptBlock } from './relationship-evolution-service';

export type BuildPhase7Input = {
  bundle: CompanionIntelligenceBundle;
  memories: Memory[];
  goals: Goal[];
  routine: TodayRoutineSummary;
  streakDays: number;
  daysAway: number;
  relationshipScore?: number;
  recentConversationPreview?: string | null;
  celebrating?: boolean;
};

export function buildPhase7Dashboard(input: BuildPhase7Input): Phase7DashboardData {
  const hour = new Date().getHours();
  const rel = input.bundle.relationship;
  const goalsCompleted = input.goals.filter((g) => g.status === 'completed').length;

  const stage = resolveRelationshipStage({
    daysTogether: Math.max(1, Math.floor((Date.now() - new Date(rel.relationshipStartedAt).getTime()) / 86400000)),
    conversationCount: rel.conversationCount,
    sharedMemories: rel.sharedMemoryCount,
    goalsCompleted,
  });

  const livingCompanion = resolveLivingCompanionV2({
    hour,
    streakDays: input.streakDays,
    routine: input.routine,
    goals: input.goals,
    memories: input.memories,
    relationshipScore: input.relationshipScore,
    daysAway: input.daysAway,
    celebrating: input.celebrating,
  });

  const dynamicPresence = buildDynamicPresence({
    memories: input.memories,
    goals: input.goals,
    daysAway: input.daysAway,
    streakDays: input.streakDays,
    recentConversationPreview: input.recentConversationPreview,
  });

  return {
    livingCompanion,
    relationshipStage: stage,
    stageLabel: RELATIONSHIP_STAGE_LABELS[stage],
    dynamicPresence,
    personalityPromptBlock: buildPersonalityV4PromptBlock(stagePromptBlock(stage)),
    delightReady: input.streakDays >= 100 || rel.conversationCount >= 1000,
  };
}
