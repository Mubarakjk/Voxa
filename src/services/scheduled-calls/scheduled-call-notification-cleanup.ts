import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

import { isScheduledCallsEnabled } from '../../config/scheduled-calls';
import { IStorageService } from '../contracts';
import { getScheduledCallService } from './scheduled-call-service';
import { SCHEDULED_CALL_NOTIFICATION_KIND } from '../../types/scheduled-companion-call';

const MIGRATION_KEY = '@voxa/mig_cancel_scheduled_call_notifs_v1';

/**
 * One-time: cancel only Voxa scheduled-call notifications when the feature is off.
 * Does not clear ordinary reminders or check-ins.
 */
export async function runScheduledCallNotificationCleanup(
  storage: IStorageService,
  userId?: string,
): Promise<{ cancelled: number; skipped: boolean }> {
  if (isScheduledCallsEnabled()) {
    return { cancelled: 0, skipped: true };
  }

  const done = await AsyncStorage.getItem(MIGRATION_KEY);
  if (done === '1') {
    return { cancelled: 0, skipped: true };
  }

  let cancelled = 0;

  try {
    const presented = await Notifications.getPresentedNotificationsAsync();
    for (const item of presented) {
      const data = item.request.content.data as Record<string, unknown> | undefined;
      if (data?.kind === SCHEDULED_CALL_NOTIFICATION_KIND) {
        await Notifications.dismissNotificationAsync(item.request.identifier).catch(() => undefined);
        cancelled += 1;
      }
    }
  } catch {
    // ignore — non-fatal
  }

  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const item of scheduled) {
      const data = item.content.data as Record<string, unknown> | undefined;
      const id = item.identifier;
      const isVoxaScall =
        data?.kind === SCHEDULED_CALL_NOTIFICATION_KIND ||
        (typeof id === 'string' && id.startsWith('voxa-scall-'));
      if (isVoxaScall) {
        await Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined);
        cancelled += 1;
      }
    }
  } catch {
    // ignore
  }

  if (userId) {
    try {
      const svc = getScheduledCallService(storage);
      const calls = await svc.list(userId);
      for (const call of calls) {
        for (const nid of call.notificationIds ?? []) {
          await Notifications.cancelScheduledNotificationAsync(nid).catch(() => undefined);
          cancelled += 1;
        }
      }
    } catch {
      // store may be empty
    }
  }

  await AsyncStorage.setItem(MIGRATION_KEY, '1');
  return { cancelled, skipped: false };
}
