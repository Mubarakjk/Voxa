import { Goal } from '../../types';
import { TodayRoutineSummary } from '../../types/routine';
import { ContextChip } from '../../components/phase7/chat-context-chips';

export function buildChatContextChips(input: {
  goals: Goal[];
  memories: Array<{ id: string; title: string }>;
  routine?: TodayRoutineSummary | null;
  thinkingAbout?: string | null;
}): ContextChip[] {
  const chips: ContextChip[] = [];

  if (input.thinkingAbout) {
    chips.push({ id: 'thinking', label: input.thinkingAbout.slice(0, 32), kind: 'context' });
  }

  for (const goal of input.goals.slice(0, 2)) {
    chips.push({ id: `goal-${goal.id}`, label: goal.title.slice(0, 28), kind: 'goal' });
  }

  for (const memory of input.memories.slice(0, 2)) {
    chips.push({ id: `mem-${memory.id}`, label: memory.title.slice(0, 28), kind: 'memory' });
  }

  if (input.routine?.nextBlock) {
    chips.push({ id: 'routine', label: `Next: ${input.routine.nextBlock.title}`.slice(0, 32), kind: 'routine' });
  }

  return chips.slice(0, 5);
}
