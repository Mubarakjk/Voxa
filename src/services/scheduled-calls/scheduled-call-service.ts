import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';

import { createId, nowIso } from '../../types';
import {
  CreateScheduledCallInput,
  NotificationPreviewMode,
  SCHEDULED_CALL_ACTIONS,
  SCHEDULED_CALL_CATEGORY,
  SCHEDULED_CALL_NOTIFICATION_KIND,
  SCHEDULED_CALL_REASON_LABELS,
  ScheduledCallsPreferences,
  ScheduledCompanionCall,
  UpdateScheduledCallInput,
  createDefaultScheduledCallsPreferences,
} from '../../types/scheduled-companion-call';
import { getVoxaDisplayName } from '../../utils/companion-display';
import { IStorageService } from '../contracts/storage-service';
import { notificationService } from '../notifications/notification-service';
import {
  assertFutureDate,
  computeNextOccurrence,
  computeUpcomingOccurrences,
} from './recurrence';
import { createScheduledCallStore, ScheduledCallStore } from './scheduled-call-store';

const MAX_PENDING_NOTIFICATIONS = 7;
const SNOOZE_MS = 10 * 60 * 1000;
const categoriesReady = { current: false };

export type ScheduledCallPermissionState =
  | 'granted'
  | 'denied'
  | 'provisional'
  | 'undetermined'
  | 'unavailable';

export class ScheduledCallService {
  private readonly store: ScheduledCallStore;

  constructor(storage: IStorageService) {
    this.store = createScheduledCallStore(storage);
  }

  async ensureNotificationCategory(): Promise<void> {
    if (categoriesReady.current || Platform.OS === 'web') return;
    await Notifications.setNotificationCategoryAsync(SCHEDULED_CALL_CATEGORY, [
      {
        identifier: SCHEDULED_CALL_ACTIONS.answer,
        buttonTitle: 'Answer',
        options: { opensAppToForeground: true },
      },
      {
        identifier: SCHEDULED_CALL_ACTIONS.snooze,
        buttonTitle: 'Remind in 10 min',
        options: { opensAppToForeground: false },
      },
      {
        identifier: SCHEDULED_CALL_ACTIONS.decline,
        buttonTitle: 'Decline',
        options: { opensAppToForeground: false, isDestructive: true },
      },
    ]);
    categoriesReady.current = true;
  }

  async getPermissionState(): Promise<ScheduledCallPermissionState> {
    if (Platform.OS === 'web') return 'unavailable';
    const settings = await Notifications.getPermissionsAsync();
    const iosStatus = settings.ios?.status;
    if (iosStatus === Notifications.IosAuthorizationStatus.PROVISIONAL) return 'provisional';
    if (iosStatus === Notifications.IosAuthorizationStatus.DENIED) return 'denied';
    if (
      settings.granted ||
      iosStatus === Notifications.IosAuthorizationStatus.AUTHORIZED ||
      iosStatus === Notifications.IosAuthorizationStatus.EPHEMERAL
    ) {
      return 'granted';
    }
    return 'undetermined';
  }

