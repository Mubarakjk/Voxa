import { STORAGE_KEYS } from '../../constants/storage-keys';
import { EntityId, nowIso } from '../../types';
import { ComposerAction, ComposerActionId, ComposerPreferences } from '../../types/phase12-experiences';
import { IStorageService } from '../contracts';

export const COMPOSER_ACTIONS: ComposerAction[] = [
  { id: 'just_listen', label: 'Just listen', icon: 'ear-outline', instruction: 'Just listen to me for a moment. No advice unless I ask.', mode: 'friend' },
  { id: 'help_plan', label: 'Help me plan', icon: 'calendar-outline', instruction: 'Help me plan my next steps clearly and practically.', mode: 'assistant' },
  { id: 'motivate', label: 'Motivate me', icon: 'flash-outline', instruction: 'Motivate me — be warm and energising, not cheesy.', mode: 'coach' },
  { id: 'teach', label: 'Teach me', icon: 'school-outline', instruction: 'Teach me this step by step with examples.', mode: 'teacher' },
  { id: 'challenge_thinking', label: 'Challenge my thinking', icon: 'git-branch-outline', instruction: 'Challenge my thinking respectfully — poke holes and ask better questions.', mode: 'coach' },
  { id: 'coach_me', label: 'Coach me', icon: 'fitness-outline', instruction: 'Coach me on my current focus with one clear next action.', mode: 'coach' },
  { id: 'make_laugh', label: 'Make me laugh', icon: 'happy-outline', instruction: 'Lighten the mood — be playful and funny if it fits.', mode: 'friend' },
  { id: 'reflect', label: 'Reflect with me', icon: 'moon-outline', instruction: 'Reflect with me — thoughtful questions, no rushing to fix.', mode: 'reflection' },
  { id: 'sports_talk', label: 'Sports talk', icon: 'football-outline', instruction: "Let's talk sports — match my energy.", mode: 'friend' },
  { id: 'focus_session', label: 'Start focus session', icon: 'timer-outline', instruction: 'Help me start a focused work session.', navigateTo: 'FocusMode' },
  { id: 'add_reminder', label: 'Add reminder', icon: 'alarm-outline', instruction: 'I want to set a reminder.', navigateTo: 'CreateReminder' },
  { id: 'schedule_checkin', label: 'Schedule check-in', icon: 'notifications-outline', instruction: 'Help me schedule a Voxa check-in.', navigateTo: 'ScheduledCheckIns' },
  { id: 'start_challenge', label: 'Start challenge', icon: 'flag-outline', instruction: 'Help me pick and start a companion challenge.', navigateTo: 'CompanionChallenges' },
  { id: 'open_world', label: 'Open a World', icon: 'planet-outline', instruction: 'Suggest a conversation world that fits my mood.', navigateTo: 'ConversationWorlds' },
];

const DEFAULT_FAVOURITES: ComposerActionId[] = ['just_listen', 'help_plan', 'motivate', 'coach_me'];

export class ComposerPreferencesService {
  constructor(private readonly storage: IStorageService) {}

  async get(userId: EntityId): Promise<ComposerPreferences> {
    const map = (await this.storage.getItem<Record<string, ComposerPreferences>>(STORAGE_KEYS.composerPreferences)) ?? {};
    return map[userId] ?? { userId, favouriteActionIds: DEFAULT_FAVOURITES, recentActionIds: [], updatedAt: nowIso() };
  }

  async save(prefs: ComposerPreferences): Promise<void> {
    const map = (await this.storage.getItem<Record<string, ComposerPreferences>>(STORAGE_KEYS.composerPreferences)) ?? {};
    map[prefs.userId] = { ...prefs, updatedAt: nowIso() };
    await this.storage.setItem(STORAGE_KEYS.composerPreferences, map);
  }

  async recordUse(userId: EntityId, actionId: ComposerActionId): Promise<ComposerPreferences> {
    const prefs = await this.get(userId);
    const recent = [actionId, ...prefs.recentActionIds.filter((id) => id !== actionId)].slice(0, 8);
    const updated = { ...prefs, recentActionIds: recent, updatedAt: nowIso() };
    await this.save(updated);
    return updated;
  }

  async setFavourites(userId: EntityId, ids: ComposerActionId[]): Promise<ComposerPreferences> {
    const prefs = await this.get(userId);
    const updated = { ...prefs, favouriteActionIds: ids.slice(0, 4), updatedAt: nowIso() };
    await this.save(updated);
    return updated;
  }

  visibleShortcuts(prefs: ComposerPreferences): ComposerAction[] {
    return prefs.favouriteActionIds
      .map((id) => COMPOSER_ACTIONS.find((a) => a.id === id))
      .filter(Boolean) as ComposerAction[];
  }

  search(query: string): ComposerAction[] {
    const q = query.toLowerCase().replace(/^\//, '');
    if (!q) return COMPOSER_ACTIONS;
    return COMPOSER_ACTIONS.filter((a) => a.label.toLowerCase().includes(q) || a.id.includes(q));
  }
}

let instance: ComposerPreferencesService | null = null;

export function getComposerPreferencesService(storage: IStorageService) {
  if (!instance) instance = new ComposerPreferencesService(storage);
  return instance;
}
