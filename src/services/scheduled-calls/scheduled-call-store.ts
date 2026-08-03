import { STORAGE_KEYS } from '../../constants/storage-keys';
import {
  createDefaultScheduledCallsPreferences,
  ScheduledCallsPreferences,
  ScheduledCompanionCall,
} from '../../types/scheduled-companion-call';
import { asArray } from '../../utils/as-array';
import { IStorageService } from '../contracts/storage-service';

export class ScheduledCallStore {
  constructor(private readonly storage: IStorageService) {}

  async list(userId: string): Promise<ScheduledCompanionCall[]> {
    const all = asArray<ScheduledCompanionCall>(
      await this.storage.getItem<ScheduledCompanionCall[]>(STORAGE_KEYS.scheduledCompanionCalls),
    );
    return all
      .filter((item) => item.userId === userId)
      .sort((a, b) => a.nextScheduledAt.localeCompare(b.nextScheduledAt));
  }

  async get(userId: string, id: string): Promise<ScheduledCompanionCall | null> {
    const items = await this.list(userId);
    return items.find((item) => item.id === id) ?? null;
  }

  async saveAll(userId: string, items: ScheduledCompanionCall[]): Promise<void> {
    const all = asArray<ScheduledCompanionCall>(
      await this.storage.getItem<ScheduledCompanionCall[]>(STORAGE_KEYS.scheduledCompanionCalls),
    );
    const others = all.filter((item) => item.userId !== userId);
    await this.storage.setItem(STORAGE_KEYS.scheduledCompanionCalls, [...others, ...items]);
  }

  async upsert(call: ScheduledCompanionCall): Promise<void> {
    const items = await this.list(call.userId);
    const index = items.findIndex((item) => item.id === call.id);
    if (index >= 0) items[index] = call;
    else items.push(call);
    await this.saveAll(call.userId, items);
  }

  async remove(userId: string, id: string): Promise<void> {
    const items = await this.list(userId);
    await this.saveAll(
      userId,
      items.filter((item) => item.id !== id),
    );
  }

  async getPreferences(): Promise<ScheduledCallsPreferences> {
    const prefs = await this.storage.getItem<ScheduledCallsPreferences>(
      STORAGE_KEYS.scheduledCallsPreferences,
    );
    return prefs ?? createDefaultScheduledCallsPreferences();
  }

  async setPreferences(prefs: ScheduledCallsPreferences): Promise<void> {
    await this.storage.setItem(STORAGE_KEYS.scheduledCallsPreferences, prefs);
  }
}

export function createScheduledCallStore(storage: IStorageService) {
  return new ScheduledCallStore(storage);
}
