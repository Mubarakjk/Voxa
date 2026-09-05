import { STORAGE_KEYS } from '../../constants/storage-keys';
import { CreateMessageInput, createId, Message, nowIso, UpdateMessageInput } from '../../types';
import { asArray } from '../../utils/as-array';
import { IMessageRepository, IStorageService } from '../contracts';

export class LocalMessageRepository implements IMessageRepository {
  constructor(private readonly storage: IStorageService) {}

  private async readAll(): Promise<Message[]> {
    return asArray(await this.storage.getItem<Message[]>(STORAGE_KEYS.messages));
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
      id: input.id ?? createId('message'),
      conversationId: input.conversationId,
      role: input.role,
      content: input.content,
      mode: input.mode,
      createdAt: nowIso(),
      status: input.status ?? 'sent',
      metadata: input.metadata,
      attachments: input.attachments ?? [],
    };

    const messages = await this.readAll();
    const index = messages.findIndex((item) => item.id === message.id);
    if (index >= 0) messages[index] = message;
    else messages.push(message);
    await this.writeAll(messages);
    return message;
  }

  async upsertMessage(message: Message): Promise<Message> {
    const messages = await this.readAll();
    const index = messages.findIndex((item) => item.id === message.id);
    if (index >= 0) messages[index] = message;
    else messages.push(message);
    await this.writeAll(messages);
    return message;
  }

  async updateMessage(id: string, input: UpdateMessageInput): Promise<Message> {
    const messages = await this.readAll();
    const index = messages.findIndex((item) => item.id === id);
    if (index < 0) throw new Error('Message not found');

    const updated: Message = {
      ...messages[index],
      ...input,
      attachments: input.attachments ?? messages[index].attachments,
    };
    messages[index] = updated;
    await this.writeAll(messages);
    return updated;
  }

  async deleteMessagesForConversation(conversationId: string): Promise<void> {
    const messages = await this.readAll();
    await this.writeAll(messages.filter((item) => item.conversationId !== conversationId));
  }

  async deleteMessage(id: string): Promise<void> {
    const messages = await this.readAll();
    await this.writeAll(messages.filter((item) => item.id !== id));
  }
}
