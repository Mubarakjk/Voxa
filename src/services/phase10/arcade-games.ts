import { ArcadeGameDefinition, ArcadeGameId } from '../../types/phase10-play';

export const ARCADE_GAMES: ArcadeGameDefinition[] = [
  { id: 'would_you_rather', title: 'Would You Rather', emoji: '🤔', description: 'Thoughtful choices', starterPrompt: 'Play would-you-rather with me — three rounds, keep it fun.', xpReward: 15 },
  { id: 'this_or_that', title: 'This or That', emoji: '⚖️', description: 'Quick preferences', starterPrompt: 'This or that — rapid fire, then tell me what my choices say about me.', xpReward: 10 },
  { id: 'guess_movie', title: 'Guess the Movie', emoji: '🎬', description: 'Clues only', starterPrompt: 'Give me clues to guess a movie — I will ask yes/no questions.', xpReward: 20 },
  { id: 'guess_football_player', title: 'Guess the Player', emoji: '⚽', description: 'Football legends', starterPrompt: 'Football player guessing game — clues only, no made-up stats.', xpReward: 20 },
  { id: 'emoji_quiz', title: 'Emoji Quiz', emoji: '😀', description: 'Decode the emoji', starterPrompt: 'Emoji quiz — give me three emoji puzzles to solve.', xpReward: 15 },
  { id: 'trivia', title: 'Trivia', emoji: '🧠', description: 'General knowledge', starterPrompt: 'Five trivia questions — mix of easy and medium.', xpReward: 25 },
  { id: 'twenty_questions', title: '20 Questions', emoji: '❓', description: 'Classic guessing', starterPrompt: 'I am thinking of something — ask up to 20 yes/no questions.', xpReward: 20 },
  { id: 'word_association', title: 'Word Association', emoji: '🔗', description: 'Free flow', starterPrompt: 'Word association game — we take turns, one word each.', xpReward: 10 },
  { id: 'finish_sentence', title: 'Finish the Sentence', emoji: '✍️', description: 'Creative completions', starterPrompt: 'Finish the sentence — give me five starters to complete creatively.', xpReward: 15 },
  { id: 'two_truths_lie', title: 'Two Truths & a Lie', emoji: '🎭', description: 'Spot the lie', starterPrompt: 'Two truths and a lie about me — ask questions to guess the lie.', xpReward: 20 },
  { id: 'memory_challenge', title: 'Memory Challenge', emoji: '🧩', description: 'Recall together', starterPrompt: 'Memory challenge using what you know about me — only real memories.', xpReward: 25 },
  { id: 'guess_favourite', title: 'Guess My Favourite', emoji: '💜', description: 'How well do you know me?', starterPrompt: 'Guess my favourites — food, film, team — from what you remember.', xpReward: 20 },
  { id: 'drawing_prompt', title: 'Drawing Prompt', emoji: '🎨', description: 'Describe a scene', starterPrompt: 'Give me a creative drawing prompt and describe the scene vividly.', xpReward: 15 },
  { id: 'startup_pitch', title: 'Startup Pitch', emoji: '🚀', description: 'Pitch practice', starterPrompt: 'Startup pitch challenge — I pitch, you play tough investor for 3 questions.', xpReward: 25 },
  { id: 'coding_quiz', title: 'Coding Quiz', emoji: '⌨️', description: 'Dev trivia', starterPrompt: 'Short coding quiz — 5 questions, explain answers briefly.', xpReward: 25 },
  { id: 'geography_quiz', title: 'Geography Quiz', emoji: '🌍', description: 'Places & maps', starterPrompt: 'Geography quiz — five questions, increasing difficulty.', xpReward: 20 },
  { id: 'history_quiz', title: 'History Quiz', emoji: '📜', description: 'Past events', starterPrompt: 'History quiz — five questions, no invented facts.', xpReward: 20 },
  { id: 'science_quiz', title: 'Science Quiz', emoji: '🔬', description: 'How things work', starterPrompt: 'Science quiz — five fun questions with clear explanations.', xpReward: 20 },
  { id: 'maths_challenge', title: 'Maths Challenge', emoji: '🔢', description: 'Mental maths', starterPrompt: 'Mental maths challenge — five problems, no calculator.', xpReward: 20 },
  { id: 'daily_brain_teaser', title: 'Daily Brain Teaser', emoji: '💡', description: 'One puzzle a day', starterPrompt: 'One brain teaser for today — give hints if I am stuck.', xpReward: 30 },
];

export function getArcadeGame(id: ArcadeGameId): ArcadeGameDefinition | undefined {
  return ARCADE_GAMES.find((g) => g.id === id);
}

export function pickFeaturedGame(seed: number): ArcadeGameDefinition {
  return ARCADE_GAMES[seed % ARCADE_GAMES.length];
}
