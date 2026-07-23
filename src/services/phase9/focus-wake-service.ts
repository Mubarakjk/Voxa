import { STORAGE_KEYS } from '../../constants/storage-keys';
import { createUuid, EntityId, Goal, Memory, nowIso, Reminder, UserProfile } from '../../types';
import { AlarmCompanionPrefs, FocusDuration, FocusSession, WakePersonality } from '../../types/phase9-intelligence';
import { IStorageService } from '../contracts';
import { LifeCalendarSnapshot } from '../../types/phase8-retention';

export function buildWakeMessage(input: {
  profile: UserProfile;
  personality: WakePersonality;
  reminder: Reminder;
  goals: Goal[];
  calendar: LifeCalendarSnapshot;
  memories: Memory[];
}): string {
  const name = input.profile.displayName.split(' ')[0];
  const goal = input.goals.find((g) => g.status === 'active');
  const calendarLine = input.calendar.todayLine;
  const goalLine = goal ? `Today's the day you said you'd work on ${goal.title.toLowerCase()}.` : null;

  switch (input.personality) {
    case 'gentle':
      return `Morning ${name}. Take your time — ${calendarLine ?? 'a calm day ahead.'}`;
    case 'motivational':
      return `Let's go, ${name}. ${goalLine ?? calendarLine ?? 'You have got this.'}`;
    case 'funny':
      return `Rise and shine ${name} — alarm went off, not your motivation. ${calendarLine ? calendarLine : 'Coffee first?'}`;
    case 'strict':
      return `${name}. Up. ${goalLine ?? input.reminder.title}. No snooze today.`;
    case 'coach':
      return `Morning ${name}. ${goalLine ?? 'What is the one thing that matters today?'}`;
    case 'friend':
    default:
      return `Hey ${name}. ${calendarLine ?? goalLine ?? 'Good to see you this morning.'}`;
  }
}

export class WakeCompanionService {
  constructor(private readonly storage: IStorageService) {}

  async getPrefs(userId: EntityId): Promise<AlarmCompanionPrefs> {
    const map = (await this.storage.getItem<Record<string, AlarmCompanionPrefs>>(STORAGE_KEYS.alarmCompanionPrefs)) ?? {};
    return map[userId] ?? { defaultPersonality: 'friend', usePersonalisedLines: true, updatedAt: nowIso() };
  }

  async savePrefs(userId: EntityId, prefs: AlarmCompanionPrefs): Promise<void> {
    const map = (await this.storage.getItem<Record<string, AlarmCompanionPrefs>>(STORAGE_KEYS.alarmCompanionPrefs)) ?? {};
    map[userId] = prefs;
    await this.storage.setItem(STORAGE_KEYS.alarmCompanionPrefs, map);
  }
}

export class FocusModeService {
  constructor(private readonly storage: IStorageService) {}

  async getActive(userId: EntityId): Promise<FocusSession | null> {
    const map = (await this.storage.getItem<Record<string, FocusSession | null>>(STORAGE_KEYS.focusSessions)) ?? {};
    const session = map[userId];
    if (!session || session.completed) return null;
    if (new Date(session.endsAt).getTime() < Date.now()) {
      await this.complete(userId);
      return null;
    }
    return session;
  }

  async start(userId: EntityId, durationMin: FocusDuration, label: string): Promise<FocusSession> {
    const endsAt = new Date(Date.now() + durationMin * 60 * 1000).toISOString();
    const session: FocusSession = {
      id: createUuid(),
      userId,
      durationMin,
      label,
      startedAt: nowIso(),
      endsAt,
      completed: false,
      paused: false,
    };
    const map = (await this.storage.getItem<Record<string, FocusSession | null>>(STORAGE_KEYS.focusSessions)) ?? {};
    map[userId] = session;
    await this.storage.setItem(STORAGE_KEYS.focusSessions, map);
    return session;
  }

  async complete(userId: EntityId): Promise<void> {
    const map = (await this.storage.getItem<Record<string, FocusSession | null>>(STORAGE_KEYS.focusSessions)) ?? {};
    const session = map[userId];
    if (session) map[userId] = { ...session, completed: true };
    await this.storage.setItem(STORAGE_KEYS.focusSessions, map);
  }

  progressPercent(session: FocusSession): number {
    const total = session.durationMin * 60 * 1000;
    const elapsed = Date.now() - new Date(session.startedAt).getTime();
    return Math.min(100, Math.round((elapsed / total) * 100));
  }
}

let wakeInstance: WakeCompanionService | null = null;
let focusInstance: FocusModeService | null = null;

export function getWakeCompanionService(storage: IStorageService) {
  if (!wakeInstance) wakeInstance = new WakeCompanionService(storage);
  return wakeInstance;
}

export function getFocusModeService(storage: IStorageService) {
  if (!focusInstance) focusInstance = new FocusModeService(storage);
  return focusInstance;
}
