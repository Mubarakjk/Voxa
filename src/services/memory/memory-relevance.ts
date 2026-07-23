import { MEMORY_MODE_AFFINITY } from '../../constants/memory-categories';
import { CompanionModeId, Memory } from '../../types';
import { inferMemoryTheme, themeOverlapScore } from './memory-theme-service';
import { memoryAgingEngine } from '../personality/memory-aging-engine';

export type MemoryRetrievalContext = {
  userMessage: string;
  mode: CompanionModeId;
  recentMessageTexts?: string[];
  memoryLevel?: 'minimal' | 'balanced' | 'deep';
};

export type ScoredMemory = {
  memory: Memory;
  score: number;
};

const MEMORY_LEVEL_LIMIT: Record<'minimal' | 'balanced' | 'deep', number> = {
  minimal: 3,
  balanced: 5,
  deep: 8,
};

function isExpired(memory: Memory): boolean {
  if (!memory.expiresAt) return false;
  return new Date(memory.expiresAt).getTime() < Date.now();
}

const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'but',
  'i',
  'me',
  'my',
  'we',
  'you',
  'your',
  'is',
  'are',
  'was',
  'were',
  'to',
  'of',
  'in',
  'on',
  'at',
  'for',
  'it',
  'that',
  'this',
  'with',
  'have',
  'has',
  'had',
  'be',
  'been',
  'do',
  'does',
  'did',
  'am',
  'so',
  'just',
  'about',
  'like',
  'really',
  'very',
]);

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2 && !STOP_WORDS.has(word)),
  );
}

function overlapScore(queryTokens: Set<string>, targetText: string): number {
  const targetTokens = tokenize(targetText);
  if (queryTokens.size === 0 || targetTokens.size === 0) return 0;

  let matches = 0;
  for (const token of queryTokens) {
    if (targetTokens.has(token)) matches += 1;
  }

  return matches / Math.max(queryTokens.size, 1);
}

function recencyScore(isoDate: string): number {
  const ageMs = Date.now() - new Date(isoDate).getTime();
  const days = ageMs / (1000 * 60 * 60 * 24);
  if (days <= 1) return 1;
  if (days <= 7) return 0.75;
  if (days <= 30) return 0.5;
  if (days <= 90) return 0.25;
  return 0.1;
}

function usageScore(memory: Memory): number {
  const useCount = memory.useCount ?? 0;
  const useBoost = Math.min(useCount / 10, 1);
  const lastUsedBoost = memory.lastUsedAt ? recencyScore(memory.lastUsedAt) * 0.5 : 0;
  return useBoost + lastUsedBoost;
}

function modeAffinityScore(memory: Memory, mode: CompanionModeId): number {
  const affinityModes = MEMORY_MODE_AFFINITY[memory.category] ?? [];
  if (affinityModes.includes(mode)) return 1;
  if (memory.relatedMode === mode) return 0.85;
  return 0.2;
}

export function scoreMemoryRelevance(memory: Memory, context: MemoryRetrievalContext): number {
  if (isExpired(memory)) return -1;

  const pinnedBoost = memory.pinned === true || memory.tags.includes('pinned') ? 6 : 0;

  const queryText = [context.userMessage, ...(context.recentMessageTexts ?? [])].join(' ');
  const queryTokens = tokenize(queryText);
  const searchable = `${memory.title} ${memory.content} ${memory.tags.join(' ')}`;

  const keywordScore = overlapScore(queryTokens, searchable);
  const importanceScore = memory.importance / 5;
  const emotionalScore = (memory.emotionalSignificance ?? memory.importance) / 5;
  const confidenceScore = memory.confidence ?? 0.75;
  const recency = recencyScore(memory.updatedAt);
  const usage = usageScore(memory);
  const modeAffinity = modeAffinityScore(memory, context.mode);
  const theme = inferMemoryTheme(memory);
  const semanticThemeScore = themeOverlapScore(queryText, theme) * 2.5;
  const longTermBoost = memoryAgingEngine.longTermRank(memory) * 2;

  return (
    pinnedBoost +
    keywordScore * 4 +
    semanticThemeScore +
    importanceScore * 1.5 +
    emotionalScore * 1.25 +
    confidenceScore * 0.75 +
    recency * 1 +
    usage * 1.25 +
    modeAffinity * 1.5 +
    longTermBoost
  );
}

export function rankMemories(
  memories: Memory[],
  context: MemoryRetrievalContext,
  limit = TOP_MEMORY_LIMIT,
): ScoredMemory[] {
  const effectiveLimit = MEMORY_LEVEL_LIMIT[context.memoryLevel ?? 'balanced'] ?? limit;

  return memories
    .filter((memory) => !isExpired(memory))
    .map((memory) => ({
      memory,
      score: scoreMemoryRelevance(memory, context),
    }))
    .filter((item) => item.score >= 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, effectiveLimit);
}

const TOP_MEMORY_LIMIT = 5;

export { TOP_MEMORY_LIMIT };
