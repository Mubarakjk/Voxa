import { LifeTimelineEvent, LifeTimelineEventKind } from '../../types/companion-intelligence';

export const TIMELINE_KIND_LABELS: Record<LifeTimelineEventKind, string> = {
  goal: 'Goals',
  achievement: 'Achievements',
  birthday: 'Birthdays',
  study: 'Study',
  work: 'Work',
  conversation: 'Conversations',
  trip: 'Trips',
  fitness: 'Fitness',
  relationship: 'Relationship',
  memory: 'Memories',
  custom: 'Other',
};

export function stableTimelineId(kind: string, title: string, occurredAt: string): string {
  const key = `${kind}:${title}:${occurredAt.slice(0, 10)}`;
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return `timeline-${hash.toString(16)}`;
}

export function normalizeTimelineEvents(events: LifeTimelineEvent[]): LifeTimelineEvent[] {
  return events.map((event) => ({
    ...event,
    id: stableTimelineId(event.kind, event.title, event.occurredAt),
  }));
}

export function getAvailableTimelineKinds(events: LifeTimelineEvent[]): LifeTimelineEventKind[] {
  const kinds = new Set<LifeTimelineEventKind>();
  for (const event of events) kinds.add(event.kind);
  return [...kinds].sort((a, b) => TIMELINE_KIND_LABELS[a].localeCompare(TIMELINE_KIND_LABELS[b]));
}

export function filterTimelineEvents(
  events: LifeTimelineEvent[],
  kind: LifeTimelineEventKind | 'all',
): LifeTimelineEvent[] {
  if (kind === 'all') return events;
  return events.filter((event) => event.kind === kind);
}

export function countTimelineMilestones(events: LifeTimelineEvent[]): number {
  return events.filter((event) =>
    ['achievement', 'relationship', 'goal', 'birthday'].includes(event.kind),
  ).length;
}
