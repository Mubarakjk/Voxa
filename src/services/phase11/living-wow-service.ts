import { STORAGE_KEYS } from '../../constants/storage-keys';
import { EntityId } from '../../types';
import { Goal, Memory } from '../../types';
import { LivingWowMoment } from '../../types/phase11-living-companion';
import { IStorageService } from '../contracts';

function dayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function detectLivingWow(input: {
  memories: Memory[];
  goals: Goal[];
  importantDateLabel?: string | null;
  shownToday: boolean;
}): LivingWowMoment | null {
  if (input.shownToday) return null;

  if (input.importantDateLabel) {
    return {
      id: `wow-date-${dayKey()}`,
      line: `I remembered — today is important to you (${input.importantDateLabel}).`,
      kind: 'remembered',
      actionPrompt: `Today matters because of ${input.importantDateLabel}. Acknowledge it warmly.`,
    };
  }

  const pinned = input.memories.find((m) => m.tags?.includes('remember-this') && (m.importance ?? 0) >= 4);
  if (pinned) {
    return {
      id: `wow-mem-${pinned.id}`,
      line: `I remembered something you asked me to keep — "${pinned.title}".`,
      kind: 'remembered',
      actionPrompt: `Reference "${pinned.title}" naturally: ${pinned.content.slice(0, 120)}`,
    };
  }

  const goal = input.goals.find((g) => g.status === 'active' && g.title.length > 3);
  if (goal) {
    return {
      id: `wow-goal-${goal.id}`,
      line: `I found something interesting — you're still moving on "${goal.title}".`,
      kind: 'found_interesting',
      actionPrompt: `Encourage progress on goal "${goal.title}" without pressure.`,
    };
  }

  return null;
}

export class LivingWowService {
  constructor(private readonly storage: IStorageService) {}

  async wasShownToday(userId: EntityId): Promise<boolean> {
    const map = (await this.storage.getItem<Record<string, string>>(STORAGE_KEYS.delightShown)) ?? {};
    return map[`${userId}:living-wow:${dayKey()}`] === '1';
  }

  async markShown(userId: EntityId, wowId: string): Promise<void> {
    const map = (await this.storage.getItem<Record<string, string>>(STORAGE_KEYS.delightShown)) ?? {};
    map[`${userId}:living-wow:${dayKey()}`] = '1';
    map[`${userId}:living-wow-id:${dayKey()}`] = wowId;
    await this.storage.setItem(STORAGE_KEYS.delightShown, map);
  }
}

let instance: LivingWowService | null = null;

export function getLivingWowService(storage: IStorageService) {
  if (!instance) instance = new LivingWowService(storage);
  return instance;
}
