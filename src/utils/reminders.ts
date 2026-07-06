import { COMPANION_MODES } from '../constants/companion-modes';
import {
  REMINDER_KIND_LABELS,
  REMINDER_REPEAT_LABELS,
} from '../constants/reminder-options';
import { CompanionModeId, Reminder, ReminderKind } from '../types';

export function combineDateAndTime(date: Date, time: Date): Date {
  const combined = new Date(date);
  combined.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return combined;
}

export function formatReminderDateTime(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatReminderTime(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function getModeLabel(mode?: CompanionModeId): string {
  if (!mode) return 'Friend';
  return COMPANION_MODES[mode].shortLabel;
}

export function buildVoxaCheckInConfirmation(reminder: Reminder): string {
  const when = formatReminderDateTime(reminder.scheduledAt);
  const mode = getModeLabel(reminder.mode);
  const repeat =
    reminder.recurrence === 'none' ? '' : ` · Repeats ${REMINDER_REPEAT_LABELS[reminder.recurrence].toLowerCase()}`;

  if (reminder.kind === 'check_in' || reminder.kind === 'daily_goal') {
    return `Voxa will check in at ${when} in ${mode} mode${repeat}.`;
  }

  return `Voxa will remind you at ${when} in ${mode} mode${repeat}.`;
}

export function getReminderKindLabel(kind: ReminderKind): string {
  return REMINDER_KIND_LABELS[kind];
}

export function getUpcomingReminders(reminders: Reminder[], limit = 5): Reminder[] {
  const now = new Date().toISOString();
  return reminders
    .filter((item) => item.status === 'scheduled' && item.scheduledAt >= now)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
    .slice(0, limit);
}
