import { Goal } from '../../types';
import { CoachScoreSnapshot } from '../../types/phase5-life-os';
import { LIFE_SCORE_LABELS, LifeScoreCategory, LifeScoreSnapshot } from '../../types/life-score';

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function domainValue(coach: CoachScoreSnapshot | null, domain: string): { value: number; why: string } {
  const entry = coach?.scores.find((s) => s.domain === domain && !s.hidden);
  if (!entry) return { value: 0, why: 'Not enough data yet — consistency builds this over time.' };
  return { value: clamp(entry.value), why: entry.whyChanged || entry.improveAction || 'Based on recent activity.' };
}

function avg(values: number[]): number {
  if (!values.length) return 0;
  return clamp(values.reduce((a, b) => a + b, 0) / values.length);
}

export function computeLifeScore(input: {
  coach: CoachScoreSnapshot | null;
  relationshipScore?: number | null;
  activeGoals?: Goal[];
  reflectionDoneToday?: boolean;
  nutritionModeOn?: boolean;
}): LifeScoreSnapshot {
  const healthBase = domainValue(input.coach, 'health_habits');
  const health = clamp(healthBase.value + (input.nutritionModeOn ? 8 : 0));

  const learning = domainValue(input.coach, 'learning');

  const routines = domainValue(input.coach, 'routines');
  const momentum = domainValue(input.coach, 'goal_momentum');
  const consistency = domainValue(input.coach, 'consistency');
  const productivity = avg([routines.value, momentum.value, consistency.value]);

  const relationships = clamp(input.relationshipScore ?? 0);

  const reflection = domainValue(input.coach, 'reflection');
  const mindfulness = clamp(reflection.value + (input.reflectionDoneToday ? 12 : 0));

  const goalsList = input.activeGoals ?? [];
  const goalProgress =
    goalsList.length === 0
      ? 0
      : goalsList.reduce((sum, g) => sum + (typeof g.progress === 'number' ? g.progress : 0), 0) /
        goalsList.length;
  const goalsValue = clamp(goalProgress * 0.7 + momentum.value * 0.3);

  const categories: LifeScoreCategory[] = [
    {
      id: 'health',
      label: LIFE_SCORE_LABELS.health,
      value: health,
      explanation: healthBase.why,
    },
    {
      id: 'learning',
      label: LIFE_SCORE_LABELS.learning,
      value: learning.value,
      explanation: learning.why,
    },
    {
      id: 'productivity',
      label: LIFE_SCORE_LABELS.productivity,
      value: productivity,
      explanation: 'A blend of routines, consistency, and goal momentum — not a grade.',
    },
    {
      id: 'relationships',
      label: LIFE_SCORE_LABELS.relationships,
      value: relationships,
      explanation:
        relationships > 0
          ? 'Your bond with Voxa grows through conversations, memories, and rituals.'
          : 'Talk and share moments to grow this gently over time.',
    },
    {
      id: 'mindfulness',
      label: LIFE_SCORE_LABELS.mindfulness,
      value: mindfulness,
      explanation: reflection.why,
    },
    {
      id: 'goals',
      label: LIFE_SCORE_LABELS.goals,
      value: goalsValue,
      explanation:
        goalsList.length > 0
          ? `${goalsList.length} active goal${goalsList.length === 1 ? '' : 's'} · average progress ${Math.round(goalProgress)}%`
          : 'Add a goal when you’re ready — no pressure.',
    },
  ];

  const overall = avg(categories.map((c) => c.value));
  const strongest = [...categories].sort((a, b) => b.value - a.value)[0];

  return {
    overall,
    categories,
    computedAt: new Date().toISOString(),
    summaryLine:
      overall >= 60
        ? `Steady progress — ${strongest.label.toLowerCase()} is leading right now.`
        : overall >= 30
          ? 'Small consistent steps are showing up. This is a private pulse, not a judgment.'
          : 'A quiet starting point. Show up a little — the score will follow.',
  };
}
