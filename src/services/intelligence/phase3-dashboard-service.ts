import { CompanionIntelligenceBundle } from '../../types/companion-intelligence';
import { Goal, Memory } from '../../types';
import {
  ADAPTIVE_MODE_LABELS,
  Phase3DashboardData,
  WeeklyGrowthSnapshot,
} from '../../types/phase3-intelligence';
import { knowledgeGraphEngine } from './knowledge-graph-engine';
import { emotionalAwarenessEngine } from './emotional-awareness-engine';
import { MoodHistoryEntry } from '../check-in/daily-check-in-service';
import { TodayRoutineSummary } from '../../types/routine';

export type BuildPhase3DashboardInput = {
  bundle: CompanionIntelligenceBundle;
  memories: Memory[];
  goals: Goal[];
  moodHistory: MoodHistoryEntry[];
  routine: TodayRoutineSummary;
  weeklyGrowth: WeeklyGrowthSnapshot | null;
  linkedLabels?: string[];
};

export function buildPhase3Dashboard(input: BuildPhase3DashboardInput): Phase3DashboardData {
  const modeLabel = input.bundle.adaptive.lastModeLabel;
  const emotional = emotionalAwarenessEngine.analyze({
    profile: input.bundle.profile,
    moodHistory: input.moodHistory,
    baseline: input.bundle.adaptive.emotionalBaseline,
    userMessage: '',
  });

  const graph = knowledgeGraphEngine.build({
    bundle: input.bundle,
    memories: input.memories,
    goals: input.goals,
    routine: input.routine,
    linkedLabels: input.linkedLabels,
  });

  const sports = input.bundle.adaptive.sportsPreferences;
  const sportsHighlight =
    sports.teams[0] != null
      ? `Following ${sports.teams[0]}${sports.sports[0] ? ` · ${sports.sports[0]}` : ''}`
      : sports.sports[0] ?? null;

  return {
    adaptiveModeLabel: modeLabel,
    adaptiveModeDisplay: ADAPTIVE_MODE_LABELS[modeLabel],
    weeklyGrowth: input.weeklyGrowth,
    emotionalInsight: emotional.insight,
    sportsHighlight,
    knowledgeHighlights: graph.topInterests.slice(0, 4),
  };
}
