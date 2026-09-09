import { Memory } from '../../types';
import { MemoryPolicy } from '../ai/turn-intelligence-plan';
import { TalkIntent } from '../ai/companion-intent';
import { isSensitiveMemory } from './memory-sensitivity';
import { isActiveOpenLoop, isCancelledMemory, isResolvedMemory } from './open-loop-service';
import { readTemporalMeta } from './temporal-memory';
import { ParsedTemporal, sameLocalDay } from './temporal-parse';
import { TAG_EXPLICIT, memoryConfidenceKind } from './memory-taxonomy';

export type MemoryCallbackAction = 'mention' | 'use_silently' | 'ignore';

export type MemoryCallbackInput = {
  memory: Memory;
  userMessage: string;
  intent?: TalkIntent;
  memoryPolicy?: MemoryPolicy;
  now?: Date;
  timeZone?: string;
  queryTemporal?: ParsedTemporal | null;
  keywordOverlap: number;
  temporalAlign: boolean;
  ambiguousTemporalMatch: boolean;
  uniqueOpenLoop?: boolean;
};

export function decideMemoryCallback(input: MemoryCallbackInput): MemoryCallbackAction {
  if (input.memoryPolicy === 'skip') return 'ignore';
  if (input.intent === 'factual_question' || input.intent === 'app_action_request') return 'ignore';

  const memory = input.memory;
  const kind = memoryConfidenceKind(memory);
  const meta = readTemporalMeta(memory, input.timeZone);

  if (kind === 'inferred' || kind === 'low') return 'ignore';
  if ((memory.confidence ?? 0.72) < 0.55) return 'ignore';
  if (meta.temporalConfidence === 'low' || meta.precision === 'vague') return 'ignore';

  if (isSensitiveMemory(memory.tags, memory.title, memory.content)) {
    const topicOverlap = input.keywordOverlap >= 0.35;
    if (!topicOverlap) return 'ignore';
    return 'use_silently';
  }

  if (input.ambiguousTemporalMatch) return 'ignore';

  if (isCancelledMemory(memory) || isResolvedMemory(memory)) {
    if (input.keywordOverlap >= 0.35) return 'use_silently';
    return 'ignore';
  }

  if (input.memoryPolicy === 'high_confidence_only') {
    const high = (memory.confidence ?? 0) >= 0.8 || memory.tags.includes(TAG_EXPLICIT);
    if (!high) return 'ignore';
    if (meta.temporalConfidence === 'medium' && !input.keywordOverlap && !input.uniqueOpenLoop) return 'ignore';
  }

  const uniqueJoin =
    Boolean(input.uniqueOpenLoop) &&
    isActiveOpenLoop(memory, input.now) &&
    (input.temporalAlign || input.keywordOverlap >= 0.2) &&
    (memory.confidence ?? 0.72) >= 0.75;

  const stronglyAligned =
    input.temporalAlign &&
    (memory.confidence ?? 0.72) >= 0.75 &&
    (meta.temporalConfidence === 'high' || meta.temporalConfidence === null) &&
    (meta.precision === 'day' || meta.precision === 'time' || meta.precision === null);

  if (uniqueJoin && (input.intent === 'emotional_support' || input.intent === 'celebration' || input.intent === 'memory_recall' || stronglyAligned)) {
    return 'mention';
  }
  if (uniqueJoin) {
    return input.intent === 'casual_conversation' ? 'use_silently' : 'mention';
  }

  if (stronglyAligned && input.keywordOverlap >= 0.15) return 'mention';
  if (stronglyAligned && input.queryTemporal) return 'mention';

  if (input.keywordOverlap >= 0.45 && (memory.confidence ?? 0.72) >= 0.75) {
    return input.intent === 'casual_conversation' ? 'use_silently' : 'mention';
  }

  if (input.keywordOverlap >= 0.2 || input.temporalAlign) return 'use_silently';
  return 'ignore';
}

export function memoryTemporallyAligns(
  memory: Memory,
  queryTemporal: ParsedTemporal | null,
  timeZone: string,
): boolean {
  if (!queryTemporal || !memory.occurredAt) return false;
  return sameLocalDay(memory.occurredAt, queryTemporal.occurredAt, timeZone);
}

export function countTemporalAlignments(
  memories: Memory[],
  queryTemporal: ParsedTemporal | null,
  timeZone: string,
): number {
  if (!queryTemporal) return 0;
  return memories.filter((memory) => memoryTemporallyAligns(memory, queryTemporal, timeZone)).length;
}
