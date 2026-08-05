import { STORAGE_KEYS, StorageKey } from '../../constants/storage-keys';
import { createUuid, EntityId, nowIso } from '../../types';
import {
  createDefaultFaithValuesPreferences,
  createFaithIntention,
  createFaithReflection,
  createSavedDua,
  FaithIntention,
  FaithReflection,
  FaithValuesExport,
  FaithValuesMode,
  FaithValuesPreferences,
  PrayerName,
  PrayerRoutineDay,
  PRAYER_ORDER,
  SavedDua,
  SavedDuaCategory,
  todayDateKey,
} from '../../types/faith-values';
import { IStorageService } from '../contracts';

type UserMap<T> = Record<EntityId, T>;

export class FaithValuesService {
  constructor(private readonly storage: IStorageService) {}

  async getPreferences(userId: EntityId): Promise<FaithValuesPreferences> {
    const map =
      (await this.storage.getItem<UserMap<FaithValuesPreferences>>(STORAGE_KEYS.faithValuesPreferences)) ??
      {};
    return map[userId] ?? createDefaultFaithValuesPreferences();
  }

  private async writePreferences(userId: EntityId, prefs: FaithValuesPreferences) {
    const map =
      (await this.storage.getItem<UserMap<FaithValuesPreferences>>(STORAGE_KEYS.faithValuesPreferences)) ??
      {};
    map[userId] = { ...prefs, updatedAt: nowIso() };
    await this.storage.setItem(STORAGE_KEYS.faithValuesPreferences, map);
  }

  async setMode(userId: EntityId, mode: FaithValuesMode): Promise<FaithValuesPreferences> {
    const current = await this.getPreferences(userId);
    const enabled = mode !== 'off';
    const next: FaithValuesPreferences = {
      ...current,
      mode,
      enabled,
      onboardingCompleted: enabled ? true : current.onboardingCompleted,
      faithAwareLanguage: enabled ? current.faithAwareLanguage || mode === 'islam' : false,
      ramadanGoalsEnabled: mode === 'islam' ? current.ramadanGoalsEnabled : false,
      updatedAt: nowIso(),
    };
    if (!enabled) {
      next.onboardingCompleted = false;
    }
    await this.writePreferences(userId, next);
    return next;
  }

  async updatePreferences(
    userId: EntityId,
    patch: Partial<FaithValuesPreferences>,
  ): Promise<FaithValuesPreferences> {
    const current = await this.getPreferences(userId);
    const next = { ...current, ...patch, updatedAt: nowIso() };
    await this.writePreferences(userId, next);
    return next;
  }

  async disableCompletely(userId: EntityId): Promise<void> {
    await this.setMode(userId, 'off');
    await this.updatePreferences(userId, {
      enabled: false,
      onboardingCompleted: false,
      faithAwareLanguage: false,
      hideFromHome: false,
      ramadanGoalsEnabled: false,
    });
  }

  // --- Intentions ---

  private async readIntentions(userId: EntityId): Promise<FaithIntention[]> {
    const map =
      (await this.storage.getItem<UserMap<FaithIntention[]>>(STORAGE_KEYS.faithValuesIntentions)) ?? {};
    return map[userId] ?? [];
  }

  private async writeIntentions(userId: EntityId, items: FaithIntention[]) {
    const map =
      (await this.storage.getItem<UserMap<FaithIntention[]>>(STORAGE_KEYS.faithValuesIntentions)) ?? {};
    map[userId] = items;
    await this.storage.setItem(STORAGE_KEYS.faithValuesIntentions, map);
  }

  async getTodayIntention(userId: EntityId): Promise<FaithIntention | null> {
    const date = todayDateKey();
    return (await this.readIntentions(userId)).find((i) => i.date === date) ?? null;
  }

  async setTodayIntention(userId: EntityId, text: string): Promise<FaithIntention> {
    const date = todayDateKey();
    const items = await this.readIntentions(userId);
    const existing = items.find((i) => i.date === date);
    if (existing) {
      const updated = { ...existing, text: text.trim(), updatedAt: nowIso() };
      await this.writeIntentions(
        userId,
        items.map((i) => (i.id === existing.id ? updated : i)),
      );
      return updated;
    }
    const created = createFaithIntention(userId, text, date);
    await this.writeIntentions(userId, [created, ...items]);
    return created;
  }

  // --- Reflections ---

