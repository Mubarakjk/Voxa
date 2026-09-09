import { Memory } from '../../types';
import { ExtractedMemoryCandidate } from '../contracts';
import {
  MemorySemanticSlot,
  TAG_SUPERSEDED,
  inferSemanticSlot,
  isSupersededMemory,
} from './memory-taxonomy';
import { MemoryWriteDecision } from './memory-write-policy';
import {
  eventsLikelySame,
  findDuplicateMemory,
  looksLikeReschedule,
  mergeTags,
} from './memory-deduplication';

export type SupersessionResult = {
  target: Memory | null;
  supersedeIds: string[];
};

const SINGLETON_SLOTS: MemorySemanticSlot[] = [
  'training_routine',
  'communication_style',
  'food_preference',
  'study_routine',
];

export function findSupersessionTargets(
  existing: Memory[],
  decision: MemoryWriteDecision,
): SupersessionResult {
  const active = existing.filter((memory) => !isSupersededMemory(memory));
  const slot = decision.semanticSlot;

  if (SINGLETON_SLOTS.includes(slot)) {
    const sameSlot = active.filter((memory) => {
      const memorySlot = inferSemanticSlot(memory.category, `${memory.title} ${memory.content}`);
      return memorySlot === slot;
    });
    if (sameSlot.length > 0) {
      const target = sameSlot.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )[0];
      const supersedeIds = sameSlot.filter((memory) => memory.id !== target.id).map((memory) => memory.id);
      return { target, supersedeIds };
    }
  }

  const identityMatches = active.filter((memory) =>
    eventsLikelySame(decision.title, decision.content, memory.title, memory.content),
  );
  const reschedule = looksLikeReschedule(decision.content);

  if (identityMatches.length > 0 && (reschedule || slot === 'upcoming_event')) {
    const close = identityMatches.filter((memory) => temporallyClose(memory.occurredAt, decision.occurredAt));
    const pool = reschedule ? identityMatches : close;
    if (pool.length === 0) {
      return { target: null, supersedeIds: [] };
    }
    const target = pool.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )[0];
    const supersedeIds = reschedule
      ? identityMatches.filter((memory) => memory.id !== target.id).map((memory) => memory.id)
      : [];
    return { target, supersedeIds };
  }

  const candidate: ExtractedMemoryCandidate = {
    category: decision.category,
    title: decision.title,
    content: decision.content,
    importance: decision.importance as Memory['importance'],
    mood: 'neutral',
    tags: decision.tags,
  };
  const duplicate = findDuplicateMemory(active, candidate);
  if (
    duplicate &&
    !looksLikeReschedule(decision.content) &&
    !temporallyClose(duplicate.occurredAt, decision.occurredAt)
  ) {
    return { target: null, supersedeIds: [] };
  }
  return { target: duplicate, supersedeIds: [] };
}

export function buildSupersededPatch(existing: Memory): Partial<Memory> {
  return {
    tags: mergeTags(existing.tags, [TAG_SUPERSEDED]),
    importance: Math.max(1, existing.importance - 1) as Memory['importance'],
    confidence: Math.max(0.35, (existing.confidence ?? 0.7) - 0.15),
  };
}

export function shouldReplaceInsteadOfMerge(
  decision: MemoryWriteDecision,
  existing: Memory,
): boolean {
  if (isSupersededMemory(existing)) return false;
  if (
    looksLikeReschedule(decision.content) &&
    eventsLikelySame(decision.title, decision.content, existing.title, existing.content)
  ) {
    return true;
  }
  if (decision.confidenceKind !== 'explicit') return false;
  const existingSlot = inferSemanticSlot(existing.category, `${existing.title} ${existing.content}`);
  if (SINGLETON_SLOTS.includes(decision.semanticSlot) && decision.semanticSlot === existingSlot) {
    return true;
  }
  return false;
}

function temporallyClose(existingIso?: string, incomingIso?: string): boolean {
  if (!existingIso || !incomingIso) return true;
  return Math.abs(new Date(existingIso).getTime() - new Date(incomingIso).getTime()) <= 36 * 60 * 60 * 1000;
}
