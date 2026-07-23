import { STORAGE_KEYS } from '../../constants/storage-keys';
import { createUuid, EntityId, nowIso } from '../../types';
import { WorkspaceSession, WorkspaceTopic } from '../../types/phase8-retention';
import { IStorageService } from '../contracts';

const TOPIC_PATTERNS: Array<{ topic: WorkspaceTopic; pattern: RegExp }> = [
  { topic: 'business', pattern: /\b(business|startup|company|revenue|client)\b/i },
  { topic: 'study', pattern: /\b(study|exam|university|lecture|homework)\b/i },
  { topic: 'fitness', pattern: /\b(gym|workout|fitness|run|exercise)\b/i },
  { topic: 'travel', pattern: /\b(travel|trip|flight|holiday|itinerary)\b/i },
  { topic: 'coding', pattern: /\b(code|coding|programming|debug|typescript|react)\b/i },
];

export function detectWorkspaceTopic(text: string): WorkspaceTopic | null {
  for (const { topic, pattern } of TOPIC_PATTERNS) {
    if (pattern.test(text)) return topic;
  }
  return null;
}

export class WorkspaceSessionsService {
  constructor(private readonly storage: IStorageService) {}

  async list(userId: EntityId): Promise<WorkspaceSession[]> {
    const map = (await this.storage.getItem<Record<string, WorkspaceSession[]>>(STORAGE_KEYS.workspaceSessions)) ?? {};
    return (map[userId] ?? []).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getForConversation(userId: EntityId, conversationId: EntityId): Promise<WorkspaceSession | null> {
    return (await this.list(userId)).find((s) => s.conversationId === conversationId && !s.progress.includes('archived')) ?? null;
  }

  async upsertFromExchange(input: {
    userId: EntityId;
    conversationId: EntityId;
    userMessage: string;
    voxaReply: string;
  }): Promise<WorkspaceSession | null> {
    const topic = detectWorkspaceTopic(input.userMessage);
    if (!topic) return null;

    const items = await this.list(input.userId);
    const existing = items.find((s) => s.conversationId === input.conversationId);
    const idea = input.userMessage.length > 20 ? input.userMessage.slice(0, 100) : null;
    const note = input.voxaReply.length > 30 ? input.voxaReply.slice(0, 120) : null;

    if (existing) {
      const updated: WorkspaceSession = {
        ...existing,
        notes: note ? [...existing.notes.slice(-8), note] : existing.notes,
        ideas: idea ? [...existing.ideas.slice(-8), idea] : existing.ideas,
        updatedAt: nowIso(),
      };
      await this.save(input.userId, items.map((s) => (s.id === updated.id ? updated : s)));
      return updated;
    }

    const session: WorkspaceSession = {
      id: createUuid(),
      userId: input.userId,
      conversationId: input.conversationId,
      topic,
      title: `${topic.charAt(0).toUpperCase()}${topic.slice(1)} workspace`,
      notes: note ? [note] : [],
      tasks: [],
      ideas: idea ? [idea] : [],
      progress: [],
      startedAt: nowIso(),
      updatedAt: nowIso(),
    };
    await this.save(input.userId, [session, ...items]);
    return session;
  }

  private async save(userId: EntityId, items: WorkspaceSession[]) {
    const map = (await this.storage.getItem<Record<string, WorkspaceSession[]>>(STORAGE_KEYS.workspaceSessions)) ?? {};
    map[userId] = items.slice(0, 30);
    await this.storage.setItem(STORAGE_KEYS.workspaceSessions, map);
  }
}

let instance: WorkspaceSessionsService | null = null;

export function getWorkspaceSessionsService(storage: IStorageService) {
  if (!instance) instance = new WorkspaceSessionsService(storage);
  return instance;
}
