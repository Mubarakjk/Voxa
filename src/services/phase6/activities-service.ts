import { STORAGE_KEYS } from '../../constants/storage-keys';
import { createUuid, EntityId, nowIso } from '../../types';
import { ACTIVITY_DEFINITIONS, ActivityDefinition, ActivityId, ActivitySession } from '../../types/phase6-premium';
import { IStorageService } from '../contracts';

export class ActivitiesService {
  constructor(private readonly storage: IStorageService) {}

  listDefinitions(): ActivityDefinition[] {
    return ACTIVITY_DEFINITIONS;
  }

  getDefinition(id: ActivityId): ActivityDefinition | undefined {
    return ACTIVITY_DEFINITIONS.find((a) => a.id === id);
  }

  async listSessions(userId: EntityId): Promise<ActivitySession[]> {
    const map = (await this.storage.getItem<Record<string, ActivitySession[]>>(STORAGE_KEYS.activitySessions)) ?? {};
    return (map[userId] ?? []).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }

  async start(userId: EntityId, activityId: ActivityId): Promise<ActivitySession> {
    const def = this.getDefinition(activityId);
    if (!def) throw new Error('Unknown activity');
    const session: ActivitySession = {
      id: createUuid(),
      userId,
      activityId,
      title: def.title,
      startedAt: nowIso(),
      favourite: false,
      status: 'active',
    };
    const items = await this.listSessions(userId);
    await this.save(userId, [session, ...items]);
    return session;
  }

  async complete(userId: EntityId, sessionId: EntityId, summary?: string): Promise<ActivitySession | null> {
    const items = await this.listSessions(userId);
    const idx = items.findIndex((s) => s.id === sessionId);
    if (idx < 0) return null;
    items[idx] = { ...items[idx], status: 'completed', completedAt: nowIso(), summary };
    await this.save(userId, items);
    return items[idx];
  }

  async abandon(userId: EntityId, sessionId: EntityId): Promise<void> {
    const items = await this.listSessions(userId);
    const next = items.map((s) => (s.id === sessionId ? { ...s, status: 'abandoned' as const } : s));
    await this.save(userId, next);
  }

  async toggleFavourite(userId: EntityId, sessionId: EntityId): Promise<void> {
    const items = await this.listSessions(userId);
    const next = items.map((s) => (s.id === sessionId ? { ...s, favourite: !s.favourite } : s));
    await this.save(userId, next);
  }

  async getFavourites(userId: EntityId): Promise<ActivityDefinition[]> {
    const sessions = (await this.listSessions(userId)).filter((s) => s.favourite);
    const ids = new Set(sessions.map((s) => s.activityId));
    return ACTIVITY_DEFINITIONS.filter((d) => ids.has(d.id));
  }

  private async save(userId: EntityId, items: ActivitySession[]): Promise<void> {
    const map = (await this.storage.getItem<Record<string, ActivitySession[]>>(STORAGE_KEYS.activitySessions)) ?? {};
    map[userId] = items.slice(0, 50);
    await this.storage.setItem(STORAGE_KEYS.activitySessions, map);
  }
}

let instance: ActivitiesService | null = null;

export function getActivitiesService(storage: IStorageService): ActivitiesService {
  if (!instance) instance = new ActivitiesService(storage);
  return instance;
}
