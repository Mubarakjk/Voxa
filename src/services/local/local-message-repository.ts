import { STORAGE_KEYS } from '../../constants/storage-keys';
import { CreateMessageInput, createId, Message, nowIso } from '../../types';
import { IMessageRepository, IStorageService } from '../contracts';

export class LocalMessageRepository implements IMessageRepository {
  constructor(private readonly storage: IStorageService) {}

  private async readAll(): Promise<Message[]> {
    return (await this.storage.getItem<Message[]>(STORAGE_KEYS.messages)) ?? [];
  }

  private async writeAll(messages: Message[]): Promise<void> {
    await this.storage.setItem(STORAGE_KEYS.messages, messages);
  }

  async listMessages(conversationId: string): Promise<Message[]> {
    const messages = await this.readAll();
    return messages
      .filter((item) => item.conversationId === conversationId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async createMessage(input: CreateMessageInput): Promise<Message> {
    const message: Message = {
      id: createId('message'),
      conversationId: input.conversationId,
      role: input.role,
      content: input.content,
      mode: input.mode,
      createdAt: nowIso(),
      status: input.status ?? 'sent',
      metadata: input.metadata,
    };

    const messages = await this.readAll();
    messages.push(message);
    await this.writeAll(messages);
    return message;
  }

  async deleteMessagesForConversation(conversationId: string): Promise<void> {
    const messages = await this.readAll();
    await this.writeAll(messages.filter((item) => item.conversationId !== conversationId));
  }
}
