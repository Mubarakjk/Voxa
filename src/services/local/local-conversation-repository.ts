import { STORAGE_KEYS } from '../../constants/storage-keys';
import {
  Conversation,
  CreateConversationInput,
  createId,
  nowIso,
  UpdateConversationInput,
} from '../../types';
import { IConversationRepository, IStorageService } from '../contracts';

export class LocalConversationRepository implements IConversationRepository {
  constructor(private readonly storage: IStorageService) {}

  private async readAll(): Promise<Conversation[]> {
    return (await this.storage.getItem<Conversation[]>(STORAGE_KEYS.conversations)) ?? [];
  }

  private async writeAll(conversations: Conversation[]): Promise<void> {
    await this.storage.setItem(STORAGE_KEYS.conversations, conversations);
  }

  async listConversations(userId: string): Promise<Conversation[]> {
    const conversations = await this.readAll();
    return conversations
      .filter((item) => item.userId === userId)
      .sort((a, b) => (b.lastMessageAt ?? b.createdAt).localeCompare(a.lastMessageAt ?? a.createdAt));
  }

  async getConversation(id: string): Promise<Conversation | null> {
    const conversations = await this.readAll();
    return conversations.find((item) => item.id === id) ?? null;
  }

  async createConversation(input: CreateConversationInput): Promise<Conversation> {
    const timestamp = nowIso();
    const conversation: Conversation = {
      id: createId('conversation'),
      userId: input.userId,
      mode: input.mode,
      channel: input.channel,
      title: input.title,
      status: 'active',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const conversations = await this.readAll();
    conversations.push(conversation);
    await this.writeAll(conversations);
    return conversation;
  }

  async updateConversation(id: string, input: UpdateConversationInput): Promise<Conversation> {
    const conversations = await this.readAll();
    const index = conversations.findIndex((item) => item.id === id);
    if (index === -1) throw new Error(`Conversation not found: ${id}`);

    const updated: Conversation = {
      ...conversations[index],
      ...input,
      updatedAt: nowIso(),
    };
    conversations[index] = updated;
    await this.writeAll(conversations);
    return updated;
  }

  async deleteConversation(id: string): Promise<void> {
    const conversations = await this.readAll();
    await this.writeAll(conversations.filter((item) => item.id !== id));
  }
}
