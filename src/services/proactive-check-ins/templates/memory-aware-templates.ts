import { ProactiveTemplateCandidate } from '../../../types/proactive-check-in';
import {
  IProactiveCheckInTemplateProvider,
  ProactiveTemplateContext,
  pickTopMemory,
} from './template-types';

export class MemoryAwareProactiveTemplateProvider implements IProactiveCheckInTemplateProvider {
  readonly providerKind = 'memory' as const;

  buildCandidates(context: ProactiveTemplateContext): ProactiveTemplateCandidate[] {
    const memory = context.topMemory ?? pickTopMemory(context.memories);
    if (!memory) return [];

    const label = memory.title.trim() || memory.content.slice(0, 48).trim();
    const candidates: ProactiveTemplateCandidate[] = [
      {
        id: `memory_recall_${memory.id.slice(0, 8)}`,
        message: `I was thinking about what you shared on "${label}". Want to pick that thread back up?`,
        kind: 'memory',
        priority: 80,
      },
      {
        id: `memory_followup_${memory.id.slice(0, 8)}`,
        message: `You mentioned "${label}" before — has anything shifted since then?`,
        kind: 'memory',
        priority: 78,
      },
    ];

    if (memory.category === 'goals' || memory.category === 'future_plans') {
      candidates.push({
        id: `memory_plan_${memory.id.slice(0, 8)}`,
        message: `I remembered you wanted to improve things around "${label}". Still on your mind?`,
        kind: 'memory',
        priority: 82,
      });
    }

    if (memory.category === 'routines' || memory.category === 'habits') {
      candidates.push({
        id: `memory_routine_${memory.id.slice(0, 8)}`,
        message: `Your routine around "${label}" came to mind — how's that going today?`,
        kind: 'memory',
        priority: 81,
      });
    }

    if (memory.category === 'people' || memory.category === 'birthdays') {
      candidates.push({
        id: `memory_people_${memory.id.slice(0, 8)}`,
        message: `I remembered ${label}. Want to talk through anything related to that?`,
        kind: 'memory',
        priority: 79,
      });
    }

    return candidates;
  }
}

export const memoryAwareProactiveTemplateProvider = new MemoryAwareProactiveTemplateProvider();
