import { CompanionModeId, MemoryCategory } from '../types';

/** Categories the intelligence engine can extract and store. */
export const MEMORY_EXTRACTION_CATEGORIES: MemoryCategory[] = [
  'goals',
  'routines',
  'favourites',
  'people',
  'work',
  'study',
  'fitness',
  'faith',
  'habits',
  'preferences',
  'fears',
  'birthdays',
  'future_plans',
  'emotional',
  'moments',
  'productivity',
  'business',
];

/** Companion modes that boost relevance for each category (0–1 weight multiplier). */
export const MEMORY_MODE_AFFINITY: Record<MemoryCategory, CompanionModeId[]> = {
  goals: ['coach', 'assistant'],
  routines: ['coach', 'assistant'],
  favourites: ['friend', 'reflection'],
  people: ['friend', 'reflection', 'safe_call'],
  work: ['assistant', 'coach'],
  study: ['teacher', 'assistant'],
  fitness: ['coach'],
  faith: ['reflection', 'friend'],
  habits: ['coach', 'assistant'],
  preferences: ['friend', 'assistant', 'reflection'],
  fears: ['reflection', 'safe_call'],
  birthdays: ['friend', 'assistant'],
  future_plans: ['coach', 'assistant'],
  emotional: ['reflection', 'friend', 'safe_call'],
  moments: ['friend', 'reflection'],
  productivity: ['assistant', 'coach'],
  business: ['coach', 'assistant'],
};

export const MEMORY_CATEGORY_LABELS: Record<MemoryCategory, string> = {
  goals: 'Goals',
  routines: 'Routines',
  favourites: 'Favourite things',
  people: 'Important people',
  work: 'Work',
  study: 'School & study',
  fitness: 'Fitness',
  faith: 'Faith',
  habits: 'Habits',
  preferences: 'Preferences',
  fears: 'Fears & worries',
  birthdays: 'Birthdays',
  future_plans: 'Future plans',
  emotional: 'Emotional',
  moments: 'Moments',
  productivity: 'Productivity',
  business: 'Business',
};
