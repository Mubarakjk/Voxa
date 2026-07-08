import { UserProfile } from '../../types';
import { TodayRoutineSummary } from '../../types/routine';

export type RoutineProactiveMessage = {
  id: string;
  message: string;
  blockTitle?: string;
  kind: 'upcoming' | 'check_in' | 'progress' | 'reschedule';
};

/**
 * Architecture for proactive routine nudges.
 * No push notifications in Expo Go — messages surface in Home/Talk only.
 */
export class RoutineProactiveService {
  generateMessages(
    profile: UserProfile,
    summary: TodayRoutineSummary,
    now = new Date(),
  ): RoutineProactiveMessage[] {
    if (this.isQuietHours(profile, now)) return [];

    const messages: RoutineProactiveMessage[] = [];
    const maxMessages = 1;

    const next = summary.nextBlock;
    if (next) {
      const diff = minutesUntil(next.time, now);
      if (diff > 0 && diff <= 15) {
        messages.push({
          id: `upcoming-${next.id}`,
          message: `It's almost time for ${next.title.toLowerCase()}.`,
          blockTitle: next.title,
          kind: 'upcoming',
        });
      } else if (diff > -30 && diff <= 0) {
        messages.push({
          id: `checkin-${next.id}`,
          message: `You said ${next.title.toLowerCase()} at ${formatDisplayTime(next.time)}. Still going?`,
          blockTitle: next.title,
          kind: 'check_in',
        });
      }
    }

    if (summary.totalCount >= 2 && messages.length < maxMessages) {
      messages.push({
        id: 'progress-today',
        message: `You're ${summary.completedCount}/${summary.totalCount} through today's routine.`,
        kind: 'progress',
      });
    }

    if (messages.length < maxMessages && next && summary.completedCount > 0) {
      messages.push({
        id: 'reschedule-offer',
        message: 'Want to move this block or skip it?',
        blockTitle: next.title,
        kind: 'reschedule',
      });
    }

    return messages.slice(0, maxMessages);
  }

  private isQuietHours(profile: UserProfile, now: Date): boolean {
    const start = profile.preferences.quietHoursStart;
    const end = profile.preferences.quietHoursEnd;
    if (!start || !end) return false;

    const current = now.getHours() * 60 + now.getMinutes();
    const startMin = parseClock(start);
    const endMin = parseClock(end);
    if (startMin == null || endMin == null) return false;

    if (startMin <= endMin) {
      return current >= startMin && current < endMin;
    }
    return current >= startMin || current < endMin;
  }
}

function parseClock(value: string): number | null {
  const [h, m] = value.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function minutesUntil(time: string, now: Date): number {
  const [h, m] = time.split(':').map(Number);
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 60_000);
}

function formatDisplayTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const meridiem = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour}${meridiem}` : `${hour}:${String(m).padStart(2, '0')}${meridiem}`;
}

export const routineProactiveService = new RoutineProactiveService();
