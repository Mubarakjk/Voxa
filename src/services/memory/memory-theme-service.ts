import { Memory, MemoryCategory } from '../../types';
import { MemoryTheme } from '../../types/phase2-intelligence';

const CATEGORY_THEME: Partial<Record<MemoryCategory, MemoryTheme>> = {
  goals: 'growth',
  fitness: 'health',
  study: 'learning',
  work: 'work',
  business: 'work',
  emotional: 'emotional',
  people: 'relationships',
  birthdays: 'relationships',
  moments: 'daily_life',
  routines: 'daily_life',
  habits: 'health',
  future_plans: 'future',
  fears: 'emotional',
};

const KEYWORD_THEME: Array<{ theme: MemoryTheme; pattern: RegExp }> = [
  { theme: 'health', pattern: /gym|workout|sleep|tired|energy|run|exercise/i },
  { theme: 'learning', pattern: /study|exam|course|learn|school|university/i },
  { theme: 'work', pattern: /job|interview|career|project|meeting|boss/i },
  { theme: 'relationships', pattern: /family|friend|partner|love|mom|dad/i },
  { theme: 'emotional', pattern: /anxious|sad|happy|grateful|stress|proud/i },
  { theme: 'future', pattern: /dream|someday|plan|hope|goal|tomorrow/i },
];

export function inferMemoryTheme(memory: Memory): MemoryTheme {
  const text = `${memory.title} ${memory.content} ${memory.tags.join(' ')}`;
  for (const rule of KEYWORD_THEME) {
    if (rule.pattern.test(text)) return rule.theme;
  }
  return CATEGORY_THEME[memory.category] ?? 'daily_life';
}

export function assignMemoryThemes(memories: Memory[]): Map<string, MemoryTheme> {
  const map = new Map<string, MemoryTheme>();
  for (const memory of memories) {
    map.set(memory.id, inferMemoryTheme(memory));
  }
  return map;
}

export function themeOverlapScore(queryText: string, theme: MemoryTheme): number {
  const lower = queryText.toLowerCase();
  const themeKeywords: Record<MemoryTheme, string[]> = {
    growth: ['goal', 'progress', 'achieve', 'improve', 'better'],
    relationships: ['friend', 'family', 'love', 'people', 'together'],
    health: ['health', 'sleep', 'gym', 'workout', 'energy', 'tired'],
    work: ['work', 'job', 'career', 'project', 'interview'],
    learning: ['study', 'learn', 'exam', 'school', 'course'],
    emotional: ['feel', 'mood', 'anxious', 'happy', 'sad', 'stress'],
    daily_life: ['today', 'routine', 'morning', 'evening', 'day'],
    future: ['future', 'plan', 'dream', 'hope', 'tomorrow'],
  };
  const keywords = themeKeywords[theme];
  let hits = 0;
  for (const word of keywords) {
    if (lower.includes(word)) hits += 1;
  }
  return Math.min(hits / 3, 1);
}

const THEME_LABELS: Record<MemoryTheme, string> = {
  growth: 'Growth',
  relationships: 'Relationships',
  health: 'Health & habits',
  work: 'Work',
  learning: 'Learning',
  emotional: 'Emotional life',
  daily_life: 'Daily life',
  future: 'Future plans',
};

export function summarizeMemoryThemes(memories: Memory[]) {
  const counts = new Map<MemoryTheme, number>();
  for (const memory of memories) {
    const theme = inferMemoryTheme(memory);
    counts.set(theme, (counts.get(theme) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([theme, count]) => ({ theme, count, label: THEME_LABELS[theme] }));
}
