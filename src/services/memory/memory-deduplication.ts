import { Memory, MemoryCategory } from '../../types';
import { ExtractedMemoryCandidate } from '../contracts';

function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

export function findDuplicateMemory(
  existing: Memory[],
  candidate: ExtractedMemoryCandidate,
): Memory | null {
  const candidateKey = memoryFingerprint(candidate.title, candidate.category);
  const candidateTitleTokens = tokenSet(candidate.title);
  const candidateContentNorm = normalizeKey(candidate.content);

  for (const memory of existing) {
    const sameKey = memoryFingerprint(memory.title, memory.category) === candidateKey;
    if (sameKey) return memory;

    if (memory.category !== candidate.category) continue;

    const titleSimilarity = jaccardSimilarity(candidateTitleTokens, tokenSet(memory.title));
    const contentNorm = normalizeKey(memory.content);
    const contentOverlap =
      contentNorm.includes(candidateContentNorm) ||
      candidateContentNorm.includes(contentNorm) ||
      jaccardSimilarity(tokenSet(memory.content), tokenSet(candidate.content)) >= 0.55;

    if (titleSimilarity >= 0.6 || (titleSimilarity >= 0.35 && contentOverlap)) {
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
