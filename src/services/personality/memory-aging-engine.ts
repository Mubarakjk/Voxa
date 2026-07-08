import { Memory, MemoryCategory, nowIso } from '../../types';
import { CreateMemoryInput, UpdateMemoryInput } from '../../types';

const CATEGORY_EMOTIONAL: Partial<Record<MemoryCategory, Memory['emotionalSignificance']>> = {
  birthdays: 5,
  people: 5,
  emotional: 4,
  fears: 4,
  goals: 4,
  future_plans: 3,
  favourites: 2,
  preferences: 2,
  work: 2,
  business: 2,
  study: 3,
  fitness: 3,
  habits: 3,
  routines: 2,
  moments: 4,
  faith: 4,
  productivity: 2,
};

const TRANSIENT_CATEGORIES: MemoryCategory[] = ['work', 'business', 'productivity'];

export class MemoryAgingEngine {
  enrichOnCreate(input: CreateMemoryInput): CreateMemoryInput {
    const emotionalSignificance =
      input.emotionalSignificance ??
      CATEGORY_EMOTIONAL[input.category] ??
      ((input.importance ?? 3) >= 4 ? 4 : 3);

    const confidence = input.confidence ?? 0.72;

    let expiresAt = input.expiresAt;
    if (!expiresAt && TRANSIENT_CATEGORIES.includes(input.category)) {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 90);
      expiresAt = expiry.toISOString();
    }

    return {
      ...input,
      emotionalSignificance,
      confidence,
      expiresAt,
    };
  }

  enrichOnUpdate(memory: Memory, patch: UpdateMemoryInput): UpdateMemoryInput {
    const next = { ...patch };
    if (patch.useCount !== undefined && patch.useCount > (memory.useCount ?? 0)) {
      next.confidence = Math.min(1, (memory.confidence ?? 0.7) + 0.03);
    }
    return next;
  }

  isExpired(memory: Memory, now = new Date()): boolean {
    if (!memory.expiresAt) return false;
    return new Date(memory.expiresAt).getTime() < now.getTime();
  }

  filterActive(memories: Memory[]): Memory[] {
    return memories.filter((m) => !this.isExpired(m));
  }

  decayConfidence(memory: Memory): Memory {
    if (!memory.expiresAt) return memory;
    const daysLeft =
      (new Date(memory.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (daysLeft > 14) return memory;
    return {
      ...memory,
      confidence: Math.max(0.35, (memory.confidence ?? 0.7) - 0.05),
    };
  }

  describeForPrompt(memory: Memory): string {
    const parts = [`importance ${memory.importance}/5`];
    if (memory.emotionalSignificance) parts.push(`emotional ${memory.emotionalSignificance}/5`);
    if (memory.confidence !== undefined) parts.push(`confidence ${Math.round(memory.confidence * 100)}%`);
    if (memory.expiresAt) parts.push(`expires ${new Date(memory.expiresAt).toLocaleDateString()}`);
    return parts.join(', ');
  }
}

export const memoryAgingEngine = new MemoryAgingEngine();
