import { STORAGE_KEYS } from '../../constants/storage-keys';
import { EntityId, nowIso } from '../../types';
import { ConversationStylePreference } from '../../types/phase9-intelligence';
import { IStorageService } from '../contracts';

const DEFAULT_STYLE: ConversationStylePreference = {
  prefersBullets: false,
  prefersShort: false,
  prefersDeep: false,
  prefersHumour: false,
  prefersExamples: false,
  prefersStepByStep: false,
  updatedAt: nowIso(),
};

export function inferStyleFromUserMessage(text: string, current: ConversationStylePreference): ConversationStylePreference {
  const lower = text.toLowerCase();
  const next = { ...current, updatedAt: nowIso() };

  if (/\b(bullet|list|steps|numbered)\b/i.test(lower)) next.prefersBullets = true;
  if (/\b(short|brief|quick|tldr)\b/i.test(lower)) next.prefersShort = true;
  if (/\b(deep|detail|explain more|elaborate)\b/i.test(lower)) next.prefersDeep = true;
  if (/\b(funny|joke|lighten)\b/i.test(lower)) next.prefersHumour = true;
  if (/\b(example|for instance|like what)\b/i.test(lower)) next.prefersExamples = true;
  if (/\b(step by step|one at a time|walk me through)\b/i.test(lower)) next.prefersStepByStep = true;

  return next;
}

export class ConversationStyleMemoryService {
  constructor(private readonly storage: IStorageService) {}

  async get(userId: EntityId): Promise<ConversationStylePreference> {
    const map = (await this.storage.getItem<Record<string, ConversationStylePreference>>(STORAGE_KEYS.conversationStylePrefs)) ?? {};
    return map[userId] ?? DEFAULT_STYLE;
  }

  async updateFromMessage(userId: EntityId, text: string): Promise<ConversationStylePreference> {
    const current = await this.get(userId);
    const next = inferStyleFromUserMessage(text, current);
    const map = (await this.storage.getItem<Record<string, ConversationStylePreference>>(STORAGE_KEYS.conversationStylePrefs)) ?? {};
    map[userId] = next;
    await this.storage.setItem(STORAGE_KEYS.conversationStylePrefs, map);
    return next;
  }
}

let instance: ConversationStyleMemoryService | null = null;

export function getConversationStyleMemoryService(storage: IStorageService) {
  if (!instance) instance = new ConversationStyleMemoryService(storage);
  return instance;
}
