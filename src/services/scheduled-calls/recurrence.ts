import {
  ScheduledCallRepeatRule,
  ScheduledCompanionCall,
} from '../../types/scheduled-companion-call';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Extract local wall-clock parts from a Date in the device timezone. */
export function getLocalParts(date: Date): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
} {
  return {
    year: date.getFullYear(),
    month: date.getMonth(),
    day: date.getDate(),
    hour: date.getHours(),
    minute: date.getMinutes(),
    weekday: date.getDay(),
  };
}

export function combineLocalDateAndTime(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  return new Date(year, month, day, hour, minute, 0, 0);
}

export function assertFutureDate(date: Date, now = new Date()): void {
  if (date.getTime() <= now.getTime()) {
    throw new Error('Choose a date and time in the future.');
  }
}

/**
 * Compute the next occurrence strictly after `after`, using device-local wall clock
 * derived from `anchor` (the schedule's time-of-day / weekday reference).
 * `timezone` is retained on the model for display and future cross-device reconciliation.
 */
export function computeNextOccurrence(input: {
  anchor: Date;
  repeatRule: ScheduledCallRepeatRule;
  after: Date;
  timezone?: string;
}): Date | null {
  const { anchor, repeatRule, after } = input;
  const parts = getLocalParts(anchor);
  const hour = parts.hour;
  const minute = parts.minute;

  if (repeatRule.type === 'never') {
    return anchor.getTime() > after.getTime() ? new Date(anchor.getTime()) : null;
  }

  // Start searching from the calendar day of `after` (or next minute).
  let cursor = combineLocalDateAndTime(
    after.getFullYear(),
    after.getMonth(),
    after.getDate(),
    hour,
    minute,
  );
  if (cursor.getTime() <= after.getTime()) {
    cursor = new Date(cursor.getTime() + DAY_MS);
    cursor = combineLocalDateAndTime(
      cursor.getFullYear(),
      cursor.getMonth(),
      cursor.getDate(),
      hour,
      minute,
    );
  }

  for (let i = 0; i < 400; i += 1) {
    const weekday = cursor.getDay();
    let match = false;

    if (repeatRule.type === 'daily') match = true;
    else if (repeatRule.type === 'weekdays') match = weekday >= 1 && weekday <= 5;
    else if (repeatRule.type === 'weekly') match = weekday === parts.weekday;
    else if (repeatRule.type === 'custom_days') {
      match = repeatRule.days.includes(weekday);
    }

    if (match && cursor.getTime() > after.getTime()) {
      return cursor;
    }

    cursor = combineLocalDateAndTime(
      cursor.getFullYear(),
      cursor.getMonth(),
      cursor.getDate() + 1,
      hour,
      minute,
    );
  }

  return null;
}

/** Rolling window of upcoming fire times for local DATE notifications. */
export function computeUpcomingOccurrences(
  call: Pick<ScheduledCompanionCall, 'scheduledAt' | 'repeatRule' | 'timezone' | 'nextScheduledAt'>,
  after: Date,
  limit = 7,
): Date[] {
  const results: Date[] = [];
  let cursor = after;
  const anchor = new Date(call.nextScheduledAt || call.scheduledAt);

  for (let i = 0; i < limit; i += 1) {
    const next = computeNextOccurrence({
      anchor,
      repeatRule: call.repeatRule,
      after: cursor,
      timezone: call.timezone,
    });
    if (!next) break;
    results.push(next);
    cursor = next;
  }

  return results;
}

export function reasonTitle(
  reason: ScheduledCompanionCall['reason'],
  customReason?: string,
  labels?: Record<string, string>,
): string {
  if (reason === 'custom' && customReason?.trim()) return customReason.trim();
  return labels?.[reason] ?? reason;
}