  private async readReflections(userId: EntityId): Promise<FaithReflection[]> {
    const map =
      (await this.storage.getItem<UserMap<FaithReflection[]>>(STORAGE_KEYS.faithValuesReflections)) ??
      {};
    return map[userId] ?? [];
  }

  private async writeReflections(userId: EntityId, items: FaithReflection[]) {
    const map =
      (await this.storage.getItem<UserMap<FaithReflection[]>>(STORAGE_KEYS.faithValuesReflections)) ??
      {};
    map[userId] = items;
    await this.storage.setItem(STORAGE_KEYS.faithValuesReflections, map);
  }

  async listReflections(userId: EntityId, limit = 30): Promise<FaithReflection[]> {
    return (await this.readReflections(userId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  async saveReflection(
    userId: EntityId,
    input: {
      prompt: string;
      body: string;
      mode: Exclude<FaithValuesMode, 'off'>;
      allowMemory?: boolean;
      id?: string;
    },
  ): Promise<FaithReflection> {
    const items = await this.readReflections(userId);
    if (input.id) {
      const existing = items.find((r) => r.id === input.id);
      if (existing) {
        const updated: FaithReflection = {
          ...existing,
          body: input.body.trim(),
          allowMemory: input.allowMemory ?? existing.allowMemory,
          updatedAt: nowIso(),
        };
        await this.writeReflections(
          userId,
          items.map((r) => (r.id === input.id ? updated : r)),
        );
        return updated;
      }
    }
    const created = createFaithReflection(
      userId,
      input.prompt,
      input.body,
      input.mode,
      input.allowMemory ?? false,
    );
    await this.writeReflections(userId, [created, ...items]);
    return created;
  }

  async deleteReflection(userId: EntityId, reflectionId: string): Promise<void> {
    const items = await this.readReflections(userId);
    await this.writeReflections(
      userId,
      items.filter((r) => r.id !== reflectionId),
    );
  }

  async markReflectionMemorySaved(userId: EntityId, reflectionId: string): Promise<void> {
    const items = await this.readReflections(userId);
    await this.writeReflections(
      userId,
      items.map((r) =>
        r.id === reflectionId ? { ...r, memorySaved: true, updatedAt: nowIso() } : r,
      ),
    );
  }

  /** Reflections explicitly approved for AI context — never includes body in analytics. */
  async listMemoryApprovedReflections(userId: EntityId): Promise<FaithReflection[]> {
    return (await this.readReflections(userId)).filter((r) => r.allowMemory && r.body.trim());
  }

  // --- Duas ---

  private async readDuas(userId: EntityId): Promise<SavedDua[]> {
    const map = (await this.storage.getItem<UserMap<SavedDua[]>>(STORAGE_KEYS.faithValuesDuas)) ?? {};
    return map[userId] ?? [];
  }

  private async writeDuas(userId: EntityId, items: SavedDua[]) {
    const map = (await this.storage.getItem<UserMap<SavedDua[]>>(STORAGE_KEYS.faithValuesDuas)) ?? {};
    map[userId] = items;
    await this.storage.setItem(STORAGE_KEYS.faithValuesDuas, map);
  }

  async listDuas(userId: EntityId, includeArchived = false): Promise<SavedDua[]> {
    const items = await this.readDuas(userId);
    return items
      .filter((d) => includeArchived || !d.archived)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getDua(userId: EntityId, duaId: string): Promise<SavedDua | null> {
    return (await this.readDuas(userId)).find((d) => d.id === duaId) ?? null;
  }

  async createDua(
    userId: EntityId,
    input: { title: string; text: string; category: SavedDuaCategory; translation?: string; privateNote?: string },
  ): Promise<SavedDua> {
    const created = createSavedDua(userId, input);
    const items = await this.readDuas(userId);
    await this.writeDuas(userId, [created, ...items]);
    return created;
  }

  async updateDua(userId: EntityId, duaId: string, patch: Partial<SavedDua>): Promise<SavedDua | null> {
    const items = await this.readDuas(userId);
    const existing = items.find((d) => d.id === duaId);
    if (!existing) return null;
    const updated = { ...existing, ...patch, updatedAt: nowIso() };
    await this.writeDuas(
      userId,
      items.map((d) => (d.id === duaId ? updated : d)),
    );
    return updated;
  }

  async deleteDua(userId: EntityId, duaId: string): Promise<void> {
    const items = await this.readDuas(userId);
    await this.writeDuas(
      userId,
      items.filter((d) => d.id !== duaId),
    );
  }

  // --- Prayer routine ---

  private async readPrayerDays(userId: EntityId): Promise<PrayerRoutineDay[]> {
    const map =
      (await this.storage.getItem<UserMap<PrayerRoutineDay[]>>(STORAGE_KEYS.faithValuesPrayerRoutine)) ??
      {};
    return map[userId] ?? [];
  }

  private async writePrayerDays(userId: EntityId, days: PrayerRoutineDay[]) {
    const map =
      (await this.storage.getItem<UserMap<PrayerRoutineDay[]>>(STORAGE_KEYS.faithValuesPrayerRoutine)) ??
      {};
    map[userId] = days;
    await this.storage.setItem(STORAGE_KEYS.faithValuesPrayerRoutine, map);
  }

  async getPrayerDay(userId: EntityId, date = todayDateKey()): Promise<PrayerRoutineDay> {
    const days = await this.readPrayerDays(userId);
    return (
      days.find((d) => d.date === date) ?? {
        date,
        completed: {},
        updatedAt: nowIso(),
      }
    );
  }

  async togglePrayer(userId: EntityId, prayer: PrayerName, date = todayDateKey()): Promise<PrayerRoutineDay> {
    const days = await this.readPrayerDays(userId);
    const existing = days.find((d) => d.date === date);
    const completed = { ...(existing?.completed ?? {}) };
    completed[prayer] = !completed[prayer];
    const next: PrayerRoutineDay = {
      date,
      completed,
      updatedAt: nowIso(),
    };
    const without = days.filter((d) => d.date !== date);
    await this.writePrayerDays(userId, [next, ...without]);
    return next;
  }

  async getWeeklyPrayerSummary(userId: EntityId): Promise<{ date: string; count: number }[]> {
    const days = await this.readPrayerDays(userId);
    const week: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const day = days.find((row) => row.date === key);
      const count = day
        ? PRAYER_ORDER.filter((p) => day.completed[p]).length
        : 0;
      week.push({ date: key, count });
    }
    return week;
  }

  // --- Export / delete ---

  async buildExport(userId: EntityId): Promise<FaithValuesExport> {
    const [preferences, intentions, reflections, duas, prayerRoutine] = await Promise.all([
      this.getPreferences(userId),
      this.readIntentions(userId),
      this.readReflections(userId),
      this.listDuas(userId, true),
      this.readPrayerDays(userId),
    ]);
    return {
      exportedAt: nowIso(),
      preferences,
      intentions,
      reflections,
      duas,
      prayerRoutine,
    };
  }

  async deleteAllData(userId: EntityId): Promise<void> {
    const keys: StorageKey[] = [
      STORAGE_KEYS.faithValuesIntentions,
      STORAGE_KEYS.faithValuesReflections,
      STORAGE_KEYS.faithValuesDuas,
      STORAGE_KEYS.faithValuesPrayerRoutine,
    ];
    for (const key of keys) {
      const map = (await this.storage.getItem<UserMap<unknown>>(key)) ?? {};
      delete map[userId];
      await this.storage.setItem(key, map);
    }
    await this.disableCompletely(userId);
  }

  /** Lightweight summary for Home — never blocks dashboard. */
  async getHomeSummary(userId: EntityId): Promise<{
    enabled: boolean;
    mode: FaithValuesMode;
    hasIntention: boolean;
    reflectionCount: number;
    hideFromHome: boolean;
  } | null> {
    const prefs = await this.getPreferences(userId);
    if (!prefs.enabled || prefs.mode === 'off' || prefs.hideFromHome) return null;
    const [intention, reflections] = await Promise.all([
      this.getTodayIntention(userId),
      this.readReflections(userId),
    ]);
    return {
      enabled: true,
      mode: prefs.mode,
      hasIntention: Boolean(intention?.text.trim()),
      reflectionCount: reflections.length,
      hideFromHome: prefs.hideFromHome,
    };
  }
}

let instance: FaithValuesService | null = null;

export function getFaithValuesService(storage: IStorageService): FaithValuesService {
  if (!instance) instance = new FaithValuesService(storage);
  return instance;
}

/** Reset singleton for tests. */
export function resetFaithValuesServiceForTests(): void {
  instance = null;
}
