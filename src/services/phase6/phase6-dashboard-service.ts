import { Goal, Memory, UserProfile } from '../../types';
import { MemoryPanelItem, Phase6DashboardData } from '../../types/phase6-premium';
import { CompanionIntelligenceBundle } from '../../types/companion-intelligence';
import { TodayRoutineSummary } from '../../types/routine';
import { isMemoryPinned } from '../../utils/memory-pinned';
import { getActivitiesService } from './activities-service';
import { getProactiveFollowUpService } from './proactive-follow-up-service';
import { getRelationshipProfileService } from './relationship-profile-service';
import { getSportsDataProvider, getSportsProviderStatus } from './sports-data-provider';
import { IStorageService } from '../contracts';

export type BuildPhase6Input = {
  userId: string;
  profile: UserProfile;
  bundle: CompanionIntelligenceBundle;
  memories: Memory[];
  goals: Goal[];
  routine: TodayRoutineSummary;
  ritualStreaks?: { combined: number };
  coachInsight?: string;
  relationshipMoment?: string | null;
  storage: IStorageService;
};

export async function buildPhase6Dashboard(input: BuildPhase6Input): Promise<Phase6DashboardData> {
  const hour = new Date().getHours();
  const isNightMode = hour >= 21 || hour < 6;
  const relService = getRelationshipProfileService(input.storage);
  const followUpService = getProactiveFollowUpService(input.storage);
  const activities = getActivitiesService(input.storage);

  const proactiveEnabled = await relService.isProactiveEnabled(input.userId);
  const quietHours = hour >= 22 || hour < 7;

  const [proactiveFollowUp, relationshipProfile] = await Promise.all([
    followUpService.getTodaysFollowUp(input.userId, { proactiveEnabled, quietHours }),
    Promise.resolve(
      relService.build({
        userId: input.userId,
        profile: input.profile,
        bundle: input.bundle,
        memories: input.memories,
        goals: input.goals,
        conversations: [],
        routinesCompleted: input.routine.completedCount,
        ritualsCompleted: input.ritualStreaks?.combined,
      }),
    ),
  ]);

  const presenceEnergy: Phase6DashboardData['presenceEnergy'] =
    input.routine.completionPercent >= 70 ? 'high' : input.routine.completionPercent >= 30 ? 'medium' : 'low';

  const greeting = isNightMode
    ? `Good evening — a calm moment with you.`
    : hour < 12
      ? `Good morning — ready when you are.`
      : `Good afternoon — I am here.`;

  return {
    proactiveFollowUp,
    relationshipProfile,
    todayFocus: input.coachInsight ?? input.goals[0]?.title ?? 'One meaningful step today.',
    coachInsight: input.coachInsight ?? 'Small consistent actions beat big bursts.',
    relationshipMoment: input.relationshipMoment ?? null,
    sportsStatus: getSportsProviderStatus(getSportsDataProvider()),
    featuredActivities: activities.listDefinitions().slice(0, 6),
    presenceGreeting: greeting,
    presenceEnergy,
    isNightMode,
  };
}

export function buildMemoryPanel(input: {
  memories: Memory[];
  goals: Goal[];
  routine: TodayRoutineSummary;
  journalInsight?: string | null;
  excludedIds?: Set<string>;
}): MemoryPanelItem[] {
  const items: MemoryPanelItem[] = [];
  const excluded = input.excludedIds ?? new Set<string>();

  for (const memory of input.memories.slice(0, 8)) {
    items.push({
      id: `mem-${memory.id}`,
      kind: 'memory',
      label: memory.title,
      detail: memory.content.slice(0, 120),
      confidence: memory.confidence && memory.confidence >= 0.8 ? 'high' : memory.confidence && memory.confidence >= 0.5 ? 'medium' : 'low',
      pinned: isMemoryPinned(memory),
      included: !excluded.has(memory.id),
      sourceId: memory.id,
    });
  }

  for (const goal of input.goals.filter((g) => g.status === 'active').slice(0, 4)) {
    items.push({
      id: `goal-${goal.id}`,
      kind: 'goal',
      label: goal.title,
      detail: `${goal.progress}% complete`,
      pinned: false,
      included: true,
      sourceId: goal.id,
    });
  }

  if (input.routine.nextBlock) {
    items.push({
      id: `routine-next`,
      kind: 'routine',
      label: input.routine.nextBlock.title,
      detail: 'Next on your timeline',
      pinned: false,
      included: true,
    });
  }

  for (const memory of input.memories.filter((m) => m.category === 'people').slice(0, 3)) {
    items.push({
      id: `person-${memory.id}`,
      kind: 'person',
      label: memory.title,
      detail: memory.content.slice(0, 80),
      pinned: false,
      included: true,
      sourceId: memory.id,
    });
  }

  if (input.journalInsight) {
    items.push({
      id: 'journal-today',
      kind: 'journal',
      label: 'Today\'s journal',
      detail: input.journalInsight.slice(0, 100),
      pinned: false,
      included: true,
    });
  }

  return items.slice(0, 16);
}
