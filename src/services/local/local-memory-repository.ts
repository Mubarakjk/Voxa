import { STORAGE_KEYS } from '../../constants/storage-keys';
import {
  CreateMemoryInput,
  createId,
  Memory,
  MemoryMood,
  nowIso,
  UpdateMemoryInput,
} from '../../types';
import { IMemoryRepository, IStorageService } from '../contracts';

export class LocalMemoryRepository implements IMemoryRepository {
  constructor(private readonly storage: IStorageService) {}

  private async readAll(): Promise<Memory[]> {
    return (await this.storage.getItem<Memory[]>(STORAGE_KEYS.memories)) ?? [];
  }

  private async writeAll(memories: Memory[]): Promise<void> {
    await this.storage.setItem(STORAGE_KEYS.memories, memories);
  }

  async listMemories(userId: string): Promise<Memory[]> {
    const memories = await this.readAll();
    return memories
      .filter((item) => item.userId === userId)
      .map((item) => ({
        ...item,
        useCount: item.useCount ?? 0,
      }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getMemory(id: string): Promise<Memory | null> {
    const memories = await this.readAll();
    return memories.find((item) => item.id === id) ?? null;
  }

  async createMemory(input: CreateMemoryInput): Promise<Memory> {
    const timestamp = nowIso();
    const memory: Memory = {
      id: createId('memory'),
      userId: input.userId,
      category: input.category,
      title: input.title,
      content: input.content,
      mood: input.mood ?? 'neutral',
      importance: input.importance ?? 3,
      tags: input.tags ?? [],
      source: input.source ?? 'manual',
      relatedMode: input.relatedMode,
      occurredAt: input.occurredAt,
      lastUsedAt: input.lastUsedAt,
      useCount: input.useCount ?? 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const memories = await this.readAll();
    memories.push(memory);
    await this.writeAll(memories);
    return memory;
  }

  async updateMemory(id: string, input: UpdateMemoryInput): Promise<Memory> {
    const memories = await this.readAll();
    const index = memories.findIndex((item) => item.id === id);
    if (index === -1) throw new Error(`Memory not found: ${id}`);

    const updated: Memory = {
      ...memories[index],
      ...input,
      mood: (input.mood ?? memories[index].mood) as MemoryMood,
      updatedAt: nowIso(),
    };
    memories[index] = updated;
    await this.writeAll(memories);
    return updated;
  }

  async deleteMemory(id: string): Promise<void> {
    const memories = await this.readAll();
    await this.writeAll(memories.filter((item) => item.id !== id));
  }

  async clearMemoriesForUser(userId: string): Promise<void> {
    const memories = await this.readAll();
    await this.writeAll(memories.filter((item) => item.userId !== userId));
  }
}
