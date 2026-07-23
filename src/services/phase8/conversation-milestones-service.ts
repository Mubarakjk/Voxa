import { STORAGE_KEYS } from '../../constants/storage-keys';
import { CompanionIntelligenceBundle } from '../../types/companion-intelligence';
import { Goal, Memory } from '../../types';
import { ConversationMilestone, ConversationMilestoneKind } from '../../types/phase8-retention';
import { TodayRoutineSummary } from '../../types/routine';
import { IStorageService } from '../contracts';

export function detectConversationMilestone(input: {
  bundle: CompanionIntelligenceBundle;
  memories: Memory[];
  goals: Goal[];
  routine: TodayRoutineSummary;
  shownIds?: string[];
}): ConversationMilestone | null {
  const shown = new Set(input.shownIds ?? []);
  const rel = input.bundle.relationship;
  const candidates: ConversationMilestone[] = [];

  const ageDays = Math.floor((Date.now() - new Date(rel.relationshipStartedAt).getTime()) / 86400000);

  if (rel.conversationCount >= 100 && rel.conversationCount < 110) {
    candidates.push(milestone('chats_100', '100 conversations', 'A hundred chats. That is real.', true, 90));
  }
  if (rel.conversationCount >= 500 && rel.conversationCount < 520) {
    candidates.push(milestone('chats_500', '500 conversations', 'Five hundred conversations together.', true, 92));
  }
  if (rel.conversationCount >= 1000 && rel.conversationCount < 1020) {
    candidates.push(milestone('chats_1000', '1000 conversations', 'A thousand conversations. Remarkable.', true, 95));
  }
  if (ageDays >= 30 && ageDays < 37) {
    candidates.push(milestone('month_1', 'One month together', 'One month of showing up.', true, 88));
  }
  if (ageDays >= 180 && ageDays < 190) {
    candidates.push(milestone('month_6', 'Six months together', 'Half a year. I have watched you grow.', true, 93));
  }
  if (ageDays >= 365 && ageDays < 375) {
    candidates.push(milestone('year_1', 'One year together', 'One year. Still here with you.', true, 98));
  }
  if (rel.sharedMemoryCount >= 100 && rel.sharedMemoryCount < 108) {
    candidates.push(milestone('memories_100', '100 memories', 'A hundred shared memories.', true, 87));
  }
  if (rel.goalsAchievedTogether >= 50 && rel.goalsAchievedTogether < 55) {
    candidates.push(milestone('goals_50', '50 goals', 'Fifty goals achieved together.', true, 86));
  }
  if (input.routine.streakDays >= 100 && input.routine.streakDays < 110) {
    candidates.push(milestone('routines_100', '100 routine days', 'A hundred days of routine consistency.', true, 89));
  }

  const fresh = candidates.filter((c) => !shown.has(c.id));
  return fresh.sort((a, b) => (b.showConfetti ? 1 : 0) - (a.showConfetti ? 1 : 0))[0] ?? null;
}

function milestone(
  kind: ConversationMilestoneKind,
  title: string,
  message: string,
  showConfetti: boolean,
  _priority: number,
): ConversationMilestone {
  return { id: `${kind}:${new Date().toISOString().slice(0, 7)}`, kind, title, message, showConfetti };
}

export class ConversationMilestonesService {
  constructor(private readonly storage?: IStorageService) {}

  async loadShownIds(): Promise<string[]> {
    if (!this.storage) return [];
    return (await this.storage.getItem<string[]>(STORAGE_KEYS.conversationMilestonesShown)) ?? [];
  }

  async markShown(milestone: ConversationMilestone): Promise<void> {
    if (!this.storage) return;
    const shown = await this.loadShownIds();
    if (!shown.includes(milestone.id)) {
      await this.storage.setItem(STORAGE_KEYS.conversationMilestonesShown, [...shown, milestone.id]);
    }
  }
}

let instance: ConversationMilestonesService | null = null;

export function getConversationMilestonesService(storage?: IStorageService) {
  if (!instance || storage) instance = new ConversationMilestonesService(storage);
  return instance;
}
