import { CompanionModeId } from './companion-mode';
import { EntityId, ISODateString, Timestamps } from './common';

export type ReminderKind = 'reminder' | 'alarm' | 'check_in' | 'daily_goal';

export type ReminderStatus = 'scheduled' | 'completed' | 'snoozed' | 'cancelled';

export type ReminderRecurrence = 'none' | 'daily' | 'weekly' | 'weekdays';

/**
 * Scheduled touchpoints Voxa can use for reminders, alarms, goals, and proactive check-ins.
 * Future: Voxa may initiate voice calls based on check_in entries.
 */
export type Reminder = Timestamps & {
  id: EntityId;
  userId: EntityId;
  kind: ReminderKind;
  title: string;
  body?: string;
  scheduledAt: ISODateString;
  recurrence: ReminderRecurrence;
  status: ReminderStatus;
  mode?: CompanionModeId;
  /** When true, Voxa may place a proactive voice call at scheduledAt */
  allowProactiveCall: boolean;
  completedAt?: ISODateString;
  /** Optional link to a tracked goal */
  goalId?: EntityId;
  /** Expo notification identifier when scheduled */
  notificationId?: string;
};

export type CreateReminderInput = {
  userId: EntityId;
  kind: ReminderKind;
  title: string;
  body?: string;
  scheduledAt: ISODateString;
  recurrence?: ReminderRecurrence;
  mode?: CompanionModeId;
  allowProactiveCall?: boolean;
  goalId?: EntityId;
};

export type UpdateReminderInput = Partial<
  Pick<
    Reminder,
    | 'title'
    | 'body'
    | 'scheduledAt'
    | 'recurrence'
    | 'status'
    | 'mode'
    | 'allowProactiveCall'
    | 'completedAt'
    | 'notificationId'
  >
>;
