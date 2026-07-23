import { nowIso } from '../../types';
import { WidgetSnapshot } from '../../types/phase8-retention';
import { TodayRoutineSummary } from '../../types/routine';

/** Widget architecture — data layer only; native widget UI is future work. */
export function buildWidgetSnapshot(input: {
  todayFocus: string;
  routine: TodayRoutineSummary;
  moodLabel: string;
  quote: string;
  relationshipStreakDays: number;
}): WidgetSnapshot {
  return {
    todayFocus: input.todayFocus,
    routineProgress: `${input.routine.completedCount}/${input.routine.totalCount} routines`,
    moodLabel: input.moodLabel,
    quote: input.quote,
    relationshipStreakDays: input.relationshipStreakDays,
    tapAction: 'talk',
    updatedAt: nowIso(),
  };
}

export type WidgetDataProvider = {
  getSnapshot(userId: string): Promise<WidgetSnapshot | null>;
};
