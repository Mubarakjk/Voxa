import { STORAGE_KEYS } from '../../constants/storage-keys';
import { EntityId, createUuid, nowIso } from '../../types';
import {
  DailyNutritionLog,
  MealEntry,
  DEFAULT_CALORIE_GOAL,
  MealKind,
  NutritionExportPayload,
  NutritionMacros,
  NutritionMode,
  NutritionOfflineOp,
  NutritionPreferences,
  NutritionTodaySummary,
  ParsedMealEstimate,
  WeeklyConsistency,
  clampCalorieGoal,
  createDefaultNutritionPreferences,
} from '../../types/nutrition';
import { IStorageService } from '../contracts';

type PrefsMap = Record<string, NutritionPreferences>;
type LogsMap = Record<string, DailyNutritionLog[]>;
type QueueMap = Record<string, NutritionOfflineOp[]>;

/** Local calendar date YYYY-MM-DD */
export function localDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function emptyMacros(): NutritionMacros & { proteinG: number; carbsG: number; fatG: number } {
  return { proteinG: 0, carbsG: 0, fatG: 0 };
}

function sumMacros(meals: MealEntry[]) {
  return meals.reduce(
    (acc, meal) => {
      acc.proteinG += meal.macros?.proteinG ?? 0;
      acc.carbsG += meal.macros?.carbsG ?? 0;
      acc.fatG += meal.macros?.fatG ?? 0;
      return acc;
    },
    emptyMacros(),
  );
}

function sumCalories(meals: MealEntry[]) {
  return meals.reduce((sum, meal) => sum + (Number.isFinite(meal.calories) ? meal.calories : 0), 0);
}

/** Heuristic food table for NL estimates — clearly labeled ESTIMATE, never invents logged entries. */
const FOOD_ESTIMATES: Array<{
  pattern: RegExp;
  name: string;
  calories: number;
  mealKind?: MealKind;
  macros?: NutritionMacros;
  confidence: ParsedMealEstimate['confidence'];
}> = [
  { pattern: /\b(oatmeal|porridge)\b/i, name: 'Oatmeal', calories: 300, mealKind: 'breakfast', macros: { proteinG: 10, carbsG: 52, fatG: 6 }, confidence: 'medium' },
  { pattern: /\b(eggs?)\b/i, name: 'Eggs', calories: 155, mealKind: 'breakfast', macros: { proteinG: 13, carbsG: 1, fatG: 11 }, confidence: 'medium' },
  { pattern: /\b(toast|bread)\b/i, name: 'Toast', calories: 140, mealKind: 'breakfast', macros: { proteinG: 5, carbsG: 24, fatG: 2 }, confidence: 'low' },
  { pattern: /\b(sandwich|wrap)\b/i, name: 'Sandwich', calories: 450, mealKind: 'lunch', macros: { proteinG: 22, carbsG: 48, fatG: 16 }, confidence: 'low' },
  { pattern: /\b(salad)\b/i, name: 'Salad', calories: 280, mealKind: 'lunch', macros: { proteinG: 12, carbsG: 22, fatG: 14 }, confidence: 'low' },
  { pattern: /\b(pasta|spaghetti|noodles)\b/i, name: 'Pasta', calories: 560, mealKind: 'dinner', macros: { proteinG: 20, carbsG: 75, fatG: 16 }, confidence: 'low' },
  { pattern: /\b(rice|biryani|pilaf)\b/i, name: 'Rice dish', calories: 480, mealKind: 'dinner', macros: { proteinG: 12, carbsG: 70, fatG: 12 }, confidence: 'low' },
  { pattern: /\b(chicken)\b/i, name: 'Chicken', calories: 330, mealKind: 'dinner', macros: { proteinG: 40, carbsG: 0, fatG: 14 }, confidence: 'medium' },
  { pattern: /\b(pizza)\b/i, name: 'Pizza slice', calories: 285, mealKind: 'dinner', macros: { proteinG: 12, carbsG: 36, fatG: 10 }, confidence: 'low' },
  { pattern: /\b(burger|hamburger)\b/i, name: 'Burger', calories: 540, mealKind: 'lunch', macros: { proteinG: 28, carbsG: 40, fatG: 28 }, confidence: 'low' },
  { pattern: /\b(yogurt|yoghurt)\b/i, name: 'Yogurt', calories: 150, mealKind: 'snack', macros: { proteinG: 12, carbsG: 15, fatG: 4 }, confidence: 'medium' },
  { pattern: /\b(apple|banana|fruit)\b/i, name: 'Fruit', calories: 95, mealKind: 'snack', macros: { proteinG: 1, carbsG: 24, fatG: 0 }, confidence: 'medium' },
  { pattern: /\b(protein\s*shake|shake)\b/i, name: 'Protein shake', calories: 200, mealKind: 'snack', macros: { proteinG: 25, carbsG: 8, fatG: 3 }, confidence: 'medium' },
  { pattern: /\b(coffee|latte|cappuccino)\b/i, name: 'Coffee drink', calories: 80, mealKind: 'snack', macros: { proteinG: 4, carbsG: 8, fatG: 3 }, confidence: 'low' },
  { pattern: /\b(smoothie)\b/i, name: 'Smoothie', calories: 250, mealKind: 'snack', macros: { proteinG: 8, carbsG: 40, fatG: 5 }, confidence: 'low' },
];

