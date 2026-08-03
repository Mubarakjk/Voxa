import { Goal, Memory } from '../../types';
import { Note } from '../../types/notes';

export type CommandBarResultKind =
  | 'note'
  | 'memory'
  | 'goal'
  | 'conversation'
  | 'routine'
  | 'route'
  | 'talk';

export type CommandBarResult = {
  id: string;
  kind: CommandBarResultKind;
  title: string;
  subtitle?: string;
  /** Navigation hint */
  action:
    | { type: 'note'; noteId: string }
    | { type: 'memory' }
    | { type: 'goal' }
    | { type: 'talk'; starter?: string }
    | { type: 'route'; route: string }
    | { type: 'routine' };
};

export type CommandBarRouteDef = {
  id: string;
  title: string;
  keywords: string[];
  route: string;
};

export const COMMAND_BAR_ROUTES: CommandBarRouteDef[] = [
  { id: 'life', title: 'Life Dashboard', keywords: ['life', 'dashboard', 'os'], route: 'LifeOSHub' },
  { id: 'timeline', title: 'Life Timeline', keywords: ['timeline', 'journey', 'history'], route: 'LifeTimeline' },
  { id: 'memory', title: 'Memories', keywords: ['memory', 'memories', 'remember', 'moments'], route: 'Memory' },
  { id: 'notes', title: 'Notes', keywords: ['notes', 'note'], route: 'NotesHub' },
  { id: 'achievements', title: 'Achievements', keywords: ['achievement', 'trophy', 'streak'], route: 'AchievementCentre' },
  { id: 'weekly', title: 'Weekly Recap', keywords: ['weekly', 'recap', 'review'], route: 'WeeklyRecap' },
  { id: 'reflection', title: 'Daily Reflection', keywords: ['reflect', 'evening', 'grateful'], route: 'DailyReflection' },
  { id: 'checkin', title: 'Daily check-in', keywords: ['check-in', 'checkin', 'mood', 'feeling', 'ritual'], route: 'DailyCheckIn' },
  { id: 'debate', title: 'Challenge / Debate', keywords: ['challenge', 'debate', 'argue', 'pushback'], route: 'DebateMode' },
  { id: 'coaching', title: 'Coaching hub', keywords: ['coaching', 'coach hub', 'growth'], route: 'CoachingHub' },
  { id: 'coach', title: 'Coach Score details', keywords: ['coach', 'score', 'details'], route: 'CoachScore' },
  { id: 'studio', title: 'Companion Studio', keywords: ['voice', 'personality', 'avatar', 'customise'], route: 'CompanionStudio' },
  { id: 'companion', title: 'My Companion', keywords: ['companion', 'relationship', 'bond', 'insights', 'learned'], route: 'MyCompanion' },
  { id: 'lifebook', title: 'Life Book', keywords: ['life book', 'chapters', 'story'], route: 'LifeBook' },
  { id: 'voice', title: 'Voice picker', keywords: ['voice', 'speak', 'sound'], route: 'VoicePicker' },
];

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

function matches(query: string, ...fields: Array<string | undefined | null>): boolean {
  const q = norm(query);
  if (!q) return false;
  const hay = norm(fields.filter(Boolean).join(' '));
  return q.split(' ').every((token) => hay.includes(token));
}

export function searchCommandBar(input: {
  query: string;
  notes?: Note[];
  memories?: Memory[];
  goals?: Goal[];
  conversations?: Array<{ id: string; title?: string; summary?: string }>;
  routineTitles?: string[];
  limit?: number;
}): CommandBarResult[] {
  const q = input.query.trim();
  const limit = input.limit ?? 24;
  if (q.length < 1) {
    return COMMAND_BAR_ROUTES.slice(0, 8).map((r) => ({
      id: `route:${r.id}`,
      kind: 'route' as const,
      title: r.title,
      subtitle: 'Open',
      action: { type: 'route' as const, route: r.route },
    }));
  }

  const results: CommandBarResult[] = [];

  for (const r of COMMAND_BAR_ROUTES) {
    if (matches(q, r.title, ...r.keywords)) {
      results.push({
        id: `route:${r.id}`,
        kind: 'route',
        title: r.title,
        subtitle: 'Go to',
        action: { type: 'route', route: r.route },
      });
    }
  }

  for (const note of input.notes ?? []) {
    if (note.deletedAt) continue;
    if (matches(q, note.title, note.body.slice(0, 200), note.tags.join(' '))) {
      results.push({
        id: `note:${note.id}`,
        kind: 'note',
        title: note.title.trim() || 'Untitled note',
        subtitle: note.body.replace(/\s+/g, ' ').trim().slice(0, 72) || 'Note',
        action: { type: 'note', noteId: note.id },
      });
    }
  }

  for (const memory of input.memories ?? []) {
    if (matches(q, memory.title, memory.content, memory.tags.join(' '), memory.category)) {
      results.push({
        id: `memory:${memory.id}`,
        kind: 'memory',
        title: memory.title,
        subtitle: memory.content.slice(0, 72),
        action: { type: 'memory' },
      });
    }
  }

  for (const goal of input.goals ?? []) {
    if (matches(q, goal.title, goal.description)) {
      results.push({
        id: `goal:${goal.id}`,
        kind: 'goal',
        title: goal.title,
        subtitle: `${goal.progress ?? 0}% · ${goal.status}`,
        action: { type: 'goal' },
      });
    }
  }

  for (const conv of input.conversations ?? []) {
    if (matches(q, conv.title, conv.summary)) {
      results.push({
        id: `conv:${conv.id}`,
        kind: 'conversation',
        title: conv.title?.trim() || 'Conversation',
        subtitle: conv.summary?.slice(0, 72),
        action: { type: 'talk', starter: conv.summary ? undefined : undefined },
      });
    }
  }

  for (const title of input.routineTitles ?? []) {
    if (matches(q, title, 'routine', 'workout')) {
      results.push({
        id: `routine:${title}`,
        kind: 'routine',
        title,
        subtitle: 'Routine',
        action: { type: 'routine' },
      });
    }
  }

  // Intent shortcuts
  if (matches(q, 'start workout', 'workout', 'exercise')) {
    results.unshift({
      id: 'intent:workout',
      kind: 'talk',
      title: 'Start a workout check-in',
      subtitle: 'Talk with Voxa',
      action: { type: 'talk', starter: 'Help me start a short workout focus for today.' },
    });
  }
  if (matches(q, 'show yesterday', 'yesterday')) {
    results.unshift({
      id: 'intent:yesterday',
      kind: 'route',
      title: 'Show yesterday',
      subtitle: 'Open Life Timeline',
      action: { type: 'route', route: 'LifeTimeline' },
    });
  }

  return results.slice(0, limit);
}
