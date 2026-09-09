/**
 * Deterministic relative-time parsing against a message's local timezone.
 * Never uses an LLM. Vague phrases keep vague precision — no fake exact clocks.
 */

export type TemporalPrecision = 'time' | 'day' | 'range' | 'vague';
export type TemporalSource = 'relative' | 'stated';
export type TemporalConfidence = 'high' | 'medium' | 'low';

export type TemporalParseContext = {
  now: Date;
  timeZone: string;
};

export type ParsedTemporal = {
  occurredAt: string;
  endsAt?: string;
  expiresAt: string;
  precision: TemporalPrecision;
  source: TemporalSource;
  temporalConfidence: TemporalConfidence;
  isFutureEvent: boolean;
  isPastEvent: boolean;
  label: string;
  matchedPhrase: string;
};

export type ZonedCivil = {
  timeZone: string;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number;
};

const WEEKDAY_INDEX: Record<string, number> = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
};

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export function resolveDeviceTimeZone(explicit?: string | null): string {
  const trimmed = explicit?.trim();
  if (trimmed) return trimmed;
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function getTimeZoneOffsetMs(timeZone: string, instant: Date): number {
  const parts = zonedPartMap(instant, timeZone);
  const hour = parts.hour === 24 ? 0 : parts.hour;
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, hour, parts.minute, parts.second);
  return asUtc - instant.getTime();
}

export function zonedLocalToUtc(
  timeZone: string,
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
): Date {
  const civilUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  let offset = getTimeZoneOffsetMs(timeZone, new Date(civilUtc));
  let resolved = civilUtc - offset;
  offset = getTimeZoneOffsetMs(timeZone, new Date(resolved));
  resolved = civilUtc - offset;
  return new Date(resolved);
}

export function instantToZoned(instant: Date, timeZone: string): ZonedCivil {
  const parts = zonedPartMap(instant, timeZone);
  return {
    timeZone,
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour === 24 ? 0 : parts.hour,
    minute: parts.minute,
    second: parts.second,
    weekday: parts.weekday,
  };
}

export function addCalendarDays(civil: Pick<ZonedCivil, 'year' | 'month' | 'day'>, days: number): {
  year: number;
  month: number;
  day: number;
} {
  const utc = Date.UTC(civil.year, civil.month - 1, civil.day + days, 12, 0, 0);
  const stamp = new Date(utc);
  return {
    year: stamp.getUTCFullYear(),
    month: stamp.getUTCMonth() + 1,
    day: stamp.getUTCDate(),
  };
}

export function startOfLocalDay(civil: Pick<ZonedCivil, 'year' | 'month' | 'day' | 'timeZone'>): Date {
  return zonedLocalToUtc(civil.timeZone, civil.year, civil.month, civil.day, 0, 0, 0);
}

export function endOfLocalDay(civil: Pick<ZonedCivil, 'year' | 'month' | 'day' | 'timeZone'>): Date {
  return zonedLocalToUtc(civil.timeZone, civil.year, civil.month, civil.day, 23, 59, 59);
}

export function statementTemporalHedge(text: string): TemporalConfidence {
  const lower = text.toLowerCase();
  if (/\b(maybe|might|possibly|not sure|sometime|some time|around then|ish)\b/.test(lower)) {
    return 'low';
  }
  if (/\b(i think|probably|pretty sure|should be|likely)\b/.test(lower)) {
    return 'medium';
  }
  return 'high';
}

export function minTemporalConfidence(a: TemporalConfidence, b: TemporalConfidence): TemporalConfidence {
  const rank = { low: 0, medium: 1, high: 2 };
  return rank[a] <= rank[b] ? a : b;
}

