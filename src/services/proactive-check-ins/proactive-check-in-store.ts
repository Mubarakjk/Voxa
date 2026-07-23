import { STORAGE_KEYS } from '../../constants/storage-keys';
import { EntityId, createUuid, nowIso } from '../../types';
import {
  ProactiveCheckInDelivery,
  ProactiveCheckInSettings,
  ProactiveCheckInUserState,
  createDefaultProactiveCheckInSettings,
} from '../../types/proactive-check-in';
import { IStorageService } from '../contracts';

const MAX_HISTORY = 100;

export class ProactiveCheckInStore {
  constructor(private readonly storage: IStorageService) {}

  private async readMap(): Promise<Record<string, ProactiveCheckInUserState>> {
    return (await this.storage.getItem<Record<string, ProactiveCheckInUserState>>(STORAGE_KEYS.proactiveCheckIns)) ?? {};
  }

  private async writeMap(map: Record<string, ProactiveCheckInUserState>): Promise<void> {
    await this.storage.setItem(STORAGE_KEYS.proactiveCheckIns, map);
  }

  async getState(userId: EntityId): Promise<ProactiveCheckInUserState> {
    const map = await this.readMap();
    return map[userId] ?? { settings: createDefaultProactiveCheckInSettings(), history: [] };
  }

  async updateSettings(userId: EntityId, patch: Partial<ProactiveCheckInSettings>): Promise<ProactiveCheckInSettings> {
    const map = await this.readMap();
    const current = map[userId] ?? { settings: createDefaultProactiveCheckInSettings(), history: [] };
    current.settings = { ...current.settings, ...patch };
    map[userId] = current;
    await this.writeMap(map);
    return current.settings;
  }

  async recordDelivery(
    userId: EntityId,
    input: Omit<ProactiveCheckInDelivery, 'id' | 'deliveredAt'>,
  ): Promise<ProactiveCheckInDelivery> {
    const map = await this.readMap();
    const current = map[userId] ?? { settings: createDefaultProactiveCheckInSettings(), history: [] };
    const entry: ProactiveCheckInDelivery = {
      ...input,
      id: createUuid(),
      deliveredAt: nowIso(),
    };
    current.history = [entry, ...current.history].slice(0, MAX_HISTORY);
    current.settings.lastDeliveredAt = entry.deliveredAt;
    map[userId] = current;
    await this.writeMap(map);
    return entry;
  }

  async getUsedMessages(userId: EntityId): Promise<Set<string>> {
    const state = await this.getState(userId);
    return new Set(state.history.map((entry) => entry.message.trim().toLowerCase()));
  }

  async history(userId: EntityId): Promise<ProactiveCheckInDelivery[]> {
    const state = await this.getState(userId);
    return state.history;
  }
}
