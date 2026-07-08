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

const MORNING_GREETING_ID = 'voxa-morning-greeting';
const EVENING_REFLECTION_ID = 'voxa-evening-reflection';
const DAILY_CHECKIN_ID = 'voxa-daily-checkin';

function buildTrigger(
  scheduledAt: Date,
  recurrence?: ReminderRecurrence,
): Notifications.NotificationTriggerInput {
  if (recurrence === 'daily') {
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
  return extended.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED;
}

export class NotificationService {
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

  async scheduleDailyCheckIns(
    _userId: string,
    options: { morningEnabled: boolean; eveningEnabled: boolean },
  ): Promise<void> {
    await this.cancelNotification(MORNING_GREETING_ID).catch(() => undefined);
    await this.cancelNotification(EVENING_REFLECTION_ID).catch(() => undefined);
    await this.cancelNotification(DAILY_CHECKIN_ID).catch(() => undefined);

    if (options.morningEnabled) {
      await Notifications.scheduleNotificationAsync({
        identifier: MORNING_GREETING_ID,
        content: {
          title: 'Good morning from Voxa',
          body: 'Your daily briefing is ready. How are you feeling today?',
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
          title: 'Evening reflection',
          body: 'Take a moment to reflect on your day with Voxa.',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: 21,
          minute: 0,
        },
      });
    }

    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_CHECKIN_ID,
      content: {
        title: 'Voxa check-in',
        body: 'A gentle nudge to connect with your companion.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 14,
        minute: 0,
      },
    });
  }

  async scheduleGoalReminder(goalTitle: string, scheduledAt: Date): Promise<string> {
    return this.scheduleReminder({
      title: 'Goal reminder',
      body: `Keep going on "${goalTitle}".`,
      scheduledAt,
    });
  }

  async scheduleReminderFromEntity(reminder: Reminder): Promise<string> {
    return this.scheduleReminder({
      title: reminder.title,
      body: reminder.body,
      scheduledAt: new Date(reminder.scheduledAt),
      recurrence: reminder.recurrence === 'weekdays' ? 'daily' : reminder.recurrence,
      data: { reminderId: reminder.id, kind: reminder.kind },
    });
  }

  async cancelAll(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
}

export const notificationService = new NotificationService();
