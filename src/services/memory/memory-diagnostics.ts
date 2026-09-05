import { Memory } from '../../types';
import { TalkIntent } from '../ai/companion-intent';
import { logFeature } from '../../utils/feature-logger';
import { resolveCompanionMemoryType } from './memory-taxonomy';
import { MemoryWriteDecision } from './memory-write-policy';

export function logMemoryRetrieveDiagnostic(input: {
  intent: TalkIntent;
  candidates: number;
  active: number;
  selected: Memory[];
}): void {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return;

  const categories = [...new Set(input.selected.map((memory) => resolveCompanionMemoryType(memory.category, memory.tags)))];
  logFeature(
    'memory.retrieve',
    'start',
    [
      `intent=${input.intent}`,
      `candidates=${input.candidates}`,
      `active=${input.active}`,
      `selected=${input.selected.length}`,
      `categories=${categories.join('|') || 'none'}`,
    ].join(' '),
  );
}

export function logMemoryWriteDiagnostic(input: {
  action: 'create' | 'update' | 'supersede' | 'skip';
  decision: MemoryWriteDecision;
}): void {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return;

  logFeature(
    'memory.write',
    input.action === 'skip' ? 'failure' : 'success',
    [
      `action=${input.action}`,
      `category=${input.decision.category}`,
      `importance=${input.decision.importance}`,
      `confidence=${input.decision.confidenceKind}`,
      `slot=${input.decision.semanticSlot}`,
      `reason=${input.decision.reason}`,
    ].join(' '),
  );
}
