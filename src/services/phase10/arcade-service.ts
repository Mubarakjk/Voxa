import { STORAGE_KEYS } from '../../constants/storage-keys';
import { createUuid, EntityId, nowIso } from '../../types';
import { ArcadeGameId, ArcadeGameStats, ArcadeGameSession } from '../../types/phase10-play';
import { IStorageService } from '../contracts';
import { getCelebrationService } from './celebration-service';
import { getEnjoymentTrackingService } from './enjoyment-tracking-service';
import { getArcadeGame } from './arcade-games';
import { getPlayHistoryService } from './play-history-service';
import { getXpService } from './xp-service';

export class ArcadeService {
  constructor(private readonly storage: IStorageService) {}

  async getStats(userId: EntityId): Promise<Partial<Record<ArcadeGameId, ArcadeGameStats>>> {
    const map = (await this.storage.getItem<Record<string, Partial<Record<ArcadeGameId, ArcadeGameStats>>>>(STORAGE_KEYS.arcadeStats)) ?? {};
    return map[userId] ?? {};
  }

  async startSession(userId: EntityId, gameId: ArcadeGameId): Promise<ArcadeGameSession> {
    const session: ArcadeGameSession = {
      id: createUuid(),
      userId,
      gameId,
      startedAt: nowIso(),
      score: 0,
      won: false,
    };
    const map = (await this.storage.getItem<Record<string, ArcadeGameSession[]>>(STORAGE_KEYS.arcadeSessions)) ?? {};
    map[userId] = [session, ...(map[userId] ?? [])].slice(0, 50);
    await this.storage.setItem(STORAGE_KEYS.arcadeSessions, map);
    return session;
  }

  async getSession(userId: EntityId, sessionId: EntityId): Promise<ArcadeGameSession | null> {
    const map = (await this.storage.getItem<Record<string, ArcadeGameSession[]>>(STORAGE_KEYS.arcadeSessions)) ?? {};
    return (map[userId] ?? []).find((s) => s.id === sessionId) ?? null;
  }

  async finishSession(
    userId: EntityId,
    sessionId: EntityId,
    input: { won: boolean; score: number },
  ): Promise<{ session: ArcadeGameSession; stats: ArcadeGameStats; xpAwarded: number; newHighScore: boolean } | null> {
    const map = (await this.storage.getItem<Record<string, ArcadeGameSession[]>>(STORAGE_KEYS.arcadeSessions)) ?? {};
    const sessions = map[userId] ?? [];
    const idx = sessions.findIndex((s) => s.id === sessionId);
    if (idx < 0) return null;

    const session = sessions[idx];
    if (session.completedAt) {
      const stats = (await this.getStats(userId))[session.gameId];
      return stats ? { session, stats, xpAwarded: 0, newHighScore: false } : null;
    }

    const game = getArcadeGame(session.gameId);
    const xpAmount = input.won ? (game?.xpReward ?? 25) : Math.max(10, Math.floor((game?.xpReward ?? 20) / 2));
    const refId = `arcade:${session.id}`;
    const award = await getXpService(this.storage).award(userId, xpAmount, 'game', refId);

    const completed: ArcadeGameSession = {
      ...session,
      completedAt: nowIso(),
      score: input.score,
      won: input.won,
      xpAwarded: true,
      xpTransactionId: award.transaction.id,
    };
    sessions[idx] = completed;
    map[userId] = sessions;
    await this.storage.setItem(STORAGE_KEYS.arcadeSessions, map);

    const stats = await this.recordPlayStats(userId, session.gameId, input.won, input.score);
    const newHighScore = stats.bestScore === input.score && input.score > 0;

    await getEnjoymentTrackingService(this.storage).recordGame(userId, session.gameId);
    await getPlayHistoryService(this.storage).append(userId, {
      kind: 'game',
      title: game?.title ?? session.gameId,
      detail: input.won ? `Win · +${xpAmount} XP` : `Played · +${xpAmount} XP`,
    });

    if (newHighScore) {
      void getCelebrationService(this.storage).showIfNew(userId, {
        kind: 'game_high_score',
        eventKey: `game_high_score:${session.gameId}:${input.score}`,
        title: 'New high score',
        subtitle: game?.title,
        emoji: game?.emoji ?? '🎮',
        amount: input.score,
      });
    }

    return { session: completed, stats, xpAwarded: xpAmount, newHighScore };
  }

  private async recordPlayStats(userId: EntityId, gameId: ArcadeGameId, won: boolean, score: number): Promise<ArcadeGameStats> {
    const all = await this.getStats(userId);
    const prev = all[gameId] ?? { gameId, wins: 0, streak: 0, gamesPlayed: 0, bestScore: 0 };
    const today = new Date().toISOString().slice(0, 10);
    const lastDay = prev.lastPlayedAt?.slice(0, 10);
    const streak = won ? (lastDay === today || !lastDay ? prev.streak + 1 : 1) : 0;

    const next: ArcadeGameStats = {
      gameId,
      wins: prev.wins + (won ? 1 : 0),
      streak,
      gamesPlayed: prev.gamesPlayed + 1,
      bestScore: Math.max(prev.bestScore, score),
      lastPlayedAt: nowIso(),
    };

    const map = (await this.storage.getItem<Record<string, Partial<Record<ArcadeGameId, ArcadeGameStats>>>>(STORAGE_KEYS.arcadeStats)) ?? {};
    map[userId] = { ...all, [gameId]: next };
    await this.storage.setItem(STORAGE_KEYS.arcadeStats, map);
    return next;
  }

  async listRecentSessions(userId: EntityId, limit = 5): Promise<ArcadeGameSession[]> {
    const map = (await this.storage.getItem<Record<string, ArcadeGameSession[]>>(STORAGE_KEYS.arcadeSessions)) ?? {};
    return (map[userId] ?? []).slice(0, limit);
  }
}

let instance: ArcadeService | null = null;

export function getArcadeService(storage: IStorageService) {
  if (!instance) instance = new ArcadeService(storage);
  return instance;
}
