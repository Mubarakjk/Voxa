import { CompanionIntelligenceBundle } from '../../types/companion-intelligence';
import { Goal, Memory } from '../../types';
import { SharedTimelineEntry } from '../../types/phase8-retention';

export function buildSharedMemoriesTimeline(input: {
  bundle: CompanionIntelligenceBundle;
  memories: Memory[];
  goals: Goal[];
  limit?: number;
}): SharedTimelineEntry[] {
  const limit = input.limit ?? 12;
  const entries: SharedTimelineEntry[] = [];

  for (const event of input.bundle.lifeTimeline) {
    entries.push({
      id: event.id,
      title: event.title,
      narrative: event.description ?? `We shared a moment: ${event.title}.`,
      occurredAt: event.occurredAt,
      kind: event.kind === 'goal' || event.kind === 'achievement' ? 'goal' : 'milestone',
    });
  }

  for (const goal of input.goals.filter((g) => g.status === 'completed')) {
    entries.push({
      id: `goal-done-${goal.id}`,
      title: goal.title,
      narrative: `You completed "${goal.title}".`,
      occurredAt: goal.updatedAt ?? goal.createdAt,
      kind: 'goal',
    });
  }

  for (const memory of input.memories.slice(0, 20)) {
    if (memory.importance >= 6 || memory.tags?.includes('remember-this')) {
      entries.push({
        id: `mem-${memory.id}`,
        title: memory.title,
        narrative: memory.content.slice(0, 160),
        occurredAt: memory.occurredAt ?? memory.createdAt,
        kind: 'memory',
        memoryId: memory.id,
      });
    }
  }

  const rel = input.bundle.relationship;
  if (rel.conversationCount >= 10) {
    entries.push({
      id: 'bond-growing',
      title: 'Building something real',
      narrative: `${rel.conversationCount} conversations and ${rel.sharedMemoryCount} shared memories.`,
      occurredAt: rel.updatedAt,
      kind: 'conversation',
    });
  }

  return entries
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, limit);
}
