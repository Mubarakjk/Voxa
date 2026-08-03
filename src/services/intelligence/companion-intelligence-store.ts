import { STORAGE_KEYS } from '../../constants/storage-keys';
import {
  CompanionIntelligenceBundle,
  createDefaultIntelligenceBundle,
} from '../../types/companion-intelligence';
import { IStorageService } from '../contracts/storage-service';
import { nowIso } from '../../types';
import { hydrateIntelligenceBundle } from '../personality/relationship-personality-service';

function looksCorrupted(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object') return true;
  const bundle = raw as Partial<CompanionIntelligenceBundle>;
  const checks: unknown[] = [
    bundle.lifeTimeline,
    bundle.insideJokes,
    bundle.weeklyReflections,
    bundle.profile?.recentAchievements,
    bundle.profile?.currentChallenges,
    bundle.profile?.relationships,
    bundle.profile?.importantDates,
    bundle.profile?.goals,
    bundle.profile?.routines,
    bundle.relationship?.milestones,
    bundle.conversationQuality?.recentGreetings,
    bundle.conversationQuality?.recentQuestions,
    bundle.conversationQuality?.recentSuggestedTopics,
  ];
  return checks.some((value) => value != null && !Array.isArray(value));
}

export class CompanionIntelligenceStore {
  constructor(private readonly storage: IStorageService) {}

  async load(userId: string, displayName: string): Promise<CompanionIntelligenceBundle> {
    const all =
      (await this.storage.getItem<Record<string, CompanionIntelligenceBundle>>(
        STORAGE_KEYS.companionIntelligence,
      )) ?? {};

    const raw = all[userId];
    if (!raw) {
      const created = createDefaultIntelligenceBundle(userId, displayName, nowIso());
      all[userId] = created;
      await this.storage.setItem(STORAGE_KEYS.companionIntelligence, all);
      return created;
    }

    const hydrated = hydrateIntelligenceBundle(userId, displayName, raw);

    // Migrate corrupted persisted shapes (non-array list fields) without wiping auth/user data.
    if (looksCorrupted(raw)) {
      if (__DEV__) {
        console.warn(
          '[CompanionIntelligence] Migrating corrupted list fields for user',
          userId.slice(0, 8),
        );
      }
      all[userId] = hydrated;
      await this.storage.setItem(STORAGE_KEYS.companionIntelligence, all);
    }

    return hydrated;
  }

  async save(userId: string, bundle: CompanionIntelligenceBundle): Promise<void> {
    const all =
      (await this.storage.getItem<Record<string, CompanionIntelligenceBundle>>(
        STORAGE_KEYS.companionIntelligence,
      )) ?? {};
    all[userId] = bundle;
    await this.storage.setItem(STORAGE_KEYS.companionIntelligence, all);
  }
}

export function createCompanionIntelligenceStore(storage: IStorageService) {
  return new CompanionIntelligenceStore(storage);
}