  async requestPermissions(): Promise<ScheduledCallPermissionState> {
    if (Platform.OS === 'web') return 'unavailable';
    await this.ensureNotificationCategory();
    const current = await this.getPermissionState();
    if (current === 'granted' || current === 'provisional') return current;

    await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: false,
        allowSound: true,
      },
    });
    return this.getPermissionState();
  }

  async openSystemSettings(): Promise<void> {
    await Linking.openSettings();
  }

  async getPreferences(): Promise<ScheduledCallsPreferences> {
    return this.store.getPreferences();
  }

  async updatePreferences(
    patch: Partial<Pick<ScheduledCallsPreferences, 'globallyEnabled' | 'notificationPreview'>>,
  ): Promise<ScheduledCallsPreferences> {
    const current = await this.store.getPreferences();
    const next = {
      ...current,
      ...patch,
      updatedAt: nowIso(),
    };
    await this.store.setPreferences(next);
    return next;
  }

  async list(userId: string): Promise<ScheduledCompanionCall[]> {
    return this.store.list(userId);
  }

  async get(userId: string, id: string): Promise<ScheduledCompanionCall | null> {
    return this.store.get(userId, id);
  }

  async getNextUpcoming(userId: string): Promise<ScheduledCompanionCall | null> {
    const prefs = await this.store.getPreferences();
    if (!prefs.globallyEnabled) return null;
    const items = await this.store.list(userId);
    const now = Date.now();
    return (
      items.find(
        (item) =>
          item.enabled &&
          item.status !== 'cancelled' &&
          new Date(item.nextScheduledAt).getTime() >= now - 60_000,
      ) ?? null
    );
  }

  async create(
    userId: string,
    input: CreateScheduledCallInput,
    companionName?: string,
  ): Promise<ScheduledCompanionCall> {
    const scheduledAt = new Date(input.scheduledAt);
    assertFutureDate(scheduledAt);

    const prefs = await this.store.getPreferences();
    const title =
      input.title?.trim() ||
      (input.reason === 'custom' && input.customReason?.trim()
        ? input.customReason.trim()
        : SCHEDULED_CALL_REASON_LABELS[input.reason]);

    const call: ScheduledCompanionCall = {
      id: createId('scall'),
      userId,
      title,
      reason: input.reason,
      customReason: input.customReason,
      scheduledAt: scheduledAt.toISOString(),
      timezone: input.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      repeatRule: input.repeatRule,
      enabled: input.enabled ?? true,
      status: 'scheduled',
      notificationIds: [],
      createdAt: nowIso(),
      updatedAt: nowIso(),
      nextScheduledAt: scheduledAt.toISOString(),
      callContext: input.callContext?.trim() || undefined,
      autoStartRealtime: input.autoStartRealtime ?? true,
      ringtoneEnabled: input.ringtoneEnabled ?? true,
      tone: input.tone ?? 'warm',
      relatedGoalId: input.relatedGoalId,
      relatedRoutineId: input.relatedRoutineId,
    };

    await this.store.upsert(call);

    if (prefs.globallyEnabled && call.enabled) {
      await this.rescheduleNotifications(call, companionName, prefs.notificationPreview);
    }

    return (await this.store.get(userId, call.id)) ?? call;
  }

  async update(
    userId: string,
    id: string,
    patch: UpdateScheduledCallInput,
    companionName?: string,
  ): Promise<ScheduledCompanionCall> {
    const existing = await this.store.get(userId, id);
    if (!existing) throw new Error('Scheduled call not found.');

    if (patch.scheduledAt) {
      assertFutureDate(new Date(patch.scheduledAt));
    }

    const next: ScheduledCompanionCall = {
      ...existing,
      ...patch,
      title: patch.title?.trim() || existing.title,
      callContext: patch.callContext !== undefined ? patch.callContext.trim() || undefined : existing.callContext,
      updatedAt: nowIso(),
    };

    if (patch.scheduledAt) {
      next.scheduledAt = new Date(patch.scheduledAt).toISOString();
      next.nextScheduledAt = next.scheduledAt;
      next.status = 'scheduled';
    }
    if (patch.repeatRule) {
      next.repeatRule = patch.repeatRule;
    }

    await this.cancelPendingNotifications(existing);
    next.notificationIds = [];
    await this.store.upsert(next);

    const prefs = await this.store.getPreferences();
    if (prefs.globallyEnabled && next.enabled && next.status !== 'cancelled') {
      await this.rescheduleNotifications(next, companionName, prefs.notificationPreview);
    }

    return (await this.store.get(userId, id))!;
  }

  async setEnabled(
    userId: string,
    id: string,
    enabled: boolean,
    companionName?: string,
  ): Promise<void> {
    const existing = await this.store.get(userId, id);
    if (!existing) return;
    await this.cancelPendingNotifications(existing);
    const next: ScheduledCompanionCall = {
      ...existing,
      enabled,
      notificationIds: [],
      status: enabled ? 'scheduled' : 'cancelled',
      updatedAt: nowIso(),
    };
    if (enabled) {
      const nextAt = computeNextOccurrence({
        anchor: new Date(existing.scheduledAt),
        repeatRule: existing.repeatRule,
        after: new Date(Date.now() - 1000),
        timezone: existing.timezone,
      });
      if (nextAt) next.nextScheduledAt = nextAt.toISOString();
      next.status = 'scheduled';
    }
    await this.store.upsert(next);
    const prefs = await this.store.getPreferences();
    if (enabled && prefs.globallyEnabled) {
      await this.rescheduleNotifications(next, companionName, prefs.notificationPreview);
    }
  }

  async cancel(userId: string, id: string): Promise<void> {
    const existing = await this.store.get(userId, id);
    if (!existing) return;
    await this.cancelPendingNotifications(existing);
    await this.store.upsert({
      ...existing,
      enabled: false,
      status: 'cancelled',
      notificationIds: [],
      updatedAt: nowIso(),
    });
  }

  async delete(userId: string, id: string): Promise<void> {
    const existing = await this.store.get(userId, id);
    if (existing) await this.cancelPendingNotifications(existing);
    await this.store.remove(userId, id);
  }

  async handleAnswer(userId: string, id: string): Promise<ScheduledCompanionCall | null> {
    const existing = await this.store.get(userId, id);
    if (!existing) return null;
    await this.cancelPendingNotifications(existing);
    const answered: ScheduledCompanionCall = {
      ...existing,
      status: 'answered',
      lastTriggeredAt: nowIso(),
      notificationIds: [],
      updatedAt: nowIso(),
    };
    await this.store.upsert(answered);
    await this.advanceAfterTerminal(answered);
    return this.store.get(userId, id);
  }

  async handleDecline(userId: string, id: string, companionName?: string): Promise<void> {
    const existing = await this.store.get(userId, id);
    if (!existing) return;
    await this.cancelPendingNotifications(existing);
    const declined: ScheduledCompanionCall = {
      ...existing,
      status: 'declined',
      lastTriggeredAt: nowIso(),
      notificationIds: [],
      updatedAt: nowIso(),
    };
    await this.store.upsert(declined);
    await this.advanceAfterTerminal(declined, companionName);
  }

  async handleSnooze(userId: string, id: string, companionName?: string): Promise<void> {
    const existing = await this.store.get(userId, id);
    if (!existing) return;
    await this.cancelPendingNotifications(existing);

    const snoozeAt = new Date(Date.now() + SNOOZE_MS);
    const snoozed: ScheduledCompanionCall = {
      ...existing,
      status: 'snoozed',
      nextScheduledAt: snoozeAt.toISOString(),
      notificationIds: [],
      lastTriggeredAt: nowIso(),
      updatedAt: nowIso(),
      enabled: true,
    };
    await this.store.upsert(snoozed);

    const prefs = await this.store.getPreferences();
    if (prefs.globallyEnabled) {
      await this.rescheduleNotifications(snoozed, companionName, prefs.notificationPreview);
    }
  }

  /**
   * Mark expired unanswered one-shot / due occurrences as missed.
   */
  async markMissedCalls(userId: string): Promise<ScheduledCompanionCall[]> {
    const items = await this.store.list(userId);
    const now = Date.now();
    const missed: ScheduledCompanionCall[] = [];
    const GRACE_MS = 2 * 60 * 1000;

    for (const item of items) {
      if (!item.enabled) continue;
      if (item.status === 'cancelled' || item.status === 'answered' || item.status === 'declined') {
        continue;
      }
      const due = new Date(item.nextScheduledAt).getTime();
      if (due + GRACE_MS >= now) continue;

      await this.cancelPendingNotifications(item);
      const updated: ScheduledCompanionCall = {
        ...item,
        status: 'missed',
        lastTriggeredAt: nowIso(),
        notificationIds: [],
        updatedAt: nowIso(),
      };
      await this.store.upsert(updated);
      missed.push(updated);
      await this.advanceAfterTerminal(updated);
    }

    return missed;
  }

  async reconcile(userId: string, companionName?: string): Promise<ScheduledCompanionCall[]> {
    if (reconcileInFlight) {
      await reconcileInFlight;
      return [];
    }

    let missed: ScheduledCompanionCall[] = [];

    reconcileInFlight = (async () => {
      await this.ensureNotificationCategory();
      missed = await this.markMissedCalls(userId);

      const prefs = await this.store.getPreferences();
      const items = await this.store.list(userId);

      for (const item of items) {
        await this.cancelPendingNotifications(item);
        const cleared = { ...item, notificationIds: [] as string[], updatedAt: nowIso() };
        await this.store.upsert(cleared);

        if (
          !prefs.globallyEnabled ||
          !cleared.enabled ||
          cleared.status === 'cancelled' ||
          cleared.status === 'answered' ||
          cleared.status === 'declined'
        ) {
          continue;
        }

        let nextAt = new Date(cleared.nextScheduledAt);
        if (nextAt.getTime() <= Date.now() && cleared.status !== 'snoozed') {
          const computed = computeNextOccurrence({
            anchor: new Date(cleared.scheduledAt),
            repeatRule: cleared.repeatRule,
            after: new Date(),
            timezone: cleared.timezone,
          });
          if (!computed) {
            await this.store.upsert({ ...cleared, enabled: false, status: 'cancelled' });
            continue;
          }
          nextAt = computed;
          await this.store.upsert({
            ...cleared,
            nextScheduledAt: nextAt.toISOString(),
            status: 'scheduled',
          });
        }

        const fresh = (await this.store.get(userId, cleared.id))!;
        await this.rescheduleNotifications(fresh, companionName, prefs.notificationPreview);
      }
    })().finally(() => {
      reconcileInFlight = null;
    });

    await reconcileInFlight;
    return missed;
  }

  private async advanceAfterTerminal(
    call: ScheduledCompanionCall,
    companionName?: string,
  ): Promise<void> {
    if (call.repeatRule.type === 'never') {
      await this.store.upsert({
        ...call,
        enabled: false,
        status: call.status === 'answered' || call.status === 'declined' || call.status === 'missed'
          ? call.status
          : 'cancelled',
        notificationIds: [],
        updatedAt: nowIso(),
      });
      return;
    }

    const next = computeNextOccurrence({
      anchor: new Date(call.scheduledAt),
      repeatRule: call.repeatRule,
      after: new Date(),
      timezone: call.timezone,
    });

    if (!next) {
      await this.store.upsert({
        ...call,
        enabled: false,
        status: 'cancelled',
        notificationIds: [],
        updatedAt: nowIso(),
      });
      return;
    }

    const advanced: ScheduledCompanionCall = {
      ...call,
      nextScheduledAt: next.toISOString(),
      status: 'scheduled',
      enabled: true,
      notificationIds: [],
      updatedAt: nowIso(),
    };
    await this.store.upsert(advanced);
    const prefs = await this.store.getPreferences();
    if (prefs.globallyEnabled) {
      await this.rescheduleNotifications(advanced, companionName, prefs.notificationPreview);
    }
  }

  private async cancelPendingNotifications(call: ScheduledCompanionCall): Promise<void> {
    for (const id of call.notificationIds ?? []) {
      await notificationService.cancelNotification(id).catch(() => undefined);
    }
  }

  private notificationIdFor(callId: string, when: Date): string {
    return `voxa-scall-${callId}-${when.getTime()}`;
  }

  private async rescheduleNotifications(
    call: ScheduledCompanionCall,
    companionName?: string,
    preview: NotificationPreviewMode = 'generic',
  ): Promise<void> {
    await this.ensureNotificationCategory();
    await this.cancelPendingNotifications(call);

    const permission = await this.getPermissionState();
    if (permission === 'denied' || permission === 'unavailable') {
      await this.store.upsert({ ...call, notificationIds: [], updatedAt: nowIso() });
      return;
    }

    if (!call.enabled || call.status === 'cancelled' || call.status === 'answered' || call.status === 'declined') {
      await this.store.upsert({ ...call, notificationIds: [], updatedAt: nowIso() });
      return;
    }

    const name = companionName?.trim() || 'Voxa';
    const body =
      preview === 'contextual'
        ? call.title || SCHEDULED_CALL_REASON_LABELS[call.reason]
        : 'Your scheduled companion call is ready.';

    // Snooze must create exactly one replacement notification.
    const occurrences =
      call.status === 'snoozed'
        ? [new Date(call.nextScheduledAt)].filter((d) => d.getTime() > Date.now())
        : computeUpcomingOccurrences(call, new Date(Date.now() - 1000), MAX_PENDING_NOTIFICATIONS);

    const ids: string[] = [];

    for (const when of occurrences.slice(0, MAX_PENDING_NOTIFICATIONS)) {
      if (when.getTime() <= Date.now()) continue;
      const identifier = this.notificationIdFor(call.id, when);
      await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => undefined);

      const id = await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          title: `Incoming call from ${name}`,
          body,
          sound: call.ringtoneEnabled ? true : false,
          categoryIdentifier: SCHEDULED_CALL_CATEGORY,
          data: {
            kind: SCHEDULED_CALL_NOTIFICATION_KIND,
            scheduledCallId: call.id,
            route: 'RealtimeCall',
            reasonType: call.reason,
            autoStartRealtime: call.autoStartRealtime,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: when,
        },
      });
      ids.push(id);
    }

    await this.store.upsert({
      ...call,
      notificationIds: ids,
      updatedAt: nowIso(),
    });
  }
}

let instance: ScheduledCallService | null = null;
let reconcileInFlight: Promise<void> | null = null;

export function getScheduledCallService(storage: IStorageService): ScheduledCallService {
  if (!instance) instance = new ScheduledCallService(storage);
  return instance;
}

export function resetScheduledCallServiceForTests(): void {
  instance = null;
  categoriesReady.current = false;
  reconcileInFlight = null;
}

export { createDefaultScheduledCallsPreferences, getVoxaDisplayName };