function inferMealKindFromHour(hour: number): MealKind {
  if (hour < 11) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 21) return 'dinner';
  return 'snack';
}

export class NutritionService {
  constructor(private readonly storage: IStorageService) {}

  private async readPrefs(): Promise<PrefsMap> {
    return (await this.storage.getItem<PrefsMap>(STORAGE_KEYS.nutritionPreferences)) ?? {};
  }

  private async writePrefs(map: PrefsMap): Promise<void> {
    await this.storage.setItem(STORAGE_KEYS.nutritionPreferences, map);
  }

  private async readLogs(): Promise<LogsMap> {
    return (await this.storage.getItem<LogsMap>(STORAGE_KEYS.nutritionDailyLogs)) ?? {};
  }

  private async writeLogs(map: LogsMap): Promise<void> {
    await this.storage.setItem(STORAGE_KEYS.nutritionDailyLogs, map);
  }

  private async readQueue(): Promise<QueueMap> {
    return (await this.storage.getItem<QueueMap>(STORAGE_KEYS.nutritionOfflineQueue)) ?? {};
  }

  private async writeQueue(map: QueueMap): Promise<void> {
    await this.storage.setItem(STORAGE_KEYS.nutritionOfflineQueue, map);
  }

  async getPreferences(userId: EntityId): Promise<NutritionPreferences> {
    const map = await this.readPrefs();
    return map[userId] ?? createDefaultNutritionPreferences();
  }

  async setPreferences(
    userId: EntityId,
    patch: Partial<NutritionPreferences>,
  ): Promise<NutritionPreferences> {
    const map = await this.readPrefs();
    const current = map[userId] ?? createDefaultNutritionPreferences();
    const next: NutritionPreferences = {
      ...current,
      ...patch,
      calorieGoal: clampCalorieGoal(patch.calorieGoal ?? current.calorieGoal),
      updatedAt: nowIso(),
    };
    if (next.proteinGoalG != null) next.proteinGoalG = Math.max(0, Math.round(next.proteinGoalG));
    if (next.carbsGoalG != null) next.carbsGoalG = Math.max(0, Math.round(next.carbsGoalG));
    if (next.fatGoalG != null) next.fatGoalG = Math.max(0, Math.round(next.fatGoalG));
    if (next.waterGoalMl != null) next.waterGoalMl = Math.max(0, Math.round(next.waterGoalMl));
    map[userId] = next;
    await this.writePrefs(map);
    return next;
  }

