import { STORAGE_KEYS } from '../../constants/storage-keys';
import { createUuid, EntityId, Memory, nowIso } from '../../types';
import { PreferenceCategory, UserPreferenceMemory } from '../../types/phase8-retention';
import { IStorageService } from '../contracts';

const PREFERENCE_PATTERNS: Array<{ category: PreferenceCategory; pattern: RegExp; extract: RegExp }> = [
  { category: 'food', pattern: /\b(favourite food|love eating|favorite food)\b/i, extract: /(?:favourite food|love eating|favorite food)\s+(?:is\s+)?([^.!?]{2,40})/i },
  { category: 'movies', pattern: /\b(favourite film|favorite movie|love watching)\b/i, extract: /(?:favourite film|favorite movie|love watching)\s+([^.!?]{2,40})/i },
  { category: 'sports', pattern: /\b(i support|my team|favourite team)\b/i, extract: /(?:i support|my team is|favourite team)\s+([^.!?]{2,40})/i },
  { category: 'music', pattern: /\b(favourite artist|favorite song|love listening)\b/i, extract: /(?:favourite artist|favorite song|love listening to)\s+([^.!?]{2,40})/i },
  { category: 'books', pattern: /\b(reading|favourite book|favorite book)\b/i, extract: /(?:favourite book|favorite book|reading)\s+([^.!?]{2,40})/i },
  { category: 'travel', pattern: /\bdream destination\b|\bwant to visit\b/i, extract: /(?:dream destination|want to visit)\s+([^.!?]{2,40})/i },
  { category: 'career', pattern: /\bcareer goal\b|\bwant to become\b/i, extract: /(?:career goal|want to become)\s+([^.!?]{2,40})/i },
  { category: 'learning', pattern: /\blearning style\b|\bi learn best\b/i, extract: /(?:learning style|i learn best)\s+([^.!?]{2,40})/i },
];

export function extractPreferencesFromText(text: string): Array<{ category: PreferenceCategory; label: string; value: string }> {
  const found: Array<{ category: PreferenceCategory; label: string; value: string }> = [];
  for (const { category, pattern, extract } of PREFERENCE_PATTERNS) {
    if (!pattern.test(text)) continue;
    const match = text.match(extract);
    if (match?.[1]) {
      const value = match[1].trim();
      if (value.length >= 2) found.push({ category, label: category, value });
    }
  }
  return found;
}

export class PreferenceMemoryService {
  constructor(private readonly storage: IStorageService) {}

  async list(userId: EntityId): Promise<UserPreferenceMemory[]> {
    const map = (await this.storage.getItem<Record<string, UserPreferenceMemory[]>>(STORAGE_KEYS.userPreferenceMemories)) ?? {};
    return (map[userId] ?? []).slice(0, 40);
  }

  async ingestFromMessage(userId: EntityId, text: string, sourceMemoryId?: EntityId): Promise<UserPreferenceMemory[]> {
    const extracted = extractPreferencesFromText(text);
    if (extracted.length === 0) return [];

    const existing = await this.list(userId);
    const added: UserPreferenceMemory[] = [];

    for (const item of extracted) {
      if (existing.some((e) => e.value.toLowerCase() === item.value.toLowerCase())) continue;
      added.push({
        id: createUuid(),
        userId,
        category: item.category,
        label: item.label,
        value: item.value,
        sourceMemoryId,
        confidence: 'high',
        createdAt: nowIso(),
      });
    }

    if (added.length === 0) return [];
    await this.save(userId, [...added, ...existing]);
    return added;
  }

  async ingestFromMemories(userId: EntityId, memories: Memory[]): Promise<void> {
    for (const memory of memories.slice(0, 30)) {
      await this.ingestFromMessage(userId, `${memory.title} ${memory.content}`, memory.id);
    }
  }

  formatForPrompt(prefs: UserPreferenceMemory[]): string {
    if (prefs.length === 0) return '';
    const lines = prefs.slice(0, 8).map((p) => `${p.category}: ${p.value}`);
    return `Known preferences (only reference when relevant):\n${lines.join('\n')}`;
  }

  private async save(userId: EntityId, items: UserPreferenceMemory[]) {
    const map = (await this.storage.getItem<Record<string, UserPreferenceMemory[]>>(STORAGE_KEYS.userPreferenceMemories)) ?? {};
    map[userId] = items.slice(0, 40);
    await this.storage.setItem(STORAGE_KEYS.userPreferenceMemories, map);
  }
}

let instance: PreferenceMemoryService | null = null;

export function getPreferenceMemoryService(storage: IStorageService) {
  if (!instance) instance = new PreferenceMemoryService(storage);
  return instance;
}