export function parseTemporalExpressions(text: string, ctx: TemporalParseContext): ParsedTemporal | null {
  const timeZone = resolveDeviceTimeZone(ctx.timeZone);
  const nowZoned = instantToZoned(ctx.now, timeZone);
  const lower = text.toLowerCase();
  const hedge = statementTemporalHedge(lower);

  const parsed =
    parseWeekdayWithTime(lower, nowZoned) ??
    parseRelativeWithTime(lower, nowZoned) ??
    parseInDuration(lower, nowZoned) ??
    parseDayparts(lower, nowZoned) ??
    parseWeekSpans(lower, nowZoned) ??
    parseWeekday(lower, nowZoned) ??
    parseSimpleDay(lower, nowZoned) ??
    parseVague(lower, nowZoned);

  if (!parsed) return null;
  parsed.temporalConfidence = minTemporalConfidence(parsed.temporalConfidence, hedge);
  return parsed;
}

export function formatTemporalLabel(parsed: ParsedTemporal, timeZone: string): string {
  const zoned = instantToZoned(new Date(parsed.occurredAt), timeZone);
  const date = `${WEEKDAY_NAMES[zoned.weekday].slice(0, 3)} ${String(zoned.day).padStart(2, '0')} ${monthShort(zoned.month)} ${zoned.year}`;
  if (parsed.precision === 'time') {
    return `${date} ${String(zoned.hour).padStart(2, '0')}:${String(zoned.minute).padStart(2, '0')}`;
  }
  if (parsed.precision === 'range' && parsed.endsAt) {
    const end = instantToZoned(new Date(parsed.endsAt), timeZone);
    return `${date}–${String(end.day).padStart(2, '0')} ${monthShort(end.month)}`;
  }
  return date;
}

const ZONED_FORMATTERS = new Map<string, Intl.DateTimeFormat>();

function zonedFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = ZONED_FORMATTERS.get(timeZone);
  if (cached) return cached;
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  ZONED_FORMATTERS.set(timeZone, formatter);
  return formatter;
}

function zonedPartMap(instant: Date, timeZone: string): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number;
} {
  const formatter = zonedFormatter(timeZone);
  const bag: Record<string, string> = {};
  for (const part of formatter.formatToParts(instant)) {
    if (part.type !== 'literal') bag[part.type] = part.value;
  }
  const weekdayKey = (bag.weekday ?? 'Thu').replace(/\./g, '').slice(0, 3).toLowerCase();
  return {
    year: Number(bag.year),
    month: Number(bag.month),
    day: Number(bag.day),
    hour: Number(bag.hour),
    minute: Number(bag.minute),
    second: Number(bag.second),
    weekday: WEEKDAY_INDEX[weekdayKey] ?? 0,
  };
}

function monthShort(month: number): string {
  return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month - 1] ?? 'Jan';
}

function withClock(
  civil: Pick<ZonedCivil, 'timeZone' | 'year' | 'month' | 'day'>,
  hour: number,
  minute: number,
): Date {
  return zonedLocalToUtc(civil.timeZone, civil.year, civil.month, civil.day, hour, minute, 0);
}

function buildResult(input: {
  start: Date;
  end?: Date;
  expires: Date;
  precision: TemporalPrecision;
  source: TemporalSource;
  temporalConfidence: TemporalConfidence;
  now: Date;
  timeZone: string;
  matchedPhrase: string;
  labelOverride?: string;
}): ParsedTemporal {
  const parsed: ParsedTemporal = {
    occurredAt: input.start.toISOString(),
    endsAt: input.end?.toISOString(),
    expiresAt: input.expires.toISOString(),
    precision: input.precision,
    source: input.source,
    temporalConfidence: input.temporalConfidence,
    isFutureEvent: input.start.getTime() > input.now.getTime() - 60_000,
    isPastEvent: (input.end ?? input.start).getTime() < input.now.getTime(),
    label: '',
    matchedPhrase: input.matchedPhrase,
  };
  parsed.label = input.labelOverride ?? formatTemporalLabel(parsed, input.timeZone);
  if (parsed.precision === 'vague') {
    parsed.isFutureEvent = true;
    parsed.isPastEvent = false;
  }
  return parsed;
}

function upcomingWeekdayInclusive(now: ZonedCivil, weekday: number): { year: number; month: number; day: number } {
  const delta = (weekday - now.weekday + 7) % 7;
  return addCalendarDays(now, delta);
}