  async enableMode(
    userId: EntityId,
    mode: Exclude<NutritionMode, 'off'>,
    options?: { calorieGoal?: number; trackWater?: boolean },
  ): Promise<NutritionPreferences> {
    return this.setPreferences(userId, {
      mode,
      onboardingCompleted: true,
      disclaimerAcceptedAt: nowIso(),
      calorieGoal: clampCalorieGoal(options?.calorieGoal ?? DEFAULT_CALORIE_GOAL),
      trackWater: options?.trackWater ?? false,
    });
  }

  async disable(userId: EntityId): Promise<NutritionPreferences> {
    return this.setPreferences(userId, { mode: 'off' });
  }

  private async getLogForDate(userId: EntityId, date: string): Promise<DailyNutritionLog | null> {
    const map = await this.readLogs();
    return (map[userId] ?? []).find((log) => log.date === date) ?? null;
  }

  async getOrCreateDailyLog(userId: EntityId, date = localDateKey()): Promise<DailyNutritionLog> {
    const prefs = await this.getPreferences(userId);
    const existing = await this.getLogForDate(userId, date);
    if (existing) {
      if (existing.calorieGoal !== prefs.calorieGoal && date === localDateKey()) {
        const updated = { ...existing, calorieGoal: prefs.calorieGoal };
        await this.upsertLog(userId, updated);
        return updated;
      }
      return existing;
    }
    const created: DailyNutritionLog = {
      date,
      meals: [],
      calorieGoal: prefs.calorieGoal,
      waterMl: prefs.trackWater ? 0 : undefined,
      macroGoals:
        prefs.mode === 'detailed'
          ? {
              proteinG: prefs.proteinGoalG,
              carbsG: prefs.carbsGoalG,
              fatG: prefs.fatGoalG,
            }
          : undefined,
    };
    await this.upsertLog(userId, created);
    return created;
  }

