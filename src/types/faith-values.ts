import { createUuid, EntityId, nowIso } from './index';

/** User-selected mode — never inferred. */
export type FaithValuesMode = 'off' | 'general' | 'islam' | 'personal';

export type FaithValuesPreferences = {
  mode: FaithValuesMode;
  /** True when mode !== 'off' and user completed setup. */
  enabled: boolean;
  onboardingCompleted: boolean;
  /** Whether Voxa may use faith-aware language in Talk. */
  faithAwareLanguage: boolean;
  /** Hide optional Home reflection card. */
  hideFromHome: boolean;
  /** Islam mode — user must manually enable Ramadan section. */
  ramadanGoalsEnabled: boolean;
  updatedAt: string;
};

export type PrayerName = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export const PRAYER_LABELS: Record<PrayerName, string> = {
  fajr: 'Fajr',
  dhuhr: 'Dhuhr',
  asr: 'Asr',
  maghrib: 'Maghrib',
  isha: 'Isha',
};

export const PRAYER_ORDER: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

export type PrayerRoutineDay = {
  date: string;
  completed: Partial<Record<PrayerName, boolean>>;
  updatedAt: string;
};

export type SavedDuaCategory =
  | 'gratitude'
  | 'guidance'
  | 'family'
  | 'health'
  | 'forgiveness'
  | 'study'
  | 'work'
  | 'future'
  | 'custom';

export const DUA_CATEGORY_LABELS: Record<SavedDuaCategory, string> = {
  gratitude: 'Gratitude',
  guidance: 'Guidance',
  family: 'Family',
  health: 'Health',
  forgiveness: 'Forgiveness',
  study: 'Study',
  work: 'Work',
  future: 'Future',
  custom: 'Custom',
};

export type SavedDua = {
  id: string;
  userId: EntityId;
  title: string;
  text: string;
  translation?: string;
  category: SavedDuaCategory;
  favourite: boolean;
  privateNote?: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FaithReflection = {
  id: string;
  userId: EntityId;
  prompt: string;
  body: string;
  mode: Exclude<FaithValuesMode, 'off'>;
  /** Default false — excluded from AI memory unless explicitly allowed. */
  allowMemory: boolean;
  memorySaved: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FaithIntention = {
  id: string;
  userId: EntityId;
  text: string;
  date: string;
  createdAt: string;
  updatedAt: string;
};

export type FaithValuesExport = {
  exportedAt: string;
  preferences: FaithValuesPreferences;
  intentions: FaithIntention[];
  reflections: FaithReflection[];
  duas: SavedDua[];
  prayerRoutine: PrayerRoutineDay[];
};

export function createDefaultFaithValuesPreferences(): FaithValuesPreferences {
  return {
    mode: 'off',
    enabled: false,
    onboardingCompleted: false,
    faithAwareLanguage: false,
    hideFromHome: false,
    ramadanGoalsEnabled: false,
    updatedAt: nowIso(),
  };
}

export function faithModeLabel(mode: FaithValuesMode): string {
  switch (mode) {
    case 'general':
      return 'General values & gratitude';
    case 'islam':
      return 'Islam';
    case 'personal':
      return 'Personal spirituality';
    default:
      return 'Not enabled';
  }
}

export function todayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function createFaithIntention(userId: EntityId, text: string, date = todayDateKey()): FaithIntention {
  const now = nowIso();
  return {
    id: createUuid(),
    userId,
    text: text.trim(),
    date,
    createdAt: now,
    updatedAt: now,
  };
}

export function createSavedDua(
  userId: EntityId,
  input: Pick<SavedDua, 'title' | 'text' | 'category'> & Partial<SavedDua>,
): SavedDua {
  const now = nowIso();
  return {
    id: createUuid(),
    userId,
    title: input.title.trim() || 'Untitled dua',
    text: input.text.trim(),
    translation: input.translation?.trim(),
    category: input.category,
    favourite: input.favourite ?? false,
    privateNote: input.privateNote?.trim(),
    archived: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function createFaithReflection(
  userId: EntityId,
  prompt: string,
  body: string,
  mode: Exclude<FaithValuesMode, 'off'>,
  allowMemory = false,
): FaithReflection {
  const now = nowIso();
  return {
    id: createUuid(),
    userId,
    prompt,
    body: body.trim(),
    mode,
    allowMemory,
    memorySaved: false,
    createdAt: now,
    updatedAt: now,
  };
}