/**
 * Friday / this Friday / on Friday: next Friday including today.
 * next Friday: if today is Friday → +7; Mon–Thu → Friday of next week;
 * Sat–Sun → the coming Friday (same as Friday).
 */
export function resolveFridaySemantics(
  now: ZonedCivil,
  kind: 'friday' | 'next_friday',
): { year: number; month: number; day: number } {
  if (kind === 'friday') {
    return upcomingWeekdayInclusive(now, 5);
  }
  if (now.weekday === 5) return addCalendarDays(now, 7);
  if (now.weekday >= 1 && now.weekday <= 4) {
    return addCalendarDays(upcomingWeekdayInclusive(now, 5), 7);
  }
  return upcomingWeekdayInclusive(now, 5);
}

export function resolveNamedWeekday(
  now: ZonedCivil,
  weekday: number,
  kind: 'this' | 'next',
): { year: number; month: number; day: number } {
  if (weekday === 5) {
    return resolveFridaySemantics(now, kind === 'next' ? 'next_friday' : 'friday');
  }
  if (kind === 'this') return upcomingWeekdayInclusive(now, weekday);
  if (now.weekday === weekday) return addCalendarDays(now, 7);
  if (now.weekday !== 0 && now.weekday < weekday) {
    return addCalendarDays(upcomingWeekdayInclusive(now, weekday), 7);
  }
  return upcomingWeekdayInclusive(now, weekday);
}

function thisWeekend(now: ZonedCivil): { start: { year: number; month: number; day: number }; end: { year: number; month: number; day: number } } {
  if (now.weekday === 6) {
    return { start: { year: now.year, month: now.month, day: now.day }, end: addCalendarDays(now, 1) };
  }
  if (now.weekday === 0) {
    return { start: addCalendarDays(now, -1), end: { year: now.year, month: now.month, day: now.day } };
  }
  const saturday = upcomingWeekdayInclusive(now, 6);
  return { start: saturday, end: addCalendarDays(saturday, 1) };
}

function nextWeekSpan(now: ZonedCivil): { start: { year: number; month: number; day: number }; end: { year: number; month: number; day: number } } {
  const daysUntilMonday = (8 - now.weekday) % 7 || 7;
  const monday = addCalendarDays(now, daysUntilMonday);
  return { start: monday, end: addCalendarDays(monday, 6) };
}

function parseClockFragment(rawHour: string, rawMinute?: string, ampm?: string): { hour: number; minute: number } {
  const hour = Number(rawHour);
  const minute = rawMinute ? Number(rawMinute) : 0;
  const mer = ampm?.toLowerCase();
  if (mer === 'am') return { hour: hour === 12 ? 0 : hour, minute };
  if (mer === 'pm') return { hour: hour === 12 ? 12 : hour + 12, minute };
  if (hour === 0 || hour >= 13) return { hour: hour === 24 ? 0 : hour, minute };
  if (hour <= 7) return { hour: hour + 12, minute };
  return { hour, minute };
}

