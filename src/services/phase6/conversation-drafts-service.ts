import { STORAGE_KEYS } from '../../constants/storage-keys';
import { EntityId, nowIso } from '../../types';
import { ConversationDraft } from '../../types/phase6-premium';
import { IStorageService } from '../contracts';

export class ConversationDraftsService {
  constructor(private readonly storage: IStorageService) {}

  async get(userId: EntityId, conversationId: EntityId): Promise<string> {
    const map = (await this.storage.getItem<Record<string, Record<string, ConversationDraft>>>(STORAGE_KEYS.conversationDrafts)) ?? {};
    return map[userId]?.[conversationId]?.text ?? '';
  }

  async save(userId: EntityId, conversationId: EntityId, text: string): Promise<void> {
    const map = (await this.storage.getItem<Record<string, Record<string, ConversationDraft>>>(STORAGE_KEYS.conversationDrafts)) ?? {};
    if (!map[userId]) map[userId] = {};
    if (!text.trim()) {
      delete map[userId][conversationId];
    } else {
      map[userId][conversationId] = { conversationId, userId, text, updatedAt: nowIso() };
    }
    await this.storage.setItem(STORAGE_KEYS.conversationDrafts, map);
  }

  async clear(userId: EntityId, conversationId: EntityId): Promise<void> {
    await this.save(userId, conversationId, '');
  }
}

let instance: ConversationDraftsService | null = null;

export function getConversationDraftsService(storage: IStorageService): ConversationDraftsService {
  if (!instance) instance = new ConversationDraftsService(storage);
  return instance;
}
