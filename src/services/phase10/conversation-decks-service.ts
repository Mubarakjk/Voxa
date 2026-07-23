import { createUuid } from '../../types';
import { DeckCard, DeckCategory } from '../../types/phase10-play';
import { FriendshipLevel } from '../../types/relationship-growth';

const DECK_CATEGORY_LEVELS: Partial<Record<DeckCategory, FriendshipLevel>> = {
  philosophy: 'close_companion',
  mental_fitness: 'close_companion',
  dating: 'best_friend',
  dreams: 'best_friend',
};

const DECK_PROMPTS: Record<DeckCategory, string[]> = {
  deep: ['What belief have you outgrown?', 'When did you last feel truly understood?', 'What do you want to be remembered for?'],
  fun: ['What is your most unpopular opinion?', 'Which fictional world would you visit for a day?', 'What is your comfort food and why?'],
  business: ['What problem do you wish someone would solve?', 'What would you build if money was not a factor?', 'What is one skill that would 10x your work?'],
  sports: ['Which match changed how you see the game?', 'Who is the most underrated player you follow?', 'What sport would you teach a friend first?'],
  dating: ['What makes you feel chosen?', 'What is a green flag you look for?', 'What is your love language in practice?'],
  movies: ['Which film felt like it was made for you?', 'What movie do you defend that others dislike?', 'Which character do you relate to most?'],
  dreams: ['What dream keeps visiting you?', 'If dreams were messages, what would last night say?', 'What did you want to be at age ten?'],
  travel: ['Where would you go with one free week?', 'What place felt different from the photos?', 'City or nature — where do you recharge?'],
  philosophy: ['Is happiness a skill or a circumstance?', 'What does a good life mean to you today?', 'Do you believe people change?'],
  life: ['What season of life are you in?', 'What are you learning to let go of?', 'What would your future self thank you for today?'],
  coding: ['What project taught you the most?', 'What bug taught you patience?', 'What would you automate in your life?'],
  productivity: ['What is your best deep-work ritual?', 'What do you procrastinate on and why?', 'What is one thing you could delete from your week?'],
  mental_fitness: ['What thought pattern are you working on?', 'How do you recover after a hard day?', 'What helps you feel grounded?'],
  relationships: ['Who showed up for you recently?', 'What conversation are you avoiding?', 'How do you want to show up for others?'],
  learning: ['What are you curious about this month?', 'What skill would make you proud to learn?', 'Who do you learn best from?'],
};

export const DECK_CATEGORIES: Array<{ id: DeckCategory; label: string; emoji: string }> = [
  { id: 'deep', label: 'Deep Questions', emoji: '🌊' },
  { id: 'fun', label: 'Fun Questions', emoji: '🎉' },
  { id: 'business', label: 'Business', emoji: '💼' },
  { id: 'sports', label: 'Sports', emoji: '⚽' },
  { id: 'dating', label: 'Dating', emoji: '💕' },
  { id: 'movies', label: 'Movies', emoji: '🎬' },
  { id: 'dreams', label: 'Dreams', emoji: '✨' },
  { id: 'travel', label: 'Travel', emoji: '✈️' },
  { id: 'philosophy', label: 'Philosophy', emoji: '🧠' },
  { id: 'life', label: 'Life', emoji: '🌱' },
  { id: 'coding', label: 'Coding', emoji: '⌨️' },
  { id: 'productivity', label: 'Productivity', emoji: '⚡' },
  { id: 'mental_fitness', label: 'Mental Fitness', emoji: '🧘' },
  { id: 'relationships', label: 'Relationships', emoji: '💬' },
  { id: 'learning', label: 'Learning', emoji: '📚' },
];

export function getDeckCards(category: DeckCategory): DeckCard[] {
  return DECK_PROMPTS[category].map((prompt) => ({
    id: createUuid(),
    category,
    prompt,
  }));
}

export function pickDailyDeckCard(seed: number): DeckCard {
  const cats = DECK_CATEGORIES.map((c) => c.id);
  const category = cats[seed % cats.length];
  const prompts = DECK_PROMPTS[category];
  return {
    id: createUuid(),
    category,
    prompt: prompts[seed % prompts.length],
  };
}

export function getDeckCategoryRequiredLevel(category: DeckCategory): FriendshipLevel | null {
  return DECK_CATEGORY_LEVELS[category] ?? null;
}

const LEVEL_ORDER: FriendshipLevel[] = [
  'new_friend',
  'trusted_friend',
  'close_companion',
  'best_friend',
  'life_companion',
];

export function isDeckCategoryUnlocked(category: DeckCategory, level: FriendshipLevel): boolean {
  const required = getDeckCategoryRequiredLevel(category);
  if (!required) return true;
  return LEVEL_ORDER.indexOf(level) >= LEVEL_ORDER.indexOf(required);
}
