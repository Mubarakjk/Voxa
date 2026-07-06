import { CompanionModeId, ReminderKind, ReminderRecurrence } from '../types';

export const REMINDER_KIND_OPTIONS: Array<{ value: ReminderKind; label: string; description: string }> = [
  { value: 'reminder', label: 'Reminder', description: 'A gentle nudge from Voxa' },
  { value: 'alarm', label: 'Alarm', description: 'A firm time-based alert' },
  { value: 'check_in', label: 'Daily check-in', description: 'Voxa reaches out to you' },
  { value: 'daily_goal', label: 'Goal reminder', description: 'Stay on track with your goals' },
];

export const REMINDER_REPEAT_OPTIONS: Array<{ value: ReminderRecurrence; label: string }> = [
  { value: 'none', label: 'None' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
];

export const REMINDER_MODE_OPTIONS: Array<{ value: CompanionModeId; label: string }> = [
  { value: 'friend', label: 'Friend' },
  { value: 'assistant', label: 'Assistant' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'coach', label: 'Coach' },
  { value: 'safe_call', label: 'Safe Call' },
  { value: 'reflection', label: 'Reflection' },
];

export const REMINDER_KIND_LABELS: Record<ReminderKind, string> = {
  reminder: 'Reminder',
  alarm: 'Alarm',
  check_in: 'Check-in',
  daily_goal: 'Goal',
};

export const REMINDER_REPEAT_LABELS: Record<ReminderRecurrence, string> = {
  none: 'Once',
  daily: 'Daily',
  weekly: 'Weekly',
  weekdays: 'Weekdays',
};
