import { CompanionModeId, Memory, MemorySource, UserProfile } from '../../types';
import { IMemoryRepository } from '../contracts';
import { ExtractedMemoryCandidate, IAIService } from '../contracts';
import {
  findDuplicateMemory,
  mergeMemoryContent,
  mergeTags,
  resolveImportance,
} from './memory-deduplication';
import { extractMemoriesLocally } from './local-memory-extractor';
import {
  MemoryRetrievalContext,
  rankMemories,
  TOP_MEMORY_LIMIT,
} from './memory-relevance';
import { memoryAgingEngine } from '../personality/memory-aging-engine';
import { nowIso } from '../../types';

export type ProcessConversationInput = {
  userId: string;
  userMessage: string;
  voxaReply: string;
  mode: CompanionModeId;
  userProfile: UserProfile;
  mediaSource?: MemorySource;
};

/**
 * Retrieves relevant memories for prompts and extracts new ones after each exchange.
 */
export class MemoryIntelligenceService {
  constructor(
    private readonly memories: IMemoryRepository,
    private readonly ai: IAIService,
  ) {}

  async retrieveForPrompt(
    userId: string,
    context: MemoryRetrievalContext,
  ): Promise<Memory[]> {
    const allMemories = await this.memories.listMemories(userId);
    const activeMemories = memoryAgingEngine.filterActive(allMemories);
    if (activeMemories.length === 0) return [];

    const ranked = rankMemories(activeMemories, context, TOP_MEMORY_LIMIT);
    const timestamp = nowIso();

    const touched = await Promise.all(
      ranked.map(async ({ memory }) =>
        this.memories.updateMemory(memory.id, {
          lastUsedAt: timestamp,
          useCount: (memory.useCount ?? 0) + 1,
          ...memoryAgingEngine.enrichOnUpdate(memory, {
            useCount: (memory.useCount ?? 0) + 1,
          }),
        }),
      ),
    );

    return touched;
  }

  async processAfterReply(input: ProcessConversationInput): Promise<Memory[]> {
    if (!input.userProfile.preferences.memoryEnabled) return [];

    const existing = await this.memories.listMemories(input.userId);
    let candidates: ExtractedMemoryCandidate[] = [];

    try {
      candidates = await this.ai.extractMemoriesFromExchange({
        userMessage: input.userMessage,
        voxaReply: input.voxaReply,
        mode: input.mode,
        userProfile: input.userProfile,
        existingMemories: existing,
        mediaSource: input.mediaSource,
      });
    } catch (error) {
      console.warn('[Voxa] Memory extraction failed, using local rules.', error);
      candidates = extractMemoriesLocally({
        userMessage: input.userMessage,
        voxaReply: input.voxaReply,
        mode: input.mode,
        existingMemories: existing,
      });
    }

    if (candidates.length === 0) {
      candidates = extractMemoriesLocally({
        userMessage: input.userMessage,
        voxaReply: input.voxaReply,
        mode: input.mode,
        existingMemories: existing,
      });
    }

    const upserted: Memory[] = [];
    const workingSet = [...existing];

    for (const candidate of candidates) {
      const duplicate = findDuplicateMemory(workingSet, candidate);
      if (duplicate) {
        const updated = await this.memories.updateMemory(duplicate.id, {
          title: candidate.title.length >= duplicate.title.length ? candidate.title : duplicate.title,
          content: mergeMemoryContent(duplicate.content, candidate.content),
          importance: resolveImportance(duplicate.importance, candidate.importance),
          mood: candidate.mood ?? duplicate.mood,
          tags: mergeTags(duplicate.tags, candidate.tags),
          relatedMode: candidate.relatedMode ?? duplicate.relatedMode,
        });
        const index = workingSet.findIndex((item) => item.id === duplicate.id);
        if (index >= 0) workingSet[index] = updated;
        upserted.push(updated);
        continue;
      }

      const created = await this.memories.createMemory(
        memoryAgingEngine.enrichOnCreate({
          userId: input.userId,
          category: candidate.category,
          title: candidate.title,
          content: candidate.content,
          mood: candidate.mood,
          importance: candidate.importance,
          tags: candidate.tags,
          relatedMode: candidate.relatedMode ?? input.mode,
          source: resolveMemorySource(input.mediaSource),
        }),
      );
      workingSet.unshift(created);
      upserted.push(created);
    }

    return upserted;
  }
}

function resolveMemorySource(mediaSource?: MemorySource): MemorySource {
  if (mediaSource && mediaSource !== 'text' && mediaSource !== 'conversation') {
    return mediaSource;
  }
  return 'conversation';
}
