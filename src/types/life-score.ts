export type LifeScoreCategoryId =
  | 'health'
  | 'learning'
  | 'productivity'
  | 'relationships'
  | 'mindfulness'
  | 'goals';

export type LifeScoreCategory = {
  id: LifeScoreCategoryId;
  label: string;
  value: number;
  explanation: string;
};

export type LifeScoreSnapshot = {
  overall: number;
  categories: LifeScoreCategory[];
  computedAt: string;
  /** Calm, non-judgemental summary */
  summaryLine: string;
};

export const LIFE_SCORE_LABELS: Record<LifeScoreCategoryId, string> = {
  health: 'Health',
  learning: 'Learning',
  productivity: 'Productivity',
  relationships: 'Relationships',
  mindfulness: 'Mindfulness',
  goals: 'Goals',
};
