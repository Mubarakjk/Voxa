import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '../../constants/storage-keys';

export type CompanionFocusState = {
  userId: string;
  /** Short human focus line, e.g. "finishing Life OS" */
  focus: string;
  /** Optional prior focus for "yesterday you worked on…" */
  previousFocus?: string;
  updatedAt: string;
};

export async function getCompanionFocusState(userId: string): Promise<CompanionFocusState | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.companionFocusState);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CompanionFocusState;
    if (parsed.userId !== userId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function upsertCompanionFocusState(input: {
  userId: string;
  focus: string;
}): Promise<CompanionFocusState> {
  const focus = input.focus.trim().slice(0, 120);
  const existing = await getCompanionFocusState(input.userId);
  const today = new Date().toISOString().slice(0, 10);
  const prevDay = existing?.updatedAt?.slice(0, 10);
  const previousFocus =
    existing && prevDay && prevDay !== today && existing.focus !== focus
      ? existing.focus
      : existing?.previousFocus;

  const next: CompanionFocusState = {
    userId: input.userId,
    focus,
    previousFocus,
    updatedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(STORAGE_KEYS.companionFocusState, JSON.stringify(next));
  return next;
}
