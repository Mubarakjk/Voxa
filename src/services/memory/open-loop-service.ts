/**
 * Phase 2B: local open-loop identity, temporal join, and reference resolution.
 * No LLM, no remote search, no new persistence schema.
 */

import { Memory } from '../../types';
import { eventsLikelySame } from './memory-deduplication';
import { isSensitiveMemory } from './memory-sensitivity';
import {
  TAG_CANCELLED,
  TAG_OPEN_LOOP,
  TAG_RESOLVED,
  TAG_SUPERSEDED,
  isSupersededMemory,
} from './memory-taxonomy';
import { parseUserTemporal, readTemporalMeta } from './temporal-memory';
import {
  ParsedTemporal,
  TemporalParseContext,
  resolveDeviceTimeZone,
  sameLocalDay,
} from './temporal-parse';

export type OpenLoopStatus = 'open' | 'resolved' | 'cancelled' | 'superseded' | 'expired';
export type OpenLoopOutcome = 'positive' | 'negative' | 'neutral' | 'unknown';

export type OpenLoopJoin = {
  memory: Memory | null;
  competing: Memory[];
  unique: boolean;
  ambiguous: boolean;
};

export type ActiveTopic = {
  label: string | null;
  memoryId?: string;
  source: 'event' | 'reference' | 'none';
};

export type OpenLoopLifecycle = {
  target: Memory | null;
  patch: Partial<Memory> | null;
  suppressExtract: boolean;
  action: 'cancel' | 'resolve' | 'abandon' | 'none';
};

const EVENT_NOUN =
  /\b(driving test|interview|exam|test|deadline|meeting|appointment|flight|trip|wedding|birthday|lesson|results?|offer|job|project)\b/i;

