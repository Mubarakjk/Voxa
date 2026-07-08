import { EntityId, ISODateString, Timestamps } from './common';

export type GoalCategory =
  | 'fitness'
  | 'study'
  | 'business'
  | 'productivity'
  | 'emotional'
  | 'money'
  | 'general';

export type GoalStatus = 'active' | 'paused' | 'completed';

export type Goal = Timestamps & {
  id: EntityId;
  userId: EntityId;
  title: string;
  description?: string;
  category: GoalCategory;
  status: GoalStatus;
  /** 0–100 */
  progress: number;
  targetDate?: ISODateString;
  linkedReminderId?: EntityId;
};

export type CreateGoalInput = {
  userId: EntityId;
  title: string;
  description?: string;
  category: GoalCategory;
  status?: GoalStatus;
  progress?: number;
  targetDate?: ISODateString;
  linkedReminderId?: EntityId;
};

export type UpdateGoalInput = Partial<
  Pick<
    Goal,
    'title' | 'description' | 'category' | 'status' | 'progress' | 'targetDate' | 'linkedReminderId'
  >
>;
