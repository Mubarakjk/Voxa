import { Goal, Memory, Reminder } from '../../types';
import { CalendarEvent, CalendarEventKind, LifeCalendarSnapshot } from '../../types/phase8-retention';

const KIND_PATTERNS: Array<{ kind: CalendarEventKind; pattern: RegExp }> = [
  { kind: 'birthday', pattern: /\bbirthday\b/i },
  { kind: 'interview', pattern: /\binterview\b/i },
  { kind: 'exam', pattern: /\bexam\b|\btest\b|\bassessment\b/i },
  { kind: 'gym', pattern: /\bgym\b|\bworkout\b|\btraining\b/i },
  { kind: 'work', pattern: /\bwork\b|\bmeeting\b|\boffice\b/i },
  { kind: 'university', pattern: /\buniversity\b|\blecture\b|\bclass\b|\bcollege\b/i },
  { kind: 'holiday', pattern: /\bholiday\b|\bvacation\b|\btrip\b/i },
  { kind: 'flight', pattern: /\bflight\b|\bfly\b|\bairport\b/i },
  { kind: 'appointment', pattern: /\bappointment\b|\bdoctor\b|\bdentist\b/i },
  { kind: 'sports', pattern: /\bfootball\b|\bmatch\b|\bgame\b|\bsoccer\b|\bbasketball\b/i },
  { kind: 'deadline', pattern: /\bdeadline\b|\bdue\b|\bsubmit\b/i },
  { kind: 'anniversary', pattern: /\banniversary\b/i },
];

function classifyEvent(text: string): CalendarEventKind {
  for (const { kind, pattern } of KIND_PATTERNS) {
    if (pattern.test(text)) return kind;
  }
  return 'other';
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function daysUntil(iso: string, now: Date): number {
  const target = new Date(iso);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const eventDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((eventDay.getTime() - today.getTime()) / 86400000);
}

function buildLine(event: CalendarEvent, offsetDays: number): string {
  const time = formatTime(event.scheduledAt);
  if (offsetDays === 0) {
    return time ? `You've got ${event.title.toLowerCase()} at ${time} today.` : `You've got ${event.title.toLowerCase()} today.`;
  }
  if (offsetDays === 1) return `Tomorrow is your ${event.title.toLowerCase()}.`;
  if (event.kind === 'birthday' && offsetDays <= 3) {
    return `Your birthday is in ${offsetDays} days.`;
  }
  if (offsetDays <= 3) return `${event.title} is in ${offsetDays} days.`;
  return `${event.title} — ${new Date(event.scheduledAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}.`;
}

export function buildLifeCalendar(input: {
  reminders: Reminder[];
  memories: Memory[];
  goals: Goal[];
  now?: Date;
}): LifeCalendarSnapshot {
  const now = input.now ?? new Date();
  const events: CalendarEvent[] = [];

  for (const reminder of input.reminders) {
    if (reminder.status === 'cancelled' || reminder.status === 'completed') continue;
    const text = `${reminder.title} ${reminder.body ?? ''}`;
    events.push({
      id: `rem-${reminder.id}`,
      title: reminder.title,
      kind: classifyEvent(text),
      scheduledAt: reminder.scheduledAt,
      source: 'reminder',
      sourceId: reminder.id,
    });
  }

  for (const memory of input.memories) {
    if (memory.category === 'birthdays' || /\bbirthday\b/i.test(`${memory.title} ${memory.content}`)) {
      const at = memory.occurredAt ?? memory.createdAt;
      events.push({
        id: `mem-${memory.id}`,
        title: memory.title,
        kind: 'birthday',
        scheduledAt: at,
        source: 'memory',
        sourceId: memory.id,
        allDay: true,
      });
    }
    const eventAt = memory.occurredAt;
    if (eventAt && /\b(interview|exam|flight|appointment|match|deadline)\b/i.test(`${memory.title} ${memory.content}`)) {
      events.push({
        id: `mem-ev-${memory.id}`,
        title: memory.title,
        kind: classifyEvent(`${memory.title} ${memory.content}`),
        scheduledAt: eventAt,
        source: 'memory',
        sourceId: memory.id,
      });
    }
  }

  for (const goal of input.goals) {
    if (goal.targetDate) {
      events.push({
        id: `goal-${goal.id}`,
        title: goal.title,
        kind: 'deadline',
        scheduledAt: goal.targetDate,
        source: 'goal',
        sourceId: goal.id,
      });
    }
  }

  const sorted = events
    .filter((e) => !Number.isNaN(new Date(e.scheduledAt).getTime()))
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  const todayEvents = sorted.filter((e) => daysUntil(e.scheduledAt, now) === 0);
  const upcomingEvents = sorted.filter((e) => {
    const d = daysUntil(e.scheduledAt, now);
    return d > 0 && d <= 14;
  });

  const todayLine = todayEvents[0] ? buildLine(todayEvents[0], 0) : null;
  const tomorrowEvent = sorted.find((e) => daysUntil(e.scheduledAt, now) === 1)
    ?? upcomingEvents.find((e) => daysUntil(e.scheduledAt, now) === 1);
  const tomorrowLine = tomorrowEvent ? buildLine(tomorrowEvent, 1) : null;

  return { todayEvents, upcomingEvents, todayLine, tomorrowLine };
}
