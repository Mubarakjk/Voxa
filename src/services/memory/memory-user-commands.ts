import { Memory } from '../../types';
import { IMemoryRepository } from '../contracts';
import { mergeTags } from './memory-deduplication';
import { TAG_SUPERSEDED, inferSemanticSlot, isSupersededMemory } from './memory-taxonomy';

export type UserMemoryCommand =
  | { type: 'forget_last_relevant'; hint?: string }
  | { type: 'explicit_remember'; content: string }
  | null;

const FORGET_PATTERN = /\b(forget that|delete that memory|don't remember that|do not remember that)\b/i;
const REMEMBER_PATTERN = /\b(remember that|remember this|don't forget that|do not forget that)\b/i;

export function parseUserMemoryCommand(message: string): UserMemoryCommand {
  const text = message.trim();
  if (!text) return null;

  if (FORGET_PATTERN.test(text)) {
    const hint = text
      .replace(FORGET_PATTERN, '')
      .replace(/\b(about|the|my)\b/gi, ' ')
      .trim();
    return { type: 'forget_last_relevant', hint: hint.length >= 3 ? hint : undefined };
  }

  if (REMEMBER_PATTERN.test(text)) {
    const content = text
      .replace(/\b(remember that|remember this|don't forget that|do not forget that)\b/i, '')
      .trim();
    if (content.length >= 4) {
      return { type: 'explicit_remember', content };
    }
  }

  return null;
}

export async function executeUserMemoryCommand(
  memories: IMemoryRepository,
  userId: string,
  command: UserMemoryCommand,
): Promise<{ deletedIds: string[]; supersededIds: string[] }> {
  if (!command) return { deletedIds: [], supersededIds: [] };

  const existing = await memories.listMemories(userId);
  const active = existing.filter((memory) => !isSupersededMemory(memory));

  if (command.type === 'forget_last_relevant') {
    const target = findForgetTarget(active, command.hint);
    if (!target) return { deletedIds: [], supersededIds: [] };
    await memories.deleteMemory(target.id);
    return { deletedIds: [target.id], supersededIds: [] };
  }

  return { deletedIds: [], supersededIds: [] };
}

function findForgetTarget(memories: Memory[], hint?: string): Memory | null {
  if (memories.length === 0) return null;

  const sorted = [...memories].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  if (hint) {
    const lowerHint = hint.toLowerCase();
    const match = sorted.find((memory) =>
      `${memory.title} ${memory.content}`.toLowerCase().includes(lowerHint),
    );
    if (match) return match;
  }

  return sorted[0] ?? null;
}

export function buildSupersededUpdate(existing: Memory): Partial<Memory> {
  return {
    tags: mergeTags(existing.tags, [TAG_SUPERSEDED]),
    importance: Math.max(1, existing.importance - 1) as Memory['importance'],
    confidence: Math.max(0.35, (existing.confidence ?? 0.7) - 0.15),
  };
}

export function findCorrectionTarget(memories: Memory[], content: string): Memory | null {
  const slot = inferSemanticSlot('preferences', content);
  if (slot === 'general') return null;

  const active = memories.filter((memory) => !isSupersededMemory(memory));
  return (
    active.find((memory) => {
      const memorySlot = inferSemanticSlot(memory.category, `${memory.title} ${memory.content}`);
      return memorySlot === slot;
    }) ?? null
  );
}
