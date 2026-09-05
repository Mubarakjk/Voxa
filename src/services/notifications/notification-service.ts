import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { Reminder, ReminderRecurrence } from '../../types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type ScheduleReminderOptions = {
  title: string;
  body?: string;
  scheduledAt: Date;
  recurrence?: ReminderRecurrence;
  data?: Record<string, unknown>;
};

export const MORNING_GREETING_ID = 'voxa-morning-greeting';
export const EVENING_REFLECTION_ID = 'voxa-evening-reflection';

function buildTrigger(
  scheduledAt: Date,
  recurrence?: ReminderRecurrence,
): Notifications.NotificationTriggerInput {
  if (recurrence === 'daily' || recurrence === 'weekdays') {
    // Weekdays: schedule daily; OS cannot natively skip weekends on DAILY trigger.
    // Reminder copy remains accurate; users can edit/delete if needed.
    return {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: scheduledAt.getHours(),
      minute: scheduledAt.getMinutes(),
    };
  }
  if (recurrence === 'weekly') {
    return {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: scheduledAt.getDay() + 1,
      hour: scheduledAt.getHours(),
      minute: scheduledAt.getMinutes(),
    };
  }
  return {
    type: Notifications.SchedulableTriggerInputTypes.DATE,
    date: scheduledAt,
  };
}

function isNotificationGranted(result: Notifications.NotificationPermissionsStatus): boolean {
  const extended = result as Notifications.NotificationPermissionsStatus & {
    granted?: boolean;
    status?: string;
  };
  if (typeof extended.granted === 'boolean') return extended.granted;
  if (extended.status === 'granted') return true;
  const iosStatus = extended.ios?.status;
  return (
    iosStatus === Notifications.IosAuthorizationStatus.AUTHORIZED ||
    iosStatus === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

/** Advance a past one-shot time for recurring reminders so sync can reschedule. */
export function nextFireDate(scheduledAtIso: string, recurrence: ReminderRecurrence): Date {
  const base = new Date(scheduledAtIso);
  const now = new Date();
  if (base.getTime() > now.getTime()) return base;
  if (recurrence === 'none') return base;

  const next = new Date(now);
  next.setHours(base.getHours(), base.getMinutes(), 0, 0);

  if (recurrence === 'weekly') {
    const targetWeekday = base.getDay();
    while (next.getDay() !== targetWeekday || next.getTime() <= now.getTime()) {
      next.setDate(next.getDate() + 1);
    }
    return next;
  }

  if (recurrence === 'weekdays') {
    while (next.getDay() === 0 || next.getDay() === 6 || next.getTime() <= now.getTime()) {
      next.setDate(next.getDate() + 1);
    }
    return next;
  }

  // daily
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  return next;
}

export class NotificationService {
  async getPermissionsGranted(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    const settings = await Notifications.getPermissionsAsync();
    return isNotificationGranted(settings);
  }

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') return false;

    const settings = await Notifications.getPermissionsAsync();
    if (isNotificationGranted(settings)) return true;

    const requested = await Notifications.requestPermissionsAsync();
    return isNotificationGranted(requested);
  }

  async scheduleReminder(options: ScheduleReminderOptions): Promise<string> {
    const trigger = buildTrigger(options.scheduledAt, options.recurrence);

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: options.title,
        body: options.body,
        data: options.data,
      },
      trigger,
    });
    return id;
  }

  async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  async updateReminderNotification(
    notificationId: string | undefined,
    options: ScheduleReminderOptions,
  ): Promise<string> {
    if (notificationId) {
      await this.cancelNotification(notificationId);
    }
    return this.scheduleReminder(options);
  }

  /** Cancel only built-in daily companion check-ins (not user reminders). */
  async cancelDailyCheckIns(): Promise<void> {
    await this.cancelNotification(MORNING_GREETING_ID).catch(() => undefined);
    await this.cancelNotification(EVENING_REFLECTION_ID).catch(() => undefined);
    // Legacy midday id from earlier builds — cancel if still pending.
    await this.cancelNotification('voxa-daily-checkin').catch(() => undefined);
  }

  async scheduleDailyCheckIns(
    _userId: string,
    options: { morningEnabled: boolean; eveningEnabled: boolean },
  ): Promise<void> {
    await this.cancelDailyCheckIns();

    if (options.morningEnabled) {
      await Notifications.scheduleNotificationAsync({
        identifier: MORNING_GREETING_ID,
        content: {
          title: 'Good morning',
          body: 'Anything on your mind? Voxa’s here when you’re ready.',
          data: {
            kind: 'daily_ritual',
            ritual: 'morning',
            destination: 'talk',
            starterPrompt: 'Good morning. How are you feeling today?',
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: 8,
          minute: 0,
        },
      });
    }

    if (options.eveningEnabled) {
      await Notifications.scheduleNotificationAsync({
        identifier: EVENING_REFLECTION_ID,
        content: {
          title: 'How did today go?',
          body: 'Take a minute to reflect with Voxa.',
          data: {
            kind: 'daily_ritual',
            ritual: 'evening',
            destination: 'reflection',
            starterPrompt: 'How did today feel? I’d love a short evening check-in.',
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: 21,
          minute: 0,
        },
      });
    }
  }

  async scheduleGoalReminder(goalTitle: string, scheduledAt: Date): Promise<string> {
    return this.scheduleReminder({
      title: 'A gentle nudge',
      body: `You’ve got space for “${goalTitle}” when you’re ready.`,
      scheduledAt,
      data: { kind: 'goal_reminder', destination: 'talk' },
    });
  }

  async scheduleReminderFromEntity(reminder: Reminder): Promise<string> {
    const fireAt = nextFireDate(reminder.scheduledAt, reminder.recurrence);
    return this.scheduleReminder({
      title: reminder.title,
      body: reminder.body?.trim() || 'A reminder from Voxa.',
      scheduledAt: fireAt,
      recurrence: reminder.recurrence === 'weekdays' ? 'daily' : reminder.recurrence,
      data: {
        reminderId: reminder.id,
        kind: reminder.kind,
        destination: reminder.kind === 'check_in' ? 'talk' : 'reminder',
      },
    });
  }

  async cancelAll(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
}

export const notificationService = new NotificationService();
