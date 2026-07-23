import { Goal, Memory } from '../../../types';
import { RoutineBlock } from '../../../types/routine';
import { ProactiveTemplateCandidate } from '../../../types/proactive-check-in';

export type ProactiveTemplateContext = {
  displayName: string;
  now: Date;
  hoursSinceLastMessage: number;
  goals: Goal[];
  memories: Memory[];
  routineBlocks: RoutineBlock[];
  missedRoutine?: RoutineBlock;
  topGoal?: Goal;
  topMemory?: Memory;
};

export interface IProactiveCheckInTemplateProvider {
  readonly providerKind: 'random' | 'contextual' | 'memory';
  buildCandidates(context: ProactiveTemplateContext): ProactiveTemplateCandidate[];
}

export function timeOfDayLabel(now: Date): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

export function pickTopMemory(memories: Memory[]): Memory | undefined {
  return [...memories]
    .sort((a, b) => b.importance - a.importance || b.updatedAt.localeCompare(a.updatedAt))[0];
}

export function pickTopGoal(goals: Goal[]): Goal | undefined {
  return goals.find((g) => g.status === 'active') ?? goals[0];
}
