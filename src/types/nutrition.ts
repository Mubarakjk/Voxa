import { EntityId, ISODateString } from './common';

/** Adult safety floor — goals below this are not allowed. */
export const MIN_CALORIE_GOAL = 1200;

export const DEFAULT_CALORIE_GOAL = 2200;

export const DEFAULT_WATER_GOAL_ML = 2000;

export const NUTRITION_DISCLAIMER =
  'Calorie and nutrition tracking in Voxa is optional and for personal awareness only. It is not medical advice, diagnosis, or treatment. Talk to a qualified clinician before making significant changes to how you eat or to any calorie goal.';

export type NutritionMode = 'off' | 'simple' | 'detailed';

export type MealKind = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other';

export type MealSource = 'manual' | 'quick' | 'natural_language';

export type NutritionMacros = {
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  fiberG?: number;
};

export type MealEntry = {
  id: EntityId;
  userId: EntityId;
  /** Local calendar date YYYY-MM-DD */
  date: string;
  name: string;
  calories: number;
  mealKind: MealKind;
  macros?: NutritionMacros;
  notes?: string;
  /** True when values came from a heuristic / NL estimate */
  isEstimate: boolean;
  source: MealSource;
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export type DailyNutritionLog = {
  date: string;
  meals: MealEntry[];
  waterMl?: number;
  calorieGoal: number;
  macroGoals?: NutritionMacros;
};

export type NutritionPreferences = {
  mode: NutritionMode;
  calorieGoal: number;
  proteinGoalG?: number;
  carbsGoalG?: number;
  fatGoalG?: number;
  trackWater: boolean;
  waterGoalMl?: number;
  onboardingCompleted: boolean;
  disclaimerAcceptedAt?: ISODateString;
  updatedAt: ISODateString;
};

export type NutritionTodaySummary = {
  date: string;
  caloriesLogged: number;
  calorieGoal: number;
  mealCount: number;
  waterMl?: number;
  waterGoalMl?: number;
  macros: {
    proteinG: number;
    carbsG: number;
    fatG: number;
  };
  mode: NutritionMode;
};

export type WeeklyConsistency = {
  daysLogged: number;
  daysInWindow: number;
  averageCalories: number;
  datesWithLogs: string[];
};

export type ParsedMealEstimate = {
  name: string;
  calories: number;
  mealKind: MealKind;
  macros?: NutritionMacros;
  isEstimate: true;
  /** Always shown to the user — values are approximate */
  estimateLabel: 'ESTIMATE';
  confidence: 'low' | 'medium' | 'high';
  rawInput: string;
};

export type NutritionOfflineOp =
  | { id: EntityId; op: 'add_meal'; payload: Omit<MealEntry, 'id' | 'createdAt' | 'updatedAt'> & { id?: EntityId }; createdAt: ISODateString; attempts: number }
  | { id: EntityId; op: 'update_meal'; payload: { mealId: EntityId; patch: Partial<MealEntry> }; createdAt: ISODateString; attempts: number }
  | { id: EntityId; op: 'delete_meal'; payload: { mealId: EntityId }; createdAt: ISODateString; attempts: number }
  | { id: EntityId; op: 'set_water'; payload: { date: string; waterMl: number }; createdAt: ISODateString; attempts: number };

export type NutritionExportPayload = {
  exportedAt: ISODateString;
  preferences: NutritionPreferences;
  logs: DailyNutritionLog[];
};

export type QuickAddPreset = {
  id: string;
  name: string;
  calories: number;
  mealKind: MealKind;
  macros?: NutritionMacros;
};

export const QUICK_ADD_PRESETS: QuickAddPreset[] = [
  { id: 'oatmeal', name: 'Oatmeal with fruit', calories: 320, mealKind: 'breakfast', macros: { proteinG: 10, carbsG: 55, fatG: 6 } },
  { id: 'eggs-toast', name: 'Eggs & toast', calories: 380, mealKind: 'breakfast', macros: { proteinG: 18, carbsG: 28, fatG: 20 } },
  { id: 'salad', name: 'Mixed salad', calories: 280, mealKind: 'lunch', macros: { proteinG: 12, carbsG: 22, fatG: 14 } },
  { id: 'sandwich', name: 'Sandwich', calories: 450, mealKind: 'lunch', macros: { proteinG: 22, carbsG: 48, fatG: 16 } },
  { id: 'rice-bowl', name: 'Rice bowl', calories: 520, mealKind: 'dinner', macros: { proteinG: 24, carbsG: 65, fatG: 14 } },
  { id: 'pasta', name: 'Pasta plate', calories: 580, mealKind: 'dinner', macros: { proteinG: 20, carbsG: 78, fatG: 18 } },
  { id: 'yogurt', name: 'Yogurt', calories: 150, mealKind: 'snack', macros: { proteinG: 12, carbsG: 15, fatG: 4 } },
  { id: 'fruit', name: 'Fresh fruit', calories: 95, mealKind: 'snack', macros: { proteinG: 1, carbsG: 24, fatG: 0 } },
  { id: 'protein-shake', name: 'Protein shake', calories: 200, mealKind: 'snack', macros: { proteinG: 25, carbsG: 8, fatG: 3 } },
];

export const MEAL_KIND_LABELS: Record<MealKind, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
  other: 'Other',
};

export const NUTRITION_MODE_LABELS: Record<NutritionMode, string> = {
  off: 'Off',
  simple: 'Simple',
  detailed: 'Detailed',
};

export function createDefaultNutritionPreferences(): NutritionPreferences {
  return {
    mode: 'off',
    calorieGoal: DEFAULT_CALORIE_GOAL,
    trackWater: false,
    waterGoalMl: DEFAULT_WATER_GOAL_ML,
    onboardingCompleted: false,
    updatedAt: new Date().toISOString(),
  };
}

export function clampCalorieGoal(value: number): number {
  const n = Math.round(Number.isFinite(value) ? value : DEFAULT_CALORIE_GOAL);
  return Math.max(MIN_CALORIE_GOAL, n);
}
