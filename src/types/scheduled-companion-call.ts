/**
 * Scheduled Companion Calls V1 — local notification “incoming call” alerts.
 * Not a real telephone call. No PushKit / CallKit.
 */

export type ScheduledCallReason =
  | 'morning_motivation'
  | 'evening_reflection'
  | 'study_session'
  | 'gym_accountability'
  | 'goal_follow_up'
  | 'wake_up_check_in'
  | 'custom';

export type ScheduledCallStatus =
  | 'scheduled'
  | 'ringing'
  | 'answered'
  | 'declined'
  | 'missed'
  | 'snoozed'
  | 'cancelled'
  | 'failed';

export type ScheduledCallRepeatRule =
  | { type: 'never' }
  | { type: 'daily' }
  | { type: 'weekdays' }
  | { type: 'weekly' }
  | { type: 'custom_days'; days: number[] }; // 0=Sun … 6=Sat

export type CompanionCallTone = 'warm' | 'motivating' | 'calm' | 'coach';

export type NotificationPreviewMode = 'generic' | 'contextual';

export type ScheduledCompanionCall = {
  id: string;
  userId: string;
  title: string;
  reason: ScheduledCallReason;
  customReason?: string;
  scheduledAt: string; // UTC ISO of the first / current occurrence
  timezone: string; // IANA
  repeatRule: ScheduledCallRepeatRule;
  enabled: boolean;
  status: ScheduledCallStatus;
  notificationIds: string[];
  createdAt: string;
  updatedAt: string;
  lastTriggeredAt?: string;
  nextScheduledAt: string; // UTC ISO
  callContext?: string;
  autoStartRealtime: boolean;
  ringtoneEnabled: boolean;
  tone: CompanionCallTone;
  relatedGoalId?: string;
  relatedRoutineId?: string;
};

export type CreateScheduledCallInput = {
  title?: string;
  reason: ScheduledCallReason;
  customReason?: string;
  scheduledAt: string;
  timezone: string;
  repeatRule: ScheduledCallRepeatRule;
  callContext?: string;
  autoStartRealtime?: boolean;
  ringtoneEnabled?: boolean;
  tone?: CompanionCallTone;
  relatedGoalId?: string;
  relatedRoutineId?: string;
  enabled?: boolean;
};

export type UpdateScheduledCallInput = Partial<
  Omit<CreateScheduledCallInput, 'timezone'> & {
    timezone?: string;
    status?: ScheduledCallStatus;
    lastTriggeredAt?: string;
    nextScheduledAt?: string;
    notificationIds?: string[];
  }
>;

export type ScheduledCallsPreferences = {
  globallyEnabled: boolean;
  notificationPreview: NotificationPreviewMode;
  updatedAt: string;
};

export const SCHEDULED_CALL_REASON_LABELS: Record<ScheduledCallReason, string> = {
  morning_motivation: 'Morning motivation',
  evening_reflection: 'Evening reflection',
  study_session: 'Study session',
  gym_accountability: 'Gym accountability',
  goal_follow_up: 'Goal follow-up',
  wake_up_check_in: 'Wake-up check-in',
  custom: 'Custom',
};

export const SCHEDULED_CALL_CATEGORY = 'VOXA_SCHEDULED_CALL';
export const SCHEDULED_CALL_ACTIONS = {
  answer: 'ANSWER_CALL',
  snooze: 'SNOOZE_CALL',
  decline: 'DECLINE_CALL',
} as const;

export const SCHEDULED_CALL_NOTIFICATION_KIND = 'scheduled_companion_call';

export function createDefaultScheduledCallsPreferences(now = new Date().toISOString()): ScheduledCallsPreferences {
  return {
    globallyEnabled: true,
    notificationPreview: 'generic',
    updatedAt: now,
  };
}
