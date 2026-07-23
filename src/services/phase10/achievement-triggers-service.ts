import { EntityId } from '../../types';
import { AchievementId } from '../../types/phase10-play';
import { IStorageService } from '../contracts';
import { getAchievementService } from './achievement-service';
import { getPlayHistoryService } from './play-history-service';

export class AchievementTriggersService {
  constructor(private readonly storage: IStorageService) {}

  private async unlock(userId: EntityId, id: AchievementId, historyTitle?: string) {
    const a = await getAchievementService(this.storage).unlock(userId, id);
    if (a && historyTitle) {
      await getPlayHistoryService(this.storage).append(userId, {
        kind: 'achievement',
        title: historyTitle,
        detail: a.title,
      });
    }
    return a;
  }

  onVoiceNoteSaved(userId: EntityId) {
    return this.unlock(userId, 'first_voice_note', 'First voice note');
  }

  onMemorySaved(userId: EntityId) {
    return this.unlock(userId, 'first_memory', 'First memory saved');
  }

  onRoutineCompleted(userId: EntityId) {
    return this.unlock(userId, 'first_routine', 'First routine done');
  }

  onChallengeComplete(userId: EntityId) {
    return this.unlock(userId, 'first_challenge', 'First challenge complete');
  }

  onMissionComplete(userId: EntityId) {
    return this.unlock(userId, 'first_mission', 'First mission complete');
  }

  onFutureSelfSaved(userId: EntityId) {
    return this.unlock(userId, 'first_future_self', 'Future Self started');
  }

  onBucketItemComplete(userId: EntityId) {
    void this.unlock(userId, 'first_bucket_item', 'Bucket list item done');
    return this.unlock(userId, 'bucket_complete', 'Bucket list hero');
  }

  onLifeBookChapter(userId: EntityId) {
    return this.unlock(userId, 'first_life_book_chapter', 'Life Book chapter');
  }
}

let instance: AchievementTriggersService | null = null;

export function getAchievementTriggersService(storage: IStorageService) {
  if (!instance) instance = new AchievementTriggersService(storage);
  return instance;
}
