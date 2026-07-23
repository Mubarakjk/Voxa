import { CompanionModeId } from './companion-mode';
import { EntityId, ISODateString, Timestamps, createUuid, nowIso } from './common';

export type RoutineBlockKind =
  | 'sleep'
  | 'wake'
  | 'study'
  | 'gym'
  | 'work'
  | 'prayer'
  | 'meal'
  | 'wind_down'
  | 'custom';

export type RoutineStrictness = 'gentle' | 'balanced' | 'strict';

export type RoutineReminderStyle = 'silent' | 'notification' | 'voxa_message';

export type RoutineBlock = Timestamps & {
  id: EntityId;
  userId: EntityId;
  kind: RoutineBlockKind;
  title: string;
  /** 24-hour HH:mm */
  time: string;
  /** 0 = Sunday … 6 = Saturday */
  repeatDays: number[];
  mode?: CompanionModeId;
  strictness: RoutineStrictness;
  reminderStyle: RoutineReminderStyle;
  goalId?: EntityId;
  reminderId?: EntityId;
  enabled: boolean;
};

export type RoutineCompletionStatus = 'completed' | 'skipped' | 'snoozed';

export type RoutineDayCompletion = Timestamps & {
  id: EntityId;
  userId: EntityId;
  blockId: EntityId;
  /** YYYY-MM-DD */
  date: string;
  status: RoutineCompletionStatus;
  completedAt?: ISODateString;
  snoozedUntil?: ISODateString;
};

export type CreateRoutineBlockInput = {
  userId: EntityId;
  kind: RoutineBlockKind;
  title: string;
  time: string;
  repeatDays?: number[];
  mode?: CompanionModeId;
  strictness?: RoutineStrictness;
  reminderStyle?: RoutineReminderStyle;
  goalId?: EntityId;
};

export type UpdateRoutineBlockInput = Partial<
  Pick<
    RoutineBlock,
    | 'kind'
    | 'title'
    | 'time'
    | 'repeatDays'
    | 'mode'
    | 'strictness'
    | 'reminderStyle'
    | 'goalId'
    | 'enabled'
    | 'reminderId'
  >
>;

export type TodayRoutineSummary = {
  blocks: Array<RoutineBlock & { completion?: RoutineDayCompletion }>;
  completedCount: number;
  totalCount: number;
  completionPercent: number;
  nextBlock: RoutineBlock | null;
  streakDays: number;
};

export function createRoutineBlock(input: CreateRoutineBlockInput): RoutineBlock {
  const timestamp = nowIso();
  return {
    id: createUuid(),
    userId: input.userId,
    kind: input.kind,
    title: input.title,
    time: input.time,
    repeatDays: input.repeatDays ?? [0, 1, 2, 3, 4, 5, 6],
    mode: input.mode,
    strictness: input.strictness ?? 'balanced',
    reminderStyle: input.reminderStyle ?? 'notification',
    goalId: input.goalId,
    enabled: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export const ROUTINE_KIND_LABELS: Record<RoutineBlockKind, string> = {
  sleep: 'Sleep',
  wake: 'Wake up',
  study: 'Study',
  gym: 'Gym',
  work: 'Work',
  prayer: 'Prayer / faith',
  meal: 'Meal',
  wind_down: 'Wind down',
  custom: 'Custom',
};
