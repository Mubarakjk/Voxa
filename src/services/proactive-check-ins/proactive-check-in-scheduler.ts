import { UserProfile } from '../../types';
import { notificationService } from '../notifications/notification-service';

export type ScheduleProactiveCheckInInput = {
  userId: string;
  profile: UserProfile;
  scheduledAt: Date;
  message: string;
  templateId: string;
};

export class ProactiveCheckInScheduler {
  async cancelPending(notificationId?: string): Promise<void> {
    if (!notificationId) return;
    await notificationService.cancelNotification(notificationId).catch(() => undefined);
  }

  isQuietHours(profile: UserProfile, when: Date): boolean {
    const start = profile.preferences.quietHoursStart;
    const end = profile.preferences.quietHoursEnd;
    if (!start || !end) return false;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const mins = when.getHours() * 60 + when.getMinutes();
    const startM = sh * 60 + sm;
    const endM = eh * 60 + em;
    if (startM <= endM) return mins >= startM && mins <= endM;
    return mins >= startM || mins <= endM;
  }

  shiftOutOfQuietHours(profile: UserProfile, when: Date): Date {
    if (!this.isQuietHours(profile, when)) return when;
    const end = profile.preferences.quietHoursEnd ?? '08:00';
    const [eh, em] = end.split(':').map(Number);
    const shifted = new Date(when);
    shifted.setHours(eh, em, 0, 0);
    if (shifted.getTime() <= when.getTime()) shifted.setDate(shifted.getDate() + 1);
    return shifted;
  }

  async schedule(input: ScheduleProactiveCheckInInput, existingNotificationId?: string): Promise<string | null> {
    if (input.profile.preferences.checkInStyle === 'off') return null;
    if (input.profile.onboarding?.notificationPreference === 'off') return null;

    const granted = await notificationService.requestPermissions();
    if (!granted) return null;

    await this.cancelPending(existingNotificationId);

    const when = this.shiftOutOfQuietHours(input.profile, input.scheduledAt);
    if (when.getTime() <= Date.now()) return null;

    const id = await notificationService.scheduleReminder({
      title: 'Voxa check-in',
      body: input.message,
      scheduledAt: when,
      data: {
        kind: 'proactive_check_in',
        userId: input.userId,
        templateId: input.templateId,
        starterPrompt: input.message,
      },
    });
    return id;
  }

  async deliverNow(input: ScheduleProactiveCheckInInput): Promise<string | null> {
    if (input.profile.preferences.checkInStyle === 'off') return null;
    if (input.profile.onboarding?.notificationPreference === 'off') return null;

    const granted = await notificationService.requestPermissions();
    if (!granted) return null;

    const when = this.shiftOutOfQuietHours(input.profile, new Date(Date.now() + 1500));
    return notificationService.scheduleReminder({
      title: 'Voxa check-in',
      body: input.message,
      scheduledAt: when,
      data: {
        kind: 'proactive_check_in',
        userId: input.userId,
        templateId: input.templateId,
        starterPrompt: input.message,
      },
    });
  }
}

export const proactiveCheckInScheduler = new ProactiveCheckInScheduler();
