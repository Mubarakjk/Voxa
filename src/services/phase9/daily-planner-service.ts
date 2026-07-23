import { Goal, Memory, Reminder, UserProfile } from '../../types';
import { DailyPlan, DailyPlanItem } from '../../types/phase9-intelligence';
import { TodayRoutineSummary } from '../../types/routine';
import { createUuid, nowIso } from '../../types';
import { LifeCalendarSnapshot } from '../../types/phase8-retention';

export function buildDailyPlan(input: {
  profile: UserProfile;
  goals: Goal[];
  routine: TodayRoutineSummary;
  reminders: Reminder[];
  calendar: LifeCalendarSnapshot;
  todayFocus?: string;
}): DailyPlan {
  const today = new Date().toISOString().slice(0, 10);
  const firstName = input.profile.displayName.split(' ')[0];
  const items: DailyPlanItem[] = [];

  if (input.todayFocus) {
    items.push({ id: createUuid(), label: input.todayFocus, kind: 'focus', completed: false });
  }

  if (input.routine.nextBlock) {
    items.push({
      id: createUuid(),
      label: input.routine.nextBlock.title,
      kind: 'routine',
      completed: false,
    });
  }

  for (const goal of input.goals.filter((g) => g.status === 'active').slice(0, 2)) {
    items.push({ id: createUuid(), label: goal.title, kind: 'goal', completed: false });
  }

  for (const event of input.calendar.todayEvents.slice(0, 3)) {
    items.push({
      id: createUuid(),
      label: event.title,
      kind: 'reminder',
      scheduledAt: event.scheduledAt,
      completed: false,
    });
  }

  for (const reminder of input.reminders
    .filter((r) => r.status === 'scheduled' && r.scheduledAt.startsWith(today))
    .slice(0, 3)) {
    if (!items.some((i) => i.label === reminder.title)) {
      items.push({
        id: createUuid(),
        label: reminder.title,
        kind: 'reminder',
        scheduledAt: reminder.scheduledAt,
        completed: false,
      });
    }
  }

  const headline = input.calendar.todayLine
    ?? (items[0] ? `${firstName}, let's make today about ${items[0].label.toLowerCase()}.` : `Good day, ${firstName}.`);

  return {
    date: today,
    headline,
    items: items.slice(0, 6),
    generatedAt: nowIso(),
  };
}