  private async upsertLog(userId: EntityId, log: DailyNutritionLog): Promise<void> {
    const map = await this.readLogs();
    const items = map[userId] ?? [];
    map[userId] = [log, ...items.filter((item) => item.date !== log.date)]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 400);
    await this.writeLogs(map);
  }

  async getTodaySummary(userId: EntityId): Promise<NutritionTodaySummary> {
    const prefs = await this.getPreferences(userId);
    const date = localDateKey();
    const log = (await this.getLogForDate(userId, date)) ?? {
      date,
      meals: [],
      calorieGoal: prefs.calorieGoal,
      waterMl: prefs.trackWater ? 0 : undefined,
    };
    return {
      date,
      caloriesLogged: sumCalories(log.meals),
      calorieGoal: log.calorieGoal || prefs.calorieGoal,
      mealCount: log.meals.length,
      waterMl: log.waterMl,
      waterGoalMl: prefs.waterGoalMl,
      macros: sumMacros(log.meals),
      mode: prefs.mode,
    };
  }

  async listLogs(userId: EntityId, days = 90): Promise<DailyNutritionLog[]> {
    const map = await this.readLogs();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffKey = localDateKey(cutoff);
    return (map[userId] ?? [])
      .filter((log) => log.date >= cutoffKey)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  async addMeal(
    userId: EntityId,
    input: {
      name: string;
      calories: number;
      mealKind?: MealKind;
      macros?: NutritionMacros;
      notes?: string;
      isEstimate?: boolean;
      source?: MealEntry['source'];
      date?: string;
    },
  ): Promise<MealEntry> {
    const date = input.date ?? localDateKey();
    const log = await this.getOrCreateDailyLog(userId, date);
    const now = nowIso();
    const meal: MealEntry = {
      id: createUuid(),
      userId,
      date,
      name: input.name.trim() || 'Meal',
      calories: Math.max(0, Math.round(input.calories)),
      mealKind: input.mealKind ?? inferMealKindFromHour(new Date().getHours()),
      macros: input.macros,
      notes: input.notes?.trim() || undefined,
      isEstimate: Boolean(input.isEstimate),
      source: input.source ?? 'manual',
      createdAt: now,
      updatedAt: now,
    };
    const next: DailyNutritionLog = { ...log, meals: [meal, ...log.meals] };
    try {
      await this.upsertLog(userId, next);
    } catch {
      await this.enqueue(userId, {
        id: createUuid(),
        op: 'add_meal',
        payload: meal,
        createdAt: now,
        attempts: 0,
      });
      throw new Error('Saved to offline queue — will retry.');
    }
    return meal;
  }

  async updateMeal(
    userId: EntityId,
    mealId: EntityId,
    patch: Partial<Pick<MealEntry, 'name' | 'calories' | 'mealKind' | 'macros' | 'notes' | 'isEstimate'>>,
  ): Promise<MealEntry | null> {
    const map = await this.readLogs();
    const logs = map[userId] ?? [];
    let updated: MealEntry | null = null;
    const nextLogs = logs.map((log) => {
      const meals = log.meals.map((meal) => {
        if (meal.id !== mealId) return meal;
        updated = {
          ...meal,
          ...patch,
          name: patch.name != null ? patch.name.trim() || meal.name : meal.name,
          calories:
            patch.calories != null ? Math.max(0, Math.round(patch.calories)) : meal.calories,
          updatedAt: nowIso(),
        };
        return updated;
      });
      return { ...log, meals };
    });
    if (!updated) return null;
    try {
      map[userId] = nextLogs;
      await this.writeLogs(map);
    } catch {
      await this.enqueue(userId, {
        id: createUuid(),
        op: 'update_meal',
        payload: { mealId, patch },
        createdAt: nowIso(),
        attempts: 0,
      });
      throw new Error('Update queued offline.');
    }
    return updated;
  }

  async deleteMeal(userId: EntityId, mealId: EntityId): Promise<boolean> {
    const map = await this.readLogs();
    const logs = map[userId] ?? [];
    let found = false;
    map[userId] = logs.map((log) => {
      const meals = log.meals.filter((meal) => {
        if (meal.id === mealId) {
          found = true;
          return false;
        }
        return true;
      });
      return { ...log, meals };
    });
    if (!found) return false;
    try {
      await this.writeLogs(map);
    } catch {
      await this.enqueue(userId, {
        id: createUuid(),
        op: 'delete_meal',
        payload: { mealId },
        createdAt: nowIso(),
        attempts: 0,
      });
      throw new Error('Delete queued offline.');
    }
    return true;
  }

  async setWater(userId: EntityId, waterMl: number, date = localDateKey()): Promise<DailyNutritionLog> {
    const log = await this.getOrCreateDailyLog(userId, date);
    const next = { ...log, waterMl: Math.max(0, Math.round(waterMl)) };
    try {
      await this.upsertLog(userId, next);
    } catch {
      await this.enqueue(userId, {
        id: createUuid(),
        op: 'set_water',
        payload: { date, waterMl: next.waterMl! },
        createdAt: nowIso(),
        attempts: 0,
      });
      throw new Error('Water update queued offline.');
    }
    return next;
  }

  async getWeeklyConsistency(userId: EntityId, days = 7): Promise<WeeklyConsistency> {
    const logs = await this.listLogs(userId, days);
    const withMeals = logs.filter((log) => log.meals.length > 0);
    const totalCalories = withMeals.reduce((sum, log) => sum + sumCalories(log.meals), 0);
    return {
      daysLogged: withMeals.length,
      daysInWindow: days,
      averageCalories: withMeals.length ? Math.round(totalCalories / withMeals.length) : 0,
      datesWithLogs: withMeals.map((log) => log.date),
    };
  }

  async exportAll(userId: EntityId): Promise<NutritionExportPayload> {
    const [preferences, logs] = await Promise.all([
      this.getPreferences(userId),
      this.listLogs(userId, 400),
    ]);
    return {
      exportedAt: nowIso(),
      preferences,
      logs,
    };
  }

  async deleteAll(userId: EntityId): Promise<void> {
    const prefsMap = await this.readPrefs();
    const logsMap = await this.readLogs();
    const queueMap = await this.readQueue();
    delete prefsMap[userId];
    delete logsMap[userId];
    delete queueMap[userId];
    await Promise.all([
      this.writePrefs(prefsMap),
      this.writeLogs(logsMap),
      this.writeQueue(queueMap),
    ]);
  }

  /**
   * Natural-language helper. Returns an ESTIMATE only — never writes a log entry.
   * Caller must confirm / edit before calling addMeal.
   */
  parseNaturalLanguage(input: string): ParsedMealEstimate | null {
    const raw = input.trim();
    if (!raw) return null;

    const kcalMatch = raw.match(/(\d{2,5})\s*(kcal|cal|calories)?/i);
    const explicitCalories = kcalMatch ? Number(kcalMatch[1]) : null;

    const hits = FOOD_ESTIMATES.filter((item) => item.pattern.test(raw));
    if (hits.length === 0 && explicitCalories == null) {
      return {
        name: raw.slice(0, 80),
        calories: 350,
        mealKind: inferMealKindFromHour(new Date().getHours()),
        isEstimate: true,
        estimateLabel: 'ESTIMATE',
        confidence: 'low',
        rawInput: raw,
      };
    }

    if (hits.length === 0 && explicitCalories != null) {
      return {
        name: raw.replace(kcalMatch![0], '').trim() || 'Meal',
        calories: Math.max(0, Math.round(explicitCalories)),
        mealKind: inferMealKindFromHour(new Date().getHours()),
        isEstimate: true,
        estimateLabel: 'ESTIMATE',
        confidence: 'medium',
        rawInput: raw,
      };
    }

    const calories =
      explicitCalories != null
        ? Math.max(0, Math.round(explicitCalories))
        : hits.reduce((sum, h) => sum + h.calories, 0);

    const macros = hits.reduce<NutritionMacros>((acc, h) => {
      if (!h.macros) return acc;
      return {
        proteinG: (acc.proteinG ?? 0) + (h.macros.proteinG ?? 0),
        carbsG: (acc.carbsG ?? 0) + (h.macros.carbsG ?? 0),
        fatG: (acc.fatG ?? 0) + (h.macros.fatG ?? 0),
      };
    }, {});

    const name =
      hits.length === 1
        ? hits[0]!.name
        : hits.map((h) => h.name).join(' + ') || raw.slice(0, 80);

    const confidence =
      explicitCalories != null
        ? 'medium'
        : hits.every((h) => h.confidence === 'medium')
          ? 'medium'
          : 'low';

    return {
      name,
      calories,
      mealKind: hits[0]?.mealKind ?? inferMealKindFromHour(new Date().getHours()),
      macros: Object.keys(macros).length ? macros : undefined,
      isEstimate: true,
      estimateLabel: 'ESTIMATE',
      confidence,
      rawInput: raw,
    };
  }

  async enqueue(userId: EntityId, op: NutritionOfflineOp): Promise<void> {
    const map = await this.readQueue();
    const items = map[userId] ?? [];
    map[userId] = [...items, op].slice(-100);
    await this.writeQueue(map);
  }

  async listOfflineQueue(userId: EntityId): Promise<NutritionOfflineOp[]> {
    const map = await this.readQueue();
    return map[userId] ?? [];
  }

  async flushOfflineQueue(userId: EntityId): Promise<{ flushed: number; remaining: number }> {
    const map = await this.readQueue();
    const items = map[userId] ?? [];
    if (!items.length) return { flushed: 0, remaining: 0 };

    const remaining: NutritionOfflineOp[] = [];
    let flushed = 0;

    for (const item of items) {
      try {
        if (item.op === 'add_meal') {
          const p = item.payload;
          const date = p.date;
          const log = await this.getOrCreateDailyLog(userId, date);
          const now = nowIso();
          const meal: MealEntry = {
            id: p.id ?? createUuid(),
            userId,
            date,
            name: p.name.trim() || 'Meal',
            calories: Math.max(0, Math.round(p.calories)),
            mealKind: p.mealKind,
            macros: p.macros,
            notes: p.notes,
            isEstimate: Boolean(p.isEstimate),
            source: p.source,
            createdAt: now,
            updatedAt: now,
          };
          if (!log.meals.some((m) => m.id === meal.id)) {
            await this.upsertLog(userId, { ...log, meals: [meal, ...log.meals] });
          }
        } else if (item.op === 'update_meal') {
          const logsMap = await this.readLogs();
          const logs = logsMap[userId] ?? [];
          let found = false;
          logsMap[userId] = logs.map((log) => ({
            ...log,
            meals: log.meals.map((meal) => {
              if (meal.id !== item.payload.mealId) return meal;
              found = true;
              return { ...meal, ...item.payload.patch, updatedAt: nowIso() };
            }),
          }));
          if (found) await this.writeLogs(logsMap);
        } else if (item.op === 'delete_meal') {
          const logsMap = await this.readLogs();
          logsMap[userId] = (logsMap[userId] ?? []).map((log) => ({
            ...log,
            meals: log.meals.filter((meal) => meal.id !== item.payload.mealId),
          }));
          await this.writeLogs(logsMap);
        } else if (item.op === 'set_water') {
          const log = await this.getOrCreateDailyLog(userId, item.payload.date);
          await this.upsertLog(userId, {
            ...log,
            waterMl: Math.max(0, Math.round(item.payload.waterMl)),
          });
        }
        flushed += 1;
      } catch {
        remaining.push({ ...item, attempts: item.attempts + 1 });
      }
    }

    map[userId] = remaining;
    await this.writeQueue(map);
    return { flushed, remaining: remaining.length };
  }

  /**
   * Compact AI context. Empty when mode is Off.
   * Does not invent entries — only reports what the user logged.
   */
  buildNutritionPromptBlock(
    prefs: NutritionPreferences,
    todaySummary: NutritionTodaySummary | null,
  ): string {
    if (prefs.mode === 'off') return '';
    if (!todaySummary) return '';

    const lines = [
      '## Nutrition tracking (user opted in — factual summary only; do not invent meals or give medical advice)',
      `- Mode: ${prefs.mode}`,
      `- Today (${todaySummary.date}): ${todaySummary.caloriesLogged} of ${todaySummary.calorieGoal} kcal logged across ${todaySummary.mealCount} meal(s)`,
    ];
    if (prefs.mode === 'detailed') {
      lines.push(
        `- Macros so far: protein ${Math.round(todaySummary.macros.proteinG)}g · carbs ${Math.round(todaySummary.macros.carbsG)}g · fat ${Math.round(todaySummary.macros.fatG)}g`,
      );
    }
    if (prefs.trackWater && todaySummary.waterMl != null) {
      lines.push(
        `- Water: ${todaySummary.waterMl} ml${todaySummary.waterGoalMl ? ` of ${todaySummary.waterGoalMl} ml` : ''}`,
      );
    }
    lines.push(
      '- Speak neutrally about food; no judgemental language (no good/bad/clean/cheat). Not medical advice.',
    );
    return lines.join('\n');
  }

  formatCalories(n: number): string {
    return Math.round(n).toLocaleString();
  }
}

let instance: NutritionService | null = null;

export function getNutritionService(storage: IStorageService) {
  if (!instance) instance = new NutritionService(storage);
  return instance;
}

export function resetNutritionService() {
  instance = null;
}
