import { GoalCategory } from '../types';

export const GOAL_CATEGORIES: Array<{ id: GoalCategory; label: string }> = [
  { id: 'fitness', label: 'Fitness' },
  { id: 'study', label: 'Study' },
  { id: 'business', label: 'Business' },
  { id: 'productivity', label: 'Productivity' },
  { id: 'emotional', label: 'Emotional' },
  { id: 'money', label: 'Money' },
  { id: 'general', label: 'General' },
];

export function getGoalCategoryLabel(category: GoalCategory): string {
  return GOAL_CATEGORIES.find((item) => item.id === category)?.label ?? category;
}
