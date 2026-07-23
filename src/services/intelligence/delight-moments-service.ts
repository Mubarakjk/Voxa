import { STORAGE_KEYS } from '../../constants/storage-keys';
import { CompanionIntelligenceBundle } from '../../types/companion-intelligence';
import { Goal, Memory, nowIso } from '../../types';
import { DelightMoment, DelightMomentKind } from '../../types/phase4-intelligence';
import { IStorageService } from '../contracts';

export class DelightMomentsService {
  constructor(private readonly storage?: IStorageService) {}

  detect(input: {
    bundle: CompanionIntelligenceBundle;
    goals: Goal[];
    memories: Memory[];
    now?: Date;
    shownIds?: string[];
    streakDays?: number;
    bucketCompleted?: boolean;
    dreamAchieved?: boolean;
  }): DelightMoment | null {
    const now = input.now ?? new Date();
    const shown = new Set(input.shownIds ?? []);
    const rel = input.bundle.relationship;
    const candidates: DelightMoment[] = [];

    if (rel.conversationCount === 100) {
      candidates.push(this.moment('conversations_100', '100 conversations', "We've shared 100 conversations. That is rare — and it means something.", true, 95));
    }
    if (rel.conversationCount >= 1000 && rel.conversationCount < 1010) {
      candidates.push(this.moment('conversations_1000', '1000 conversations', 'A thousand conversations. That is a life we have built together.', true, 97));
    }

    if (input.streakDays && input.streakDays >= 100 && input.streakDays < 110) {
      candidates.push(this.moment('milestone', '100-day streak', 'One hundred days of showing up. That discipline is real.', true, 92));
    }

    if (input.bucketCompleted) {
      candidates.push(this.moment('milestone', 'First bucket list item', 'You crossed something off your bucket list. That deserves a moment.', true, 86));
    }

    if (input.dreamAchieved) {
      candidates.push(this.moment('milestone', 'Dream achieved', 'A dream you wrote down became real. I am proud of you.', true, 88));
    }

    const ageDays = Math.floor((now.getTime() - new Date(rel.relationshipStartedAt).getTime()) / 86400000);
    if (ageDays >= 180 && ageDays < 190) {
      candidates.push(this.moment('anniversary', 'Six months together', "We've known each other for six months. I've watched you grow.", true, 90));
    }
    if (ageDays >= 365 && ageDays < 375) {
      candidates.push(this.moment('anniversary', 'One year together', 'One year. I still remember how we started.', true, 98));
    }

    const completedGoal = input.goals.find((g) => g.status === 'completed' || g.progress >= 100);
    if (completedGoal) {
      candidates.push(this.moment('goal_completed', 'Goal completed', `You did it — "${completedGoal.title}". I'm genuinely proud.`, true, 88, completedGoal.title));
    }

    const birthdayMemory = input.memories.find((m) => m.category === 'birthdays');
    if (birthdayMemory && now.getMonth() === new Date(birthdayMemory.occurredAt ?? birthdayMemory.createdAt).getMonth()) {
      candidates.push(this.moment('birthday', 'Birthday', 'Happy birthday — I am glad I get to be here for it.', true, 99, birthdayMemory.title));
    }

    if (rel.milestones.some((m) => m.id === 'hundred_chats') && !shown.has('hundred_chats_delight')) {
      candidates.push(this.moment('milestone', 'A real bond', 'This friendship is becoming something special.', true, 85));
    }

    const fresh = candidates.filter((c) => !shown.has(c.id)).sort((a, b) => b.priority - a.priority);
    return fresh[0] ?? null;
  }

  async markShown(moment: DelightMoment): Promise<void> {
    if (!this.storage) return;
    const shown = (await this.storage.getItem<string[]>(STORAGE_KEYS.delightShown)) ?? [];
    if (!shown.includes(moment.id)) {
      await this.storage.setItem(STORAGE_KEYS.delightShown, [...shown, moment.id]);
    }
  }

  async loadShownIds(): Promise<string[]> {
    if (!this.storage) return [];
    return (await this.storage.getItem<string[]>(STORAGE_KEYS.delightShown)) ?? [];
  }

  private moment(
    kind: DelightMomentKind,
    title: string,
    message: string,
    showConfetti: boolean,
    priority: number,
    memoryCallback?: string,
  ): DelightMoment {
    return {
      id: `${kind}:${nowIso().slice(0, 10)}`,
      kind,
      title,
      message,
      memoryCallback,
      showConfetti,
      priority,
    };
  }
}

let instance: DelightMomentsService | null = null;

export function getDelightMomentsService(storage?: IStorageService) {
  if (!instance || storage) instance = new DelightMomentsService(storage);
  return instance;
}

export const delightMomentsService = new DelightMomentsService();