const OPEN_LOOP_ELIGIBLE =
  /\b(driving test|i'?ve got (my|a|an) |i have (a|an|my) (driving test|interview|exam|test|deadline|meeting|appointment)|my (driving test|interview|exam|test|deadline|meeting) (is|on)|waiting to hear|trying to finish|need to decide|meeting \w+|results come out|accept the offer)\b/i;

const NOT_A_LOOP =
  /\b(favourite|favorite|i like|i love|might watch|maybe i('ll| will) get|netflix|17\s*[x×*]\s*\d+)\b/i;

const CANCEL_EVENT =
  /\b(got cancelled|was cancelled|is cancelled|isn't happening(?: anymore)?|is not happening(?: anymore)?|called off|it'?s off|they cancelled)\b/i;

const CONVERSATIONAL_ABANDON =
  /\b(forget (that|it)|never mind|nevermind|let'?s talk about|something else|change the subject)\b/i;

const BACK_TO_TOPIC =
  /\b(back to (what we were|the interview|the test|the exam|the meeting|the driving test)|what was i saying|anyway back to)\b/i;

const REFERENCE_EVENT =
  /\b(the test|my test|driving test|the interview|my interview|the exam|my exam|the meeting|that thing(?: friday)?|the thing tomorrow|what i told you about|that thing we (?:were )?talking about)\b/i;

const OUTCOME_POSITIVE =
  /\b(i passed|we passed|got the job|nailed it|went really well|went well|they accepted|i finished|i got it)\b/i;
const OUTCOME_NEGATIVE =
  /\b(didn'?t (get it|pass|get the job)|they rejected|i failed|went badly|didn'?t get in)\b/i;
const OUTCOME_NEUTRAL = /\b(went fine|meeting went fine|it'?s done|finished the project)\b/i;

const STRONG_PASSED = /^\s*i passed\b/i;

export function isOpenLoopEligible(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 10) return false;
  if (NOT_A_LOOP.test(trimmed) && !EVENT_NOUN.test(trimmed)) return false;
  if (/\b(i like|i love|favourite|favorite)\b/i.test(trimmed) && !OPEN_LOOP_ELIGIBLE.test(trimmed)) {
    return false;
  }
  if (/\b(maybe|might)\b/i.test(trimmed) && !EVENT_NOUN.test(trimmed)) return false;
  return OPEN_LOOP_ELIGIBLE.test(trimmed) || (EVENT_NOUN.test(trimmed) && hasFutureOrPendingCue(trimmed));
}

function hasFutureOrPendingCue(text: string): boolean {
  return (
    /\b(tomorrow|today|tonight|friday|monday|tuesday|wednesday|thursday|saturday|sunday|next week|this weekend|this week|next month)\b/i.test(
      text,
    ) || /\b(waiting|trying to finish|need to decide|coming up|due)\b/i.test(text)
  );
}

export function isOpenLoopMemory(memory: Memory): boolean {
  return memory.tags.includes(TAG_OPEN_LOOP);
}

export function isCancelledMemory(memory: Memory): boolean {
  return memory.tags.includes(TAG_CANCELLED);
}

export function isResolvedMemory(memory: Memory): boolean {
  return memory.tags.includes(TAG_RESOLVED);
}

export function readOpenLoopStatus(memory: Memory, now = new Date()): OpenLoopStatus {
  if (isSupersededMemory(memory) || memory.tags.includes(TAG_SUPERSEDED)) return 'superseded';
  if (isCancelledMemory(memory)) return 'cancelled';
  if (isResolvedMemory(memory)) return 'resolved';
  if (memory.expiresAt && new Date(memory.expiresAt).getTime() < now.getTime()) return 'expired';
  if (isOpenLoopMemory(memory)) return 'open';
  return 'open';
}

export function isActiveOpenLoop(memory: Memory, now = new Date()): boolean {
  if (isSupersededMemory(memory) || isCancelledMemory(memory) || isResolvedMemory(memory)) return false;
  if (memory.expiresAt && new Date(memory.expiresAt).getTime() < now.getTime()) return false;
  return isOpenLoopMemory(memory) || looksLikeUpcomingEvent(memory);
}

function looksLikeUpcomingEvent(memory: Memory): boolean {
  const blob = `${memory.title} ${memory.content}`;
  return EVENT_NOUN.test(blob) && Boolean(memory.occurredAt);
}

export function hasTemporalAnaphora(text: string): boolean {
  return /\b(today|tonight|tomorrow|tmrw|this morning|this afternoon|later today|this weekend|next week)\b/i.test(
    text,
  );
}

export function detectConversationalAbandon(text: string): boolean {
  if (CANCEL_EVENT.test(text) && EVENT_NOUN.test(text)) return false;
  return CONVERSATIONAL_ABANDON.test(text) && !CANCEL_EVENT.test(text);
}

export function detectEventCancellation(text: string): boolean {
  if (detectConversationalAbandon(text)) return false;
  return CANCEL_EVENT.test(text) && (EVENT_NOUN.test(text) || /\b(the|my|that)\b/i.test(text));
}

export function detectEventOutcome(text: string): OpenLoopOutcome | null {
  if (OUTCOME_NEGATIVE.test(text)) return 'negative';
  if (OUTCOME_POSITIVE.test(text) || STRONG_PASSED.test(text.trim())) return 'positive';
  if (OUTCOME_NEUTRAL.test(text)) return 'neutral';
  return null;
}

export function joinOpenLoops(
  memories: Memory[],
  input: {
    userMessage: string;
    now?: Date;
    timeZone?: string;
    recentMessageTexts?: string[];
  },
): OpenLoopJoin {
  const now = input.now ?? new Date();
  const timeZone = resolveDeviceTimeZone(input.timeZone);
  const queryTemporal = parseUserTemporal(input.userMessage, now, timeZone);
  const active = memories.filter((memory) => isActiveOpenLoop(memory, now));
  const recent = (input.recentMessageTexts ?? []).join(' ');
  const scored = active
    .map((memory) => ({
      memory,
      score: scoreJoinCandidate(memory, input.userMessage, recent, queryTemporal, timeZone, now),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return { memory: null, competing: [], unique: false, ambiguous: false };
  }

  const top = scored[0];
  const competing = scored.filter((item) => item.score >= top.score * 0.75).map((item) => item.memory);
  const temporalHits = queryTemporal
    ? active.filter((memory) => memory.occurredAt && sameLocalDay(memory.occurredAt, queryTemporal.occurredAt, timeZone))
    : [];

  if (temporalHits.length > 1 && !hasDiscriminatingReference(input.userMessage, temporalHits)) {
    return { memory: null, competing: temporalHits, unique: false, ambiguous: true };
  }

  if (competing.length > 1 && top.score < 4) {
    return { memory: null, competing, unique: false, ambiguous: true };
  }

  if (competing.length > 1 && scored[1] && scored[1].score >= top.score - 0.5) {
    return { memory: null, competing, unique: false, ambiguous: true };
  }

  return { memory: top.memory, competing, unique: true, ambiguous: false };
}

function hasDiscriminatingReference(userMessage: string, candidates: Memory[]): boolean {
  const hits = candidates.filter((memory) => eventNounOverlap(userMessage, memory) >= 1);
  return hits.length === 1;
}

function scoreJoinCandidate(
  memory: Memory,
  userMessage: string,
  recent: string,
  queryTemporal: ParsedTemporal | null,
  timeZone: string,
  now: Date,
): number {
  if (isSensitiveMemory(memory.tags, memory.title, memory.content) && eventNounOverlap(userMessage, memory) < 1) {
    return 0;
  }

  let score = 0;
  const blob = `${memory.title} ${memory.content}`;
  const keyword = localOverlap(`${userMessage} ${recent}`, blob);
  score += keyword * 4;
  score += eventNounOverlap(userMessage, memory) * 3;
  if (recent && eventNounOverlap(recent, memory) >= 1) score += 1.5;

  if (queryTemporal && memory.occurredAt && sameLocalDay(memory.occurredAt, queryTemporal.occurredAt, timeZone)) {
    score += 5;
  } else if (hasTemporalAnaphora(userMessage) && !queryTemporal) {
    score += 0;
  }

  const confidence = memory.confidence ?? 0.72;
  if (confidence >= 0.8) score += 1;
  else if (confidence < 0.55) score -= 3;

  const ageHours = (now.getTime() - new Date(memory.updatedAt).getTime()) / (1000 * 60 * 60);
  if (ageHours <= 48) score += 0.75;

  if (REFERENCE_EVENT.test(userMessage) && eventNounOverlap(userMessage, memory) >= 1) score += 2;
  if (BACK_TO_TOPIC.test(userMessage) && eventNounOverlap(userMessage, memory) >= 1) score += 3;

  return score;
}

function eventNounOverlap(text: string, memory: Memory): number {
  const blob = `${memory.title} ${memory.content}`.toLowerCase();
  const lower = text.toLowerCase();
  let hits = 0;
  const nouns = ['driving', 'test', 'interview', 'exam', 'deadline', 'meeting', 'appointment', 'job', 'offer', 'project'];
  for (const noun of nouns) {
    if (lower.includes(noun) && blob.includes(noun)) hits += 1;
  }
  return hits;
}

export function resolveActiveTopic(input: {
  memories: Memory[];
  userMessage: string;
  recentMessageTexts?: string[];
  now?: Date;
  timeZone?: string;
}): ActiveTopic {
  if (BACK_TO_TOPIC.test(input.userMessage) || REFERENCE_EVENT.test(input.userMessage)) {
    const named = input.memories.filter(
      (memory) => isActiveOpenLoop(memory, input.now) && eventNounOverlap(input.userMessage, memory) >= 1,
    );
    if (named.length === 1) {
      return { label: compactEventLabel(named[0]), memoryId: named[0].id, source: 'reference' };
    }
  }

  if (detectConversationalAbandon(input.userMessage)) {
    return { label: null, source: 'none' };
  }

  const join = joinOpenLoops(input.memories, input);
  if (join.unique && join.memory) {
    return { label: compactEventLabel(join.memory), memoryId: join.memory.id, source: 'event' };
  }
  if (join.ambiguous) {
    return { label: null, source: 'none' };
  }

  return { label: null, source: 'none' };
}

export function compactEventLabel(memory: Memory, timeZone?: string): string {
  const title = memory.title.replace(/^upcoming event$/i, inferEventNoun(memory) ?? memory.title);
  const meta = readTemporalMeta(memory, timeZone);
  const when = meta.label ?? (hasTemporalAnaphora(memory.content) ? 'upcoming' : null);
  return when ? `${title} — ${when}` : title;
}

function inferEventNoun(memory: Memory): string | null {
  const blob = `${memory.title} ${memory.content}`.toLowerCase();
  if (blob.includes('driving test')) return 'Driving test';
  if (blob.includes('interview')) return 'Interview';
  if (blob.includes('exam')) return 'Exam';
  if (blob.includes('deadline')) return 'Deadline';
  if (blob.includes('meeting')) return 'Meeting';
  return null;
}

export function formatActiveEventForPrompt(input: {
  memory: Memory;
  callback: 'mention' | 'use_silently';
  timeZone?: string;
}): string {
  const label = compactEventLabel(input.memory, input.timeZone);
  const meta = readTemporalMeta(input.memory, input.timeZone);
  const confidence =
    meta.temporalConfidence === 'high' || (input.memory.confidence ?? 0) >= 0.85
      ? 'high confidence'
      : meta.temporalConfidence === 'low'
        ? 'low confidence'
        : 'medium confidence';
  const callback =
    input.callback === 'mention' ? 'callback allowed' : 'use silently — do not mention unless the user brings it up';
  return `Active event: ${label} — ${confidence} — ${callback}`;
}

export function applyOpenLoopLifecycle(
  memories: Memory[],
  userMessage: string,
  ctx: TemporalParseContext,
): OpenLoopLifecycle {
  if (detectConversationalAbandon(userMessage)) {
    return { target: null, patch: null, suppressExtract: false, action: 'abandon' };
  }

  const now = ctx.now;
  const includingExpired = memories.filter(
    (memory) =>
      !isSupersededMemory(memory) &&
      !isCancelledMemory(memory) &&
      (isOpenLoopMemory(memory) || looksLikeUpcomingEvent(memory)),
  );

  if (detectEventCancellation(userMessage)) {
    const target = pickUniqueLifecycleTarget(includingExpired, userMessage, ctx);
    if (!target) {
      return { target: null, patch: null, suppressExtract: false, action: 'none' };
    }
    return {
      target,
      patch: buildCancelledPatch(target),
      suppressExtract: true,
      action: 'cancel',
    };
  }

  const outcome = detectEventOutcome(userMessage);
  if (outcome) {
    const target = pickUniqueLifecycleTarget(includingExpired, userMessage, ctx, { allowExpired: true, now });
    if (!target) {
      return { target: null, patch: null, suppressExtract: false, action: 'none' };
    }
    return {
      target,
      patch: buildResolvedPatch(target, outcome, conservativeOutcomeSummary(userMessage, target)),
      suppressExtract: true,
      action: 'resolve',
    };
  }

  return { target: null, patch: null, suppressExtract: false, action: 'none' };
}

function pickUniqueLifecycleTarget(
  memories: Memory[],
  userMessage: string,
  ctx: TemporalParseContext,
  options?: { allowExpired?: boolean; now?: Date },
): Memory | null {
  const now = options?.now ?? ctx.now;
  const pool = memories.filter((memory) => {
    if (isCancelledMemory(memory) || isResolvedMemory(memory) || isSupersededMemory(memory)) return false;
    if (options?.allowExpired) return isOpenLoopMemory(memory) || looksLikeUpcomingEvent(memory);
    return isActiveOpenLoop(memory, now) || looksLikeUpcomingEvent(memory);
  });

  const named = pool.filter(
    (memory) =>
      eventsLikelySame('Event', userMessage, memory.title, memory.content) ||
      eventNounOverlap(userMessage, memory) >= 1,
  );
  if (named.length === 1) return named[0];
  if (named.length > 1) return null;

  const today = parseUserTemporal('today', ctx.now, ctx.timeZone);
  const outcome = detectEventOutcome(userMessage);
  const implicit = Boolean(outcome) && !EVENT_NOUN.test(userMessage);
  if (!implicit) return null;

  const dueNow = pool.filter((memory) => {
    if (!memory.occurredAt || !today) return false;
    return sameLocalDay(memory.occurredAt, today.occurredAt, ctx.timeZone);
  });
  if (dueNow.length === 1 && pool.length === 1) return dueNow[0];
  if (dueNow.length === 1 && pool.filter((memory) => isActiveOpenLoop(memory, now)).length === 1) {
    return dueNow[0];
  }
  return null;
}

export function buildCancelledPatch(memory: Memory): Partial<Memory> {
  return {
    tags: [...new Set([...memory.tags.filter((tag) => tag !== TAG_OPEN_LOOP && tag !== TAG_RESOLVED), TAG_CANCELLED])],
    confidence: Math.min(memory.confidence ?? 0.8, 0.7),
  };
}

export function buildResolvedPatch(
  memory: Memory,
  outcome: OpenLoopOutcome,
  summary: string,
): Partial<Memory> {
  const withoutLoop = memory.tags.filter((tag) => tag !== TAG_OPEN_LOOP && !tag.startsWith('outcome:'));
  const content = memory.content.includes('Outcome:')
    ? memory.content
    : `${memory.content.trim()} Outcome: ${summary}`.trim();
  return {
    content,
    tags: [...new Set([...withoutLoop, TAG_RESOLVED, `outcome:${outcome}`])],
    confidence: Math.max(memory.confidence ?? 0.8, 0.88),
  };
}

export function keepOpenLoopTagsOnUpdate(existing: string[], incoming: string[]): string[] {
  const stripped = existing.filter(
    (tag) => tag !== TAG_SUPERSEDED && tag !== TAG_CANCELLED && tag !== TAG_RESOLVED && !tag.startsWith('outcome:'),
  );
  return [...new Set([...stripped, ...incoming, TAG_OPEN_LOOP])];
}

function conservativeOutcomeSummary(userMessage: string, memory: Memory): string {
  const noun = inferEventNoun(memory)?.toLowerCase() ?? 'event';
  const outcome = detectEventOutcome(userMessage);
  if (outcome === 'positive' && /pass/i.test(userMessage)) return `passed ${noun}`;
  if (outcome === 'positive' && /job/i.test(userMessage)) return 'got the job';
  if (outcome === 'negative') return `${noun} unsuccessful`;
  if (outcome === 'neutral') return `${noun} happened`;
  return noun;
}

function localOverlap(query: string, target: string): number {
  const queryTokens = new Set(
    query
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2),
  );
  const targetTokens = new Set(
    target
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2),
  );
  if (queryTokens.size === 0 || targetTokens.size === 0) return 0;
  let hits = 0;
  for (const token of queryTokens) {
    if (targetTokens.has(token)) hits += 1;
  }
  return hits / queryTokens.size;
}
