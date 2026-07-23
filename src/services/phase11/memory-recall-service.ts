import { Goal, Memory } from '../../types';
import { MemoryRecallMoment } from '../../types/phase11-living-companion';

const RECALL_PATTERNS: Array<{ regex: RegExp; ask: (title: string, content: string) => string }> = [
  { regex: /\binterview\b/i, ask: (t) => `How did ${t.toLowerCase().includes('interview') ? 'the interview' : `"${t}"`} go?` },
  { regex: /\bexam\b|\btest\b/i, ask: (t) => `How did the exam go — still thinking about "${t}"?` },
  { regex: /\bstartup\b|\bbusiness\b/i, ask: (_, c) => `You were excited about your startup — ${c.slice(0, 60)}… How is it going?` },
  { regex: /\bgym\b|\bworkout\b|\brun\b/i, ask: () => 'How is the gym going this week?' },
  { regex: /\bfootball\b|\bmatch\b|\bgame\b/i, ask: (t) => `Did ${t.toLowerCase().includes('match') ? 'the match' : 'that game'} go well?` },
  { regex: /\bnervous\b|\banxious\b|\bworried\b/i, ask: () => 'Last time you were nervous — how are you feeling now?' },
  { regex: /\bfamily\b|\bmum\b|\bdad\b|\bparent\b/i, ask: (t) => `How is everything with family — still on your mind from "${t}"?` },
  { regex: /\bholiday\b|\btrip\b|\btravel\b/i, ask: (t) => `How was ${t.toLowerCase().includes('trip') ? 'the trip' : 'that holiday'}?` },
];

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

export function buildMemoryRecall(input: {
  memories: Memory[];
  goals: Goal[];
  daysAway: number;
  dynamicLine?: string | null;
}): MemoryRecallMoment | null {
  if (input.dynamicLine) {
    return {
      line: input.dynamicLine,
      confidence: 'high',
      source: 'memory',
    };
  }

  const candidates = input.memories
    .filter((m) => daysSince(m.updatedAt) <= 14)
    .sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0));

  for (const memory of candidates) {
    const text = `${memory.title} ${memory.content}`;
    for (const pattern of RECALL_PATTERNS) {
      if (pattern.regex.test(text)) {
        return {
          line: pattern.ask(memory.title, memory.content),
          memoryId: memory.id,
          memoryTitle: memory.title,
          confidence: 'high',
          source: 'memory',
        };
      }
    }
  }

  const remember = input.memories.find((m) => m.tags?.includes('remember-this'));
  if (remember && daysSince(remember.createdAt) <= 7) {
    return {
      line: `I have been thinking about "${remember.title}" — want to pick that up?`,
      memoryId: remember.id,
      memoryTitle: remember.title,
      confidence: 'high',
      source: 'memory',
    };
  }

  const goal = input.goals.find((g) => g.status === 'active');
  if (goal && input.daysAway <= 3) {
    return {
      line: `Still cheering you on with "${goal.title}" — any progress?`,
      confidence: 'medium',
      source: 'goal',
    };
  }

  if (input.daysAway >= 2 && candidates[0]) {
    return {
      line: `Welcome back — last we spoke about "${candidates[0].title}".`,
      memoryId: candidates[0].id,
      memoryTitle: candidates[0].title,
      confidence: 'medium',
      source: 'memory',
    };
  }

  return null;
}
