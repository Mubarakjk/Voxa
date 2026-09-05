import { Memory } from '../../types';
import { ExtractedMemoryCandidate } from '../contracts';
import {
  MemorySemanticSlot,
  TAG_SUPERSEDED,
  inferSemanticSlot,
  isSupersededMemory,
} from './memory-taxonomy';
import { MemoryWriteDecision } from './memory-write-policy';
import { findDuplicateMemory, mergeTags } from './memory-deduplication';

export type SupersessionResult = {
  target: Memory | null;
  supersedeIds: string[];
};

export function findSupersessionTargets(
  existing: Memory[],
  decision: MemoryWriteDecision,
): SupersessionResult {
  const active = existing.filter((memory) => !isSupersededMemory(memory));
  const slot = decision.semanticSlot;

  const sameSlot = active.filter((memory) => {
    const memorySlot = inferSemanticSlot(memory.category, `${memory.title} ${memory.content}`);
    if (slot === 'general') return false;
    return memorySlot === slot;
  });

  if (sameSlot.length > 0) {
    const target = sameSlot.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )[0];
    const supersedeIds = sameSlot.filter((memory) => memory.id !== target.id).map((memory) => memory.id);
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
  if (decision.confidenceKind !== 'explicit') return false;
  const existingSlot = inferSemanticSlot(existing.category, `${existing.title} ${existing.content}`);
  return (
    decision.semanticSlot !== 'general' &&
    decision.semanticSlot === existingSlot &&
    !isSupersededMemory(existing)
  );
}
