import { STORAGE_KEYS } from '../../constants/storage-keys';
import {
  CompanionIntelligenceBundle,
  createDefaultIntelligenceBundle,
} from '../../types/companion-intelligence';
import { IStorageService } from '../contracts/storage-service';
import { nowIso } from '../../types';
import { hydrateIntelligenceBundle } from '../personality/relationship-personality-service';

export class CompanionIntelligenceStore {
  constructor(private readonly storage: IStorageService) {}

  async load(userId: string, displayName: string): Promise<CompanionIntelligenceBundle> {
    const all = (await this.storage.getItem<Record<string, CompanionIntelligenceBundle>>(
      STORAGE_KEYS.companionIntelligence,
    )) ?? {};
    if (all[userId]) return hydrateIntelligenceBundle(userId, displayName, all[userId]);
    const created = createDefaultIntelligenceBundle(userId, displayName, nowIso());
    all[userId] = created;
    await this.storage.setItem(STORAGE_KEYS.companionIntelligence, all);
    return created;
  }

  async save(userId: string, bundle: CompanionIntelligenceBundle): Promise<void> {
    const all = (await this.storage.getItem<Record<string, CompanionIntelligenceBundle>>(
      STORAGE_KEYS.companionIntelligence,
    )) ?? {};
    all[userId] = bundle;
    await this.storage.setItem(STORAGE_KEYS.companionIntelligence, all);
  }
}

export function createCompanionIntelligenceStore(storage: IStorageService) {
  return new CompanionIntelligenceStore(storage);
}
