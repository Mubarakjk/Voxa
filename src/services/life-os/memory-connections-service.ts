import { Goal, Memory } from '../../types';
import { createUuid, nowIso } from '../../types/common';
import {
  BucketListItemV5,
  DreamEntry,
  MemoryConnection,
  VisionBoardItemV5,
} from '../../types/phase5-life-os';

export function buildMemoryConnections(input: {
  userId: string;
  memories: Memory[];
  goals: Goal[];
  dreams: DreamEntry[];
  bucket: BucketListItemV5[];
  vision: VisionBoardItemV5[];
}): MemoryConnection[] {
  const connections: MemoryConnection[] = [];
  const emotionMemories = input.memories.filter(
    (m) => m.mood === 'stressed' || m.category === 'emotional' || m.tags?.includes('emotion'),
  );

  for (const memory of emotionMemories.slice(0, 10)) {
    const relatedGoal = input.goals.find(
      (g) => memory.content.toLowerCase().includes(g.title.toLowerCase().slice(0, 12)),
    );
    if (relatedGoal) {
      connections.push({
        id: createUuid(),
        userId: input.userId,
        fromMemoryId: memory.id,
        toKind: 'goal',
        toId: relatedGoal.id,
        toLabel: relatedGoal.title,
        confidence: 'high',
        createdAt: nowIso(),
      });
    }

    for (const person of input.memories.filter((m) => m.category === 'people').slice(0, 5)) {
      if (memory.content.toLowerCase().includes(person.title.toLowerCase())) {
        connections.push({
          id: createUuid(),
          userId: input.userId,
          fromMemoryId: memory.id,
          toKind: 'person',
          toId: person.id,
          toLabel: person.title,
          confidence: 'medium',
          createdAt: nowIso(),
        });
      }
    }
  }

  for (const dream of input.dreams.filter((d) => d.themes.length > 0).slice(0, 5)) {
    const theme = dream.themes[0];
    const related = input.memories.find((m) => m.content.toLowerCase().includes(theme));
    if (related) {
      connections.push({
        id: createUuid(),
        userId: input.userId,
        fromMemoryId: related.id,
        toKind: 'dream',
        toId: dream.id,
        toLabel: `Dream theme: ${theme}`,
        confidence: 'medium',
        createdAt: nowIso(),
      });
    }
  }

  for (const item of input.bucket.filter((b) => b.status === 'completed').slice(0, 5)) {
    if (item.completionMemoryId) {
      connections.push({
        id: createUuid(),
        userId: input.userId,
        fromMemoryId: item.completionMemoryId,
        toKind: 'bucket',
        toId: item.id,
        toLabel: item.title,
        confidence: 'high',
        createdAt: nowIso(),
      });
    }
  }

  for (const item of input.vision.filter((v) => v.linkedGoalId).slice(0, 5)) {
    const goalMem = input.memories.find((m) => m.content.toLowerCase().includes(item.title.toLowerCase().slice(0, 10)));
    if (goalMem && item.linkedGoalId) {
      connections.push({
        id: createUuid(),
        userId: input.userId,
        fromMemoryId: goalMem.id,
        toKind: 'vision',
        toId: item.id,
        toLabel: item.title,
        confidence: 'medium',
        createdAt: nowIso(),
      });
    }
  }

  return connections.slice(0, 40);
}

const USED_CALLBACKS_KEY = '@voxa/used_memory_callbacks';

export function findRelevantCallback(
  emotion: string,
  connections: MemoryConnection[],
  memories: Memory[],
): { text: string; confidence: string } | null {
  const lower = emotion.toLowerCase();
  const isNervous = /nervous|anxious|worried|stress/.test(lower);
  if (!isNervous) return null;

  const highConf = connections.filter((c) => c.confidence === 'high');
  if (highConf.length === 0) return null;

  const conn = highConf[0];
  const memory = memories.find((m) => m.id === conn.fromMemoryId);
  if (!memory) return null;

  const text = `The last time you described this kind of nerves was around "${conn.toLabel}", and you ended up handling it better than you expected.`;
  return { text, confidence: conn.confidence };
}