function parseWeekdayWithTime(lower: string, now: ZonedCivil): ParsedTemporal | null {
  const match = lower.match(
    /\b(?:on\s+)?(next\s+|this\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b(?:\s+at\s+|\s+@\s+|\s+)(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/,
  );
  const alt = lower.match(
    /\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s+(?:on\s+)?(next\s+|this\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/,
  );
  const used = match ?? alt;
  if (!used) return null;

  let kind: 'this' | 'next' = 'this';
  let weekdayName: string;
  let hourRaw: string;
  let minuteRaw: string | undefined;
  let ampm: string | undefined;
  let phrase: string;

  if (match) {
    kind = match[1]?.includes('next') ? 'next' : 'this';
    weekdayName = match[2];
    hourRaw = match[3];
    minuteRaw = match[4];
    ampm = match[5];
    phrase = match[0];
  } else {
    hourRaw = alt![1];
    minuteRaw = alt![2];
    ampm = alt![3];
    kind = alt![4]?.includes('next') ? 'next' : 'this';
    weekdayName = alt![5];
    phrase = alt![0];
  }

  const weekday = WEEKDAY_INDEX[weekdayName];
  const day = resolveNamedWeekday(now, weekday, kind);
  const clock = parseClockFragment(hourRaw, minuteRaw, ampm);
  const start = withClock({ ...day, timeZone: now.timeZone }, clock.hour, clock.minute);
  const expires = startOfLocalDay({ ...addCalendarDays(day, 1), timeZone: now.timeZone });
  return buildResult({
    start,
    expires,
    precision: 'time',
    source: 'relative',
    temporalConfidence: 'high',
    now: zonedLocalToUtc(now.timeZone, now.year, now.month, now.day, now.hour, now.minute, now.second),
    timeZone: now.timeZone,
    matchedPhrase: phrase.trim(),
  });
}

function parseRelativeWithTime(lower: string, now: ZonedCivil): ParsedTemporal | null {
  const tomorrowAt = lower.match(/\b(?:tomorrow|tmrw)\s+(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  const atTomorrow = lower.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s+tomorrow\b/);
  const todayAt = lower.match(/\b(?:today)\s+(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  const used = tomorrowAt ?? atTomorrow ?? todayAt;
  if (!used) return null;

  const dayOffset = todayAt ? 0 : 1;
  const hourRaw = tomorrowAt ? used[1] : atTomorrow ? used[1] : used[1];
  const minuteRaw = used[2];
  const ampm = used[3];
  const clock = parseClockFragment(hourRaw, minuteRaw, ampm);
  const day = addCalendarDays(now, dayOffset);
  const start = withClock({ ...day, timeZone: now.timeZone }, clock.hour, clock.minute);
  const expires = startOfLocalDay({ ...addCalendarDays(day, 1), timeZone: now.timeZone });
  return buildResult({
    start,
    expires,
    precision: 'time',
    source: 'relative',
    temporalConfidence: 'high',
    now: zonedLocalToUtc(now.timeZone, now.year, now.month, now.day, now.hour, now.minute, now.second),
    timeZone: now.timeZone,
    matchedPhrase: used[0].trim(),
  });
}

function parseInDuration(lower: string, now: ZonedCivil): ParsedTemporal | null {
  const hours = lower.match(/\bin\s+(\d+)\s+hours?\b/);
  if (hours) {
    const delta = Number(hours[1]);
    const start = new Date(zonedToNow(now).getTime() + delta * 60 * 60 * 1000);
    const expires = new Date(start.getTime() + 6 * 60 * 60 * 1000);
    return buildResult({
      start,
      expires,
      precision: 'time',
      source: 'relative',
      temporalConfidence: 'high',
      now: zonedToNow(now),
      timeZone: now.timeZone,
      matchedPhrase: hours[0],
    });
  }

  const days = lower.match(/\bin\s+(\d+)\s+days?\b/);
  if (days) {
    const delta = Number(days[1]);
    const day = addCalendarDays(now, delta);
    const start = startOfLocalDay({ ...day, timeZone: now.timeZone });
    const expires = startOfLocalDay({ ...addCalendarDays(day, 1), timeZone: now.timeZone });
    return buildResult({
      start,
      expires,
      precision: 'day',
      source: 'relative',
      temporalConfidence: 'high',
      now: zonedToNow(now),
      timeZone: now.timeZone,
      matchedPhrase: days[0],
    });
  }
  return null;
}

function parseDayparts(lower: string, now: ZonedCivil): ParsedTemporal | null {
  const today = { year: now.year, month: now.month, day: now.day, timeZone: now.timeZone };
  if (/\btonight\b/.test(lower) || /\bthis evening\b/.test(lower)) {
    const start = withClock(today, 18, 0);
    const end = endOfLocalDay(today);
    const expires = startOfLocalDay({ ...addCalendarDays(today, 1), timeZone: now.timeZone });
    return buildResult({
      start,
      end,
      expires,
      precision: 'range',
      source: 'relative',
      temporalConfidence: 'high',
      now: zonedToNow(now),
      timeZone: now.timeZone,
      matchedPhrase: /\bthis evening\b/.test(lower) ? 'this evening' : 'tonight',
    });
  }
  if (/\bthis morning\b/.test(lower)) {
    const start = withClock(today, 6, 0);
    const end = withClock(today, 12, 0);
    return buildResult({
      start,
      end,
      expires: startOfLocalDay({ ...addCalendarDays(today, 1), timeZone: now.timeZone }),
      precision: 'range',
      source: 'relative',
      temporalConfidence: 'high',
      now: zonedToNow(now),
      timeZone: now.timeZone,
      matchedPhrase: 'this morning',
    });
  }
  if (/\bthis afternoon\b/.test(lower)) {
    const start = withClock(today, 12, 0);
    const end = withClock(today, 17, 0);
    return buildResult({
      start,
      end,
      expires: startOfLocalDay({ ...addCalendarDays(today, 1), timeZone: now.timeZone }),
      precision: 'range',
      source: 'relative',
      temporalConfidence: 'high',
      now: zonedToNow(now),
      timeZone: now.timeZone,
      matchedPhrase: 'this afternoon',
    });
  }
  if (/\blater today\b/.test(lower)) {
    const start = zonedToNow(now);
    const end = endOfLocalDay(today);
    return buildResult({
      start,
      end,
      expires: startOfLocalDay({ ...addCalendarDays(today, 1), timeZone: now.timeZone }),
      precision: 'range',
      source: 'relative',
      temporalConfidence: 'medium',
      now: zonedToNow(now),
      timeZone: now.timeZone,
      matchedPhrase: 'later today',
    });
  }
  return null;
}

function parseWeekSpans(lower: string, now: ZonedCivil): ParsedTemporal | null {
  if (/\bthis weekend\b/.test(lower)) {
    const span = thisWeekend(now);
    const start = startOfLocalDay({ ...span.start, timeZone: now.timeZone });
    const end = endOfLocalDay({ ...span.end, timeZone: now.timeZone });
    const expires = startOfLocalDay({ ...addCalendarDays(span.end, 1), timeZone: now.timeZone });
    return buildResult({
      start,
      end,
      expires,
      precision: 'range',
      source: 'relative',
      temporalConfidence: 'medium',
      now: zonedToNow(now),
      timeZone: now.timeZone,
      matchedPhrase: 'this weekend',
    });
  }
  if (/\bnext week\b/.test(lower)) {
    const span = nextWeekSpan(now);
    const start = startOfLocalDay({ ...span.start, timeZone: now.timeZone });
    const end = endOfLocalDay({ ...span.end, timeZone: now.timeZone });
    const expires = startOfLocalDay({ ...addCalendarDays(span.end, 1), timeZone: now.timeZone });
    const vague = /\b(sometime|some time|maybe|around)\b/.test(lower);
    return buildResult({
      start,
      end,
      expires,
      precision: vague ? 'vague' : 'range',
      source: 'relative',
      temporalConfidence: vague ? 'low' : 'medium',
      now: zonedToNow(now),
      timeZone: now.timeZone,
      matchedPhrase: vague ? 'sometime next week' : 'next week',
    });
  }
  if (/\bthis week\b/.test(lower)) {
    const start = startOfLocalDay(now);
    const daysToSunday = (7 - now.weekday) % 7;
    const sunday = addCalendarDays(now, daysToSunday);
    const end = endOfLocalDay({ ...sunday, timeZone: now.timeZone });
    const expires = startOfLocalDay({ ...addCalendarDays(sunday, 1), timeZone: now.timeZone });
    return buildResult({
      start,
      end,
      expires,
      precision: 'range',
      source: 'relative',
      temporalConfidence: 'medium',
      now: zonedToNow(now),
      timeZone: now.timeZone,
      matchedPhrase: 'this week',
    });
  }
  return null;
}

function parseWeekday(lower: string, now: ZonedCivil): ParsedTemporal | null {
  const nextNamed = lower.match(
    /\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/,
  );
  const thisNamed = lower.match(
    /\b(?:this\s+|on\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/,
  );
  if (!nextNamed && !thisNamed) return null;
  if (nextNamed) {
    const weekday = WEEKDAY_INDEX[nextNamed[1]];
    const day = resolveNamedWeekday(now, weekday, 'next');
    return dayResult(now, day, nextNamed[0], 'high');
  }
  const weekday = WEEKDAY_INDEX[thisNamed![1]];
  const day = resolveNamedWeekday(now, weekday, 'this');
  return dayResult(now, day, thisNamed![0], 'high');
}

function parseSimpleDay(lower: string, now: ZonedCivil): ParsedTemporal | null {
  if (/\byesterday\b/.test(lower)) {
    const day = addCalendarDays(now, -1);
    const start = startOfLocalDay({ ...day, timeZone: now.timeZone });
    const expires = startOfLocalDay(now);
    const result = buildResult({
      start,
      expires,
      precision: 'day',
      source: 'relative',
      temporalConfidence: 'high',
      now: zonedToNow(now),
      timeZone: now.timeZone,
      matchedPhrase: 'yesterday',
    });
    result.isPastEvent = true;
    result.isFutureEvent = false;
    return result;
  }
  if (/\btomorrow\b|\btmrw\b/.test(lower)) {
    return dayResult(now, addCalendarDays(now, 1), 'tomorrow', 'high');
  }
  if (/\btoday\b/.test(lower)) {
    return dayResult(now, { year: now.year, month: now.month, day: now.day }, 'today', 'high');
  }
  return null;
}

function parseVague(lower: string, now: ZonedCivil): ParsedTemporal | null {
  if (/\bin a few hours\b/.test(lower)) {
    const start = new Date(zonedToNow(now).getTime() + 3 * 60 * 60 * 1000);
    const expires = new Date(start.getTime() + 12 * 60 * 60 * 1000);
    const result = buildResult({
      start,
      expires,
      precision: 'vague',
      source: 'relative',
      temporalConfidence: 'low',
      now: zonedToNow(now),
      timeZone: now.timeZone,
      matchedPhrase: 'in a few hours',
      labelOverride: 'in a few hours (approximate)',
    });
    return result;
  }
  if (/\bin a few days\b/.test(lower)) {
    const day = addCalendarDays(now, 3);
    const start = startOfLocalDay({ ...day, timeZone: now.timeZone });
    const expires = startOfLocalDay({ ...addCalendarDays(now, 6), timeZone: now.timeZone });
    return buildResult({
      start,
      expires,
      precision: 'vague',
      source: 'relative',
      temporalConfidence: 'low',
      now: zonedToNow(now),
      timeZone: now.timeZone,
      matchedPhrase: 'in a few days',
      labelOverride: 'in a few days (approximate)',
    });
  }
  return null;
}

function dayResult(
  now: ZonedCivil,
  day: { year: number; month: number; day: number },
  phrase: string,
  confidence: TemporalConfidence,
): ParsedTemporal {
  const start = startOfLocalDay({ ...day, timeZone: now.timeZone });
  const expires = startOfLocalDay({ ...addCalendarDays(day, 1), timeZone: now.timeZone });
  return buildResult({
    start,
    expires,
    precision: 'day',
    source: 'relative',
    temporalConfidence: confidence,
    now: zonedToNow(now),
    timeZone: now.timeZone,
    matchedPhrase: phrase,
  });
}

function zonedToNow(now: ZonedCivil): Date {
  return zonedLocalToUtc(now.timeZone, now.year, now.month, now.day, now.hour, now.minute, now.second);
}

export function sameLocalDay(aIso: string, bIso: string, timeZone: string): boolean {
  const a = instantToZoned(new Date(aIso), timeZone);
  const b = instantToZoned(new Date(bIso), timeZone);
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

export function localDayIso(instant: Date, timeZone: string): string {
  const z = instantToZoned(instant, timeZone);
  return `${z.year}-${String(z.month).padStart(2, '0')}-${String(z.day).padStart(2, '0')}`;
}
