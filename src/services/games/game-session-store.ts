import { STORAGE_KEYS } from '../../constants/storage-keys';
import { createUuid, EntityId, nowIso } from '../../types';
import {
  GameSessionStatus,
  PersistedGameSession,
  SocialGameId,
} from '../../types/social-games';
import { IStorageService } from '../contracts';

type SessionMap = Record<string, PersistedGameSession<unknown>[]>;

/**
 * Persists active social-game rounds so pause / background / resume works.
 * One active session per gameId per user (older actives are finished on save).
 */
export class GameSessionStore {
  constructor(private readonly storage: IStorageService) {}

  async list(userId: EntityId): Promise<PersistedGameSession<unknown>[]> {
    const map = (await this.storage.getItem<SessionMap>(STORAGE_KEYS.socialGameSessions)) ?? {};
    return map[userId] ?? [];
  }

  async getActive<T>(userId: EntityId, gameId: SocialGameId): Promise<PersistedGameSession<T> | null> {
    const sessions = await this.list(userId);
    const found = sessions.find((s) => s.gameId === gameId && (s.status === 'active' || s.status === 'paused'));
    return (found as PersistedGameSession<T> | undefined) ?? null;
  }

  async getById<T>(userId: EntityId, sessionId: string): Promise<PersistedGameSession<T> | null> {
    const sessions = await this.list(userId);
    return (sessions.find((s) => s.id === sessionId) as PersistedGameSession<T> | undefined) ?? null;
  }

  async create<T>(userId: EntityId, gameId: SocialGameId, payload: T): Promise<PersistedGameSession<T>> {
    const map = (await this.storage.getItem<SessionMap>(STORAGE_KEYS.socialGameSessions)) ?? {};
    const existing = map[userId] ?? [];
    const stamped = nowIso();
    const finishedOld = existing.map((s) =>
      s.gameId === gameId && (s.status === 'active' || s.status === 'paused')
        ? { ...s, status: 'finished' as GameSessionStatus, updatedAt: stamped }
        : s,
    );
    const session: PersistedGameSession<T> = {
      id: createUuid(),
      userId,
      gameId,
      status: 'active',
      createdAt: stamped,
      updatedAt: stamped,
      payload,
    };
    map[userId] = [session as PersistedGameSession<unknown>, ...finishedOld].slice(0, 40);
    await this.storage.setItem(STORAGE_KEYS.socialGameSessions, map);
    return session;
  }

  async updatePayload<T>(userId: EntityId, sessionId: string, payload: T): Promise<PersistedGameSession<T> | null> {
    const map = (await this.storage.getItem<SessionMap>(STORAGE_KEYS.socialGameSessions)) ?? {};
    const list = map[userId] ?? [];
    const idx = list.findIndex((s) => s.id === sessionId);
    if (idx < 0) return null;
    const next = {
      ...list[idx],
      payload,
      updatedAt: nowIso(),
    } as PersistedGameSession<T>;
    list[idx] = next as PersistedGameSession<unknown>;
    map[userId] = list;
    await this.storage.setItem(STORAGE_KEYS.socialGameSessions, map);
    return next;
  }

  async setStatus(userId: EntityId, sessionId: string, status: GameSessionStatus): Promise<void> {
    const map = (await this.storage.getItem<SessionMap>(STORAGE_KEYS.socialGameSessions)) ?? {};
    const list = map[userId] ?? [];
    const idx = list.findIndex((s) => s.id === sessionId);
    if (idx < 0) return;
    list[idx] = { ...list[idx], status, updatedAt: nowIso() };
    map[userId] = list;
    await this.storage.setItem(STORAGE_KEYS.socialGameSessions, map);
  }

  async finish(userId: EntityId, sessionId: string): Promise<void> {
    await this.setStatus(userId, sessionId, 'finished');
  }

  async pause(userId: EntityId, sessionId: string): Promise<void> {
    await this.setStatus(userId, sessionId, 'paused');
  }

  async resume(userId: EntityId, sessionId: string): Promise<void> {
    await this.setStatus(userId, sessionId, 'active');
  }

  /** Upsert active payload for a game (finishes prior actives). */
  async save<T>(userId: EntityId, gameId: SocialGameId, payload: T): Promise<PersistedGameSession<T>> {
    const active = await this.getActive<T>(userId, gameId);
    if (active) {
      const updated = await this.updatePayload(userId, active.id, payload);
      return updated ?? this.create(userId, gameId, payload);
    }
    return this.create(userId, gameId, payload);
  }

  async clear(userId: EntityId, gameId: SocialGameId): Promise<void> {
    const active = await this.getActive(userId, gameId);
    if (active) await this.finish(userId, active.id);
  }
}

let storeInstance: GameSessionStore | null = null;

export function getGameSessionStore(storage: IStorageService): GameSessionStore {
  if (!storeInstance) storeInstance = new GameSessionStore(storage);
  return storeInstance;
}
