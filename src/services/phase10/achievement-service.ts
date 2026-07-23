import { STORAGE_KEYS } from '../../constants/storage-keys';
import { createUuid, EntityId, nowIso } from '../../types';
import { Achievement, AchievementId } from '../../types/phase10-play';
import { IStorageService } from '../contracts';
import { getCelebrationService } from './celebration-service';

export const ACHIEVEMENT_CATALOG: Achievement[] = [
  { id: 'first_voice_note', title: 'First voice note', description: 'Saved your first voice note.', emoji: '🎙️', rarity: 'common' },
  { id: 'first_memory', title: 'First memory', description: 'Saved your first memory.', emoji: '💜', rarity: 'common' },
  { id: 'first_routine', title: 'First routine', description: 'Completed your first routine block.', emoji: '✅', rarity: 'common' },
  { id: 'first_challenge', title: 'First challenge', description: 'Completed your first daily challenge.', emoji: '🎯', rarity: 'common' },
  { id: 'first_mission', title: 'First mission', description: 'Completed your first weekly mission.', emoji: '🛡️', rarity: 'common' },
  { id: 'first_future_self', title: 'Future Self started', description: 'Created your Future Self profile.', emoji: '✨', rarity: 'common' },
  { id: 'first_bucket_item', title: 'Bucket list win', description: 'Completed a bucket list item.', emoji: '🪣', rarity: 'rare' },
  { id: 'first_life_book_chapter', title: 'Life Book chapter', description: 'Added your first Life Book chapter.', emoji: '📖', rarity: 'common' },
  { id: 'chats_100', title: '100 chats', description: 'A hundred conversations together.', emoji: '💬', rarity: 'common' },
  { id: 'chats_1000', title: '1000 chats', description: 'A thousand moments shared.', emoji: '🌟', rarity: 'legendary' },
  { id: 'streak_7', title: '7 day streak', description: 'Seven days of showing up.', emoji: '🔥', rarity: 'common' },
  { id: 'streak_30', title: '30 day streak', description: 'Thirty days of showing up.', emoji: '🔥', rarity: 'rare' },
  { id: 'future_self_done', title: 'Future Self', description: 'Completed your Future Self journey.', emoji: '✨', rarity: 'rare' },
  { id: 'bucket_complete', title: 'Bucket list hero', description: 'Finished a bucket list item.', emoji: '🪣', rarity: 'rare' },
  { id: 'memories_100', title: '100 memories', description: 'A rich library of moments.', emoji: '💜', rarity: 'rare' },
  { id: 'startup_milestone', title: 'Startup milestone', description: 'Moved a startup goal forward.', emoji: '🚀', rarity: 'common' },
  { id: 'fitness_milestone', title: 'Fitness milestone', description: 'Consistency in movement.', emoji: '💪', rarity: 'common' },
  { id: 'journal_streak', title: 'Journal streak', description: 'Seven days of journaling.', emoji: '📓', rarity: 'common' },
  { id: 'challenge_streak', title: 'Challenge streak', description: 'Five daily challenges completed.', emoji: '🎯', rarity: 'rare' },
  { id: 'arcade_master', title: 'Arcade master', description: 'Played ten different games.', emoji: '🎮', rarity: 'rare' },
  { id: 'level_10', title: 'Level 10', description: 'Reached level ten.', emoji: '⭐', rarity: 'common' },
  { id: 'level_25', title: 'Level 25', description: 'Reached level twenty-five.', emoji: '🏆', rarity: 'legendary' },
  { id: 'mission_complete', title: 'Mission complete', description: 'Finished a weekly mission.', emoji: '🛡️', rarity: 'rare' },
  { id: 'seasonal_participant', title: 'Seasonal spirit', description: 'Joined a seasonal moment.', emoji: '🎉', rarity: 'common' },
];

export class AchievementService {
  constructor(private readonly storage: IStorageService) {}

  async getUnlocked(userId: EntityId): Promise<Partial<Record<AchievementId, string>>> {
    const map = (await this.storage.getItem<Record<string, Partial<Record<AchievementId, string>>>>(STORAGE_KEYS.achievements)) ?? {};
    return map[userId] ?? {};
  }

  async unlock(userId: EntityId, id: AchievementId): Promise<Achievement | null> {
    const unlocked = await this.getUnlocked(userId);
    if (unlocked[id]) return null;
    const map = (await this.storage.getItem<Record<string, Partial<Record<AchievementId, string>>>>(STORAGE_KEYS.achievements)) ?? {};
    map[userId] = { ...unlocked, [id]: nowIso() };
    await this.storage.setItem(STORAGE_KEYS.achievements, map);
    const achievement = ACHIEVEMENT_CATALOG.find((a) => a.id === id);
    if (!achievement) return null;

    const celebration = getCelebrationService(this.storage);
    void celebration.showIfNew(userId, {
      kind: 'achievement',
      eventKey: `achievement:${id}`,
      title: 'Achievement unlocked',
      subtitle: achievement.title,
      emoji: achievement.emoji,
    });

    return achievement;
  }

  async listWithStatus(userId: EntityId): Promise<Achievement[]> {
    const unlocked = await this.getUnlocked(userId);
    return ACHIEVEMENT_CATALOG.map((a) => ({
      ...a,
      unlockedAt: unlocked[a.id],
    }));
  }

  async evaluate(input: {
    userId: EntityId;
    messageCount: number;
    memoryCount: number;
    streakDays: number;
    level: number;
    gamesPlayed: number;
    missionComplete: boolean;
    seasonalActive: boolean;
    challengeStreak: number;
  }): Promise<Achievement[]> {
    const newly: Achievement[] = [];
    const tryUnlock = async (id: AchievementId) => {
      const a = await this.unlock(input.userId, id);
      if (a) newly.push({ ...a, unlockedAt: nowIso() });
    };

    if (input.messageCount >= 100) await tryUnlock('chats_100');
    if (input.messageCount >= 1000) await tryUnlock('chats_1000');
    if (input.streakDays >= 7) await tryUnlock('streak_7');
    if (input.streakDays >= 30) await tryUnlock('streak_30');
    if (input.memoryCount >= 100) await tryUnlock('memories_100');
    if (input.level >= 10) await tryUnlock('level_10');
    if (input.level >= 25) await tryUnlock('level_25');
    if (input.gamesPlayed >= 10) await tryUnlock('arcade_master');
    if (input.missionComplete) await tryUnlock('mission_complete');
    if (input.seasonalActive) await tryUnlock('seasonal_participant');
    if (input.challengeStreak >= 5) await tryUnlock('challenge_streak');

    return newly;
  }
}

let instance: AchievementService | null = null;

export function getAchievementService(storage: IStorageService) {
  if (!instance) instance = new AchievementService(storage);
  return instance;
}
