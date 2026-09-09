import { Memory, MemoryCategory } from '../../types';
import { ExtractedMemoryCandidate } from '../contracts';

const TEMPORAL_NOISE =
  /\b(today|tonight|tomorrow|tmrw|yesterday|this|next|last|week|weekend|morning|afternoon|evening|later|few|days?|hours?|monday|tuesday|wednesday|thursday|friday|saturday|sunday|on|at|in|the|a|an|my|is|are|was|to|for|got|have|has|will)\b/g;

const RESCHEDULE_NOISE =
  /\b(moved|rescheduled|postponed|pushed|changed|instead|now)\b/g;

const EVENT_NOUNS = new Set([
  'test',
  'exam',
  'interview',
  'deadline',
  'meeting',
  'appointment',
  'flight',
  'trip',
  'wedding',
  'birthday',
  'driving',
  'lesson',
]);

function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function eventIdentityKey(title: string, content: string): string {
  const stripped = `${title} ${content}`
    .toLowerCase()
    .replace(TEMPORAL_NOISE, ' ')
    .replace(RESCHEDULE_NOISE, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return stripped
    .split(' ')
    .filter((token) => token.length > 2)
    .sort()
    .join(' ');
}

export function looksLikeReschedule(text: string): boolean {
  return /\b(moved|reschedul|postponed|pushed (it |back )?to|now on|changed to|instead)\b/i.test(text);
}

export function eventsLikelySame(aTitle: string, aContent: string, bTitle: string, bContent: string): boolean {
  const a = eventIdentityKey(aTitle, aContent);
  const b = eventIdentityKey(bTitle, bContent);
  if (!a || !b) return false;
  if (a === b) return true;
  const aTokens = new Set(a.split(' '));
  const bTokens = new Set(b.split(' '));
  const similarity = jaccardSimilarity(aTokens, bTokens);
  const sharesEventNoun = [...aTokens].some((token) => EVENT_NOUNS.has(token) && bTokens.has(token));
  if (similarity >= 0.8) return true;
  return sharesEventNoun && similarity >= 0.5;
}

function tokenSet(value: string): Set<string> {
  return new Set(normalizeKey(value).split(' ').filter(Boolean));
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function memoryFingerprint(title: string, category: MemoryCategory): string {
  return `${category}:${normalizeKey(title)}`;
}

const GENERIC_TITLES = new Set([
  'upcoming event',
  'preference',
  'personal goal',
  'future plan',
  'emotional note',
  'important person',
  'study context',
  'school & study',
  'training preference',
  'training routine',
]);

export function findDuplicateMemory(
  existing: Memory[],
  candidate: ExtractedMemoryCandidate,
): Memory | null {
  const candidateKey = memoryFingerprint(candidate.title, candidate.category);
  const candidateTitleTokens = tokenSet(candidate.title);
  const candidateContentNorm = normalizeKey(candidate.content);
  const genericTitle = GENERIC_TITLES.has(normalizeKey(candidate.title));

  for (const memory of existing) {
    const sameKey = memoryFingerprint(memory.title, memory.category) === candidateKey;
    if (sameKey && !genericTitle) return memory;

    if (memory.category !== candidate.category) continue;

    if (eventsLikelySame(candidate.title, candidate.content, memory.title, memory.content)) {
      return memory;
    }

    if (genericTitle) continue;

    const titleSimilarity = jaccardSimilarity(candidateTitleTokens, tokenSet(memory.title));
    const contentNorm = normalizeKey(memory.content);
    const contentOverlap =
      contentNorm.includes(candidateContentNorm) ||
      candidateContentNorm.includes(contentNorm) ||
      jaccardSimilarity(tokenSet(memory.content), tokenSet(candidate.content)) >= 0.72;

    if (titleSimilarity >= 0.75 && contentOverlap) {
      return memory;
    }
  }

  return null;
}

export function mergeMemoryContent(existing: string, incoming: string): string {
  const existingNorm = normalizeKey(existing);
  const incomingNorm = normalizeKey(incoming);

  if (existingNorm === incomingNorm) return existing;
  if (existing.includes(incoming)) return existing;
  if (incoming.includes(existing)) return incoming;

  return `${existing.trim()} ${incoming.trim()}`.trim();
}

export function mergeTags(existing: string[], incoming: string[] = []): string[] {
  return [...new Set([...existing, ...incoming].map((tag) => tag.trim()).filter(Boolean))];
}

export function resolveImportance(
  existing: Memory['importance'],
  incoming?: Memory['importance'],
): Memory['importance'] {
  const next = incoming ?? 3;
  return Math.max(existing, next) as Memory['importance'];
}

/** Suggest merge pairs among existing memories (for Smart Memory UX). */
export function findNearDuplicatePairs(memories: Memory[]): Array<{ a: Memory; b: Memory; score: number }> {
  const pairs: Array<{ a: Memory; b: Memory; score: number }> = [];
  for (let i = 0; i < memories.length; i += 1) {
    for (let j = i + 1; j < memories.length; j += 1) {
      const a = memories[i];
      const b = memories[j];
      if (a.category !== b.category) continue;
      const titleScore = jaccardSimilarity(tokenSet(a.title), tokenSet(b.title));
      const contentScore = jaccardSimilarity(tokenSet(a.content), tokenSet(b.content));
      const score = Math.max(titleScore, (titleScore + contentScore) / 2);
      if (score >= 0.45) pairs.push({ a, b, score });
    }
  }
  return pairs.sort((x, y) => y.score - x.score).slice(0, 8);
}
