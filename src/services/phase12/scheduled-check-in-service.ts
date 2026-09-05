import { STORAGE_KEYS } from '../../constants/storage-keys';
import { createUuid, EntityId, nowIso } from '../../types';
import {
  CheckInHistoryEntry,
  CheckInStyle,
  CheckInTemplate,
  NotificationPermissionState,
  ScheduledCheckIn,
} from '../../types/phase12-experiences';
import { IStorageService } from '../contracts';
import { notificationService } from '../notifications/notification-service';

const STYLE_BODIES: Record<CheckInStyle, (title: string) => string> = {
  gentle: (t) => `A gentle check-in: ${t}`,
  friendly: (t) => `Hey — time for your scheduled check-in: ${t}`,
  motivational: (t) => `You've got this. ${t}`,
  funny: (t) => `Quick vibe check: ${t} 😄`,
  direct: (t) => `${t} — let's talk.`,
  coach: (t) => `Coach check-in: ${t}`,
  calm: (t) => `Take a breath. ${t}`,
};

function nextOccurrence(checkIn: ScheduledCheckIn): Date {
  const base = new Date(checkIn.scheduledAt);
  const now = new Date();
  if (base.getTime() > now.getTime()) return base;
  if (checkIn.recurrence === 'daily') {
    const d = new Date();
    d.setHours(base.getHours(), base.getMinutes(), 0, 0);
    if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 1);
    return d;
  }
  if (checkIn.recurrence === 'weekdays') {
    const d = new Date();
    d.setHours(base.getHours(), base.getMinutes(), 0, 0);
    while (d.getDay() === 0 || d.getDay() === 6 || d.getTime() <= now.getTime()) {
      d.setDate(d.getDate() + 1);
    }
    return d;
  }
  return base;
}

export class ScheduledCheckInService {
  constructor(private readonly storage: IStorageService) {}

  private async listAll(): Promise<ScheduledCheckIn[]> {
    const map = (await this.storage.getItem<Record<string, ScheduledCheckIn[]>>(STORAGE_KEYS.scheduledCheckIns)) ?? {};
    return Object.values(map).flat();
  }

  async list(userId: EntityId): Promise<ScheduledCheckIn[]> {
    const map = (await this.storage.getItem<Record<string, ScheduledCheckIn[]>>(STORAGE_KEYS.scheduledCheckIns)) ?? {};
    return (map[userId] ?? []).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  }

  async getNext(userId: EntityId): Promise<ScheduledCheckIn | null> {
    const items = (await this.list(userId)).filter((c) => c.enabled);
    if (!items.length) return null;
    return items.sort((a, b) => nextOccurrence(a).getTime() - nextOccurrence(b).getTime())[0] ?? null;
  }

  async getPermissionState(): Promise<NotificationPermissionState> {
    const granted = await notificationService.getPermissionsGranted();
    return granted ? 'granted' : 'denied';
  }

