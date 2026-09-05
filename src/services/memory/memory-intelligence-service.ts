import { CompanionModeId, Memory, MemorySource, UserProfile } from '../../types';
import { TalkIntent } from '../ai/companion-intent';
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
  filterMemoriesForIntent,
  rankMemories,
  TOP_MEMORY_LIMIT,
} from './memory-relevance';
import { memoryAgingEngine } from '../personality/memory-aging-engine';
import { nowIso } from '../../types';
import {
  assessMemoryWrite,
  decisionToCandidate,
  enrichCandidateDecision,
} from './memory-write-policy';
import {
  buildSupersededPatch,
  findSupersessionTargets,
  shouldReplaceInsteadOfMerge,
} from './memory-supersession';
import { importanceFromLevel, TAG_SUPERSEDED } from './memory-taxonomy';
import { logMemoryRetrieveDiagnostic, logMemoryWriteDiagnostic } from './memory-diagnostics';
import {
  executeUserMemoryCommand,
  parseUserMemoryCommand,
} from './memory-user-commands';

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

  async handleUserMemoryCommand(userId: string, userMessage: string): Promise<void> {
    const command = parseUserMemoryCommand(userMessage);
    if (!command) return;
    await executeUserMemoryCommand(this.memories, userId, command);
  }

  async retrieveForPrompt(
    userId: string,
    context: MemoryRetrievalContext,
    options?: { intent?: TalkIntent },
  ): Promise<Memory[]> {
    const allMemories = await this.memories.listMemories(userId);
    const activeMemories = memoryAgingEngine.filterActive(allMemories);
    if (activeMemories.length === 0) return [];

    const ranked = rankMemories(activeMemories, context, TOP_MEMORY_LIMIT);
    const selected = options?.intent
      ? filterMemoriesForIntent(ranked, options.intent, context.userMessage)
      : ranked.map((item) => item.memory);

    logMemoryRetrieveDiagnostic({
      intent: options?.intent ?? 'unknown',
      candidates: allMemories.length,
      active: activeMemories.length,
      selected,
    });

    if (selected.length === 0) return [];

    const timestamp = nowIso();

    const touched = await Promise.all(
      selected.map(async (memory) =>
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

    const explicitOnly = assessMemoryWrite(input.userMessage);
    if (explicitOnly?.shouldPersist && candidates.length === 0) {
      candidates = [decisionToCandidate(explicitOnly)];
    }

    const upserted: Memory[] = [];
    const workingSet = [...existing];

    for (const candidate of candidates) {
      const decision = enrichCandidateDecision(candidate, input.userMessage);
      if (!decision.shouldPersist) {
        logMemoryWriteDiagnostic({ action: 'skip', decision });
        continue;
      }

      const { target, supersedeIds } = findSupersessionTargets(workingSet, decision);

      for (const supersedeId of supersedeIds) {
        const old = workingSet.find((item) => item.id === supersedeId);
        if (!old) continue;
        const superseded = await this.memories.updateMemory(supersedeId, buildSupersededPatch(old));
        const index = workingSet.findIndex((item) => item.id === supersedeId);
        if (index >= 0) workingSet[index] = superseded;
        logMemoryWriteDiagnostic({ action: 'supersede', decision });
      }

      if (target && shouldReplaceInsteadOfMerge(decision, target)) {
        const updated = await this.memories.updateMemory(target.id, {
          title: decision.title.length >= target.title.length ? decision.title : target.title,
          content: decision.content,
          importance: importanceFromLevel(decision.importance),
          mood: candidate.mood ?? target.mood,
          tags: mergeTags(
            target.tags.filter((tag) => tag !== TAG_SUPERSEDED),
            decision.tags,
          ),
          confidence: decision.confidenceScore,
          expiresAt: decision.expiresAt ?? target.expiresAt,
          relatedMode: candidate.relatedMode ?? target.relatedMode,
        });
        const index = workingSet.findIndex((item) => item.id === target.id);
        if (index >= 0) workingSet[index] = updated;
        upserted.push(updated);
        logMemoryWriteDiagnostic({ action: 'update', decision });
        continue;
      }

      if (target) {
        const updated = await this.memories.updateMemory(target.id, {
          title: candidate.title.length >= target.title.length ? candidate.title : target.title,
          content: mergeMemoryContent(target.content, candidate.content),
          importance: resolveImportance(target.importance, importanceFromLevel(decision.importance)),
          mood: candidate.mood ?? target.mood,
          tags: mergeTags(target.tags, decision.tags),
          confidence: Math.max(target.confidence ?? 0.7, decision.confidenceScore),
          expiresAt: decision.expiresAt ?? target.expiresAt,
        });
        const index = workingSet.findIndex((item) => item.id === target.id);
        if (index >= 0) workingSet[index] = updated;
        upserted.push(updated);
        logMemoryWriteDiagnostic({ action: 'update', decision });
        continue;
      }

      const enrichedCandidate = decisionToCandidate(decision);
      const created = await this.memories.createMemory(
        memoryAgingEngine.enrichOnCreate({
          userId: input.userId,
          category: enrichedCandidate.category,
          title: enrichedCandidate.title,
          content: enrichedCandidate.content,
          mood: enrichedCandidate.mood ?? candidate.mood,
          importance: enrichedCandidate.importance,
          tags: enrichedCandidate.tags,
          relatedMode: candidate.relatedMode ?? input.mode,
          source: resolveMemorySource(input.mediaSource),
          confidence: enrichedCandidate.confidence,
          expiresAt: enrichedCandidate.expiresAt,
        }),
      );
      workingSet.unshift(created);
      upserted.push(created);
      logMemoryWriteDiagnostic({ action: 'create', decision });
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