  async create(userId: EntityId, input: Omit<ScheduledCheckIn, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'notificationId'>): Promise<ScheduledCheckIn> {
    const checkIn: ScheduledCheckIn = {
      ...input,
      id: createUuid(),
      userId,
      notificationId: undefined,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    await this.save(userId, checkIn);
    if (checkIn.enabled) await this.scheduleNotification(checkIn);
    return checkIn;
  }

  async update(userId: EntityId, checkIn: ScheduledCheckIn): Promise<ScheduledCheckIn> {
    const updated = { ...checkIn, updatedAt: nowIso() };
    if (updated.notificationId) {
      await notificationService.cancelNotification(updated.notificationId).catch(() => undefined);
      updated.notificationId = undefined;
    }
    await this.save(userId, updated);
    if (updated.enabled) await this.scheduleNotification(updated);
    return updated;
  }

  async toggle(userId: EntityId, id: EntityId, enabled: boolean): Promise<ScheduledCheckIn | null> {
    const items = await this.list(userId);
    const item = items.find((c) => c.id === id);
    if (!item) return null;
    return this.update(userId, { ...item, enabled });
  }

  async delete(userId: EntityId, id: EntityId): Promise<void> {
    const items = await this.list(userId);
    const item = items.find((c) => c.id === id);
    if (item?.notificationId) {
      await notificationService.cancelNotification(item.notificationId).catch(() => undefined);
    }
    const map = (await this.storage.getItem<Record<string, ScheduledCheckIn[]>>(STORAGE_KEYS.scheduledCheckIns)) ?? {};
    map[userId] = items.filter((c) => c.id !== id);
    await this.storage.setItem(STORAGE_KEYS.scheduledCheckIns, map);
  }

  async recordHistory(entry: Omit<CheckInHistoryEntry, 'id'>): Promise<void> {
    const map = (await this.storage.getItem<Record<string, CheckInHistoryEntry[]>>(STORAGE_KEYS.checkInHistory)) ?? {};
    const list = map[entry.userId] ?? [];
    map[entry.userId] = [{ ...entry, id: createUuid() }, ...list].slice(0, 100);
    await this.storage.setItem(STORAGE_KEYS.checkInHistory, map);
  }

  async history(userId: EntityId): Promise<CheckInHistoryEntry[]> {
    const map = (await this.storage.getItem<Record<string, CheckInHistoryEntry[]>>(STORAGE_KEYS.checkInHistory)) ?? {};
    return map[userId] ?? [];
  }

  buildOpeningMessage(checkIn: ScheduledCheckIn): string {
    return checkIn.openingMessage ?? STYLE_BODIES[checkIn.style](checkIn.title);
  }

  private async save(userId: EntityId, checkIn: ScheduledCheckIn): Promise<void> {
    const map = (await this.storage.getItem<Record<string, ScheduledCheckIn[]>>(STORAGE_KEYS.scheduledCheckIns)) ?? {};
    const items = map[userId] ?? [];
    const idx = items.findIndex((c) => c.id === checkIn.id);
    if (idx >= 0) items[idx] = checkIn;
    else items.push(checkIn);
    map[userId] = items;
    await this.storage.setItem(STORAGE_KEYS.scheduledCheckIns, map);
  }

  private async scheduleNotification(checkIn: ScheduledCheckIn): Promise<void> {
    const granted = await notificationService.requestPermissions();
    if (!granted) return;
    const when = nextOccurrence(checkIn);
    const body = this.buildOpeningMessage(checkIn);
    const recurrence =
      checkIn.recurrence === 'once'
        ? undefined
        : checkIn.recurrence === 'weekdays'
          ? 'daily'
          : checkIn.recurrence === 'custom_days'
            ? 'weekly'
            : checkIn.recurrence;
    const id = await notificationService.scheduleReminder({
      title: 'Time for a check-in',
      body,
      scheduledAt: when,
      recurrence: recurrence as 'daily' | 'weekly' | undefined,
      data: {
        kind: 'scheduled_check_in',
        checkInId: checkIn.id,
        starterPrompt: body,
      },
    });
    await this.save(checkIn.userId, { ...checkIn, notificationId: id, updatedAt: nowIso() });
  }
}

let instance: ScheduledCheckInService | null = null;

export function getScheduledCheckInService(storage: IStorageService) {
  if (!instance) instance = new ScheduledCheckInService(storage);
  return instance;
}

export const CHECK_IN_TEMPLATES: Array<{ id: CheckInTemplate; label: string; defaultTitle: string }> = [
  { id: 'morning', label: 'Every morning', defaultTitle: 'Morning check-in' },
  { id: 'evening', label: 'Every evening', defaultTitle: 'Evening reflection' },
  { id: 'before_interview', label: 'Before an interview', defaultTitle: 'Pre-interview boost' },
  { id: 'before_exam', label: 'Before an exam', defaultTitle: 'Pre-exam calm' },
  { id: 'before_gym', label: 'Before the gym', defaultTitle: 'Gym time' },
  { id: 'after_work', label: 'After work', defaultTitle: 'Wind down after work' },
  { id: 'after_event', label: 'After a planned event', defaultTitle: 'How did it go?' },
  { id: 'missed_routine', label: 'After a missed routine', defaultTitle: 'Gentle nudge' },
  { id: 'custom', label: 'Custom date & time', defaultTitle: 'My check-in' },
];
