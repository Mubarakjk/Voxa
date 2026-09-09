import { TalkIntent } from '../ai/companion-intent';
import { ConversationState, QuestionPolicy } from '../ai/companion-strategy';
import { humourIsSuppressed, ResponseStance } from '../ai/turn-intelligence-plan';
import { SmartSuggestion } from '../../types/phase9-intelligence';
import { createUuid } from '../../types';

function suggestion(label: string, prompt: string, priority: number): SmartSuggestion {
  return {
    id: createUuid(),
    kind: 'focus_session',
    label,
    prompt,
    priority,
  };
}

export function playfulChipsForbidden(input: {
  userMessage: string;
  humourSuppressed?: boolean;
}): boolean {
  if (input.humourSuppressed) return true;
  return humourIsSuppressed(input.userMessage, 'unknown', 'support');
}

/**
 * Stance-first chips for the current turn.
 * Empty is a valid result — do not invent engagement filler.
 */
export function buildContextualSuggestions(input: {
  talkIntent: TalkIntent;
  userMessage: string;
  voxaReply: string;
  strategy?: ConversationState;
  stance?: ResponseStance;
  humourSuppressed?: boolean;
  questionPolicy?: QuestionPolicy;
}): SmartSuggestion[] {
  const user = input.userMessage.trim();
  const lower = user.toLowerCase();
  const intent =
    input.talkIntent === 'memory_recall' || input.talkIntent === 'factual_question'
      ? input.talkIntent
      : (input.strategy?.intent ?? input.talkIntent);
  const stance = input.stance;
  const safety = playfulChipsForbidden({
    userMessage: user,
    humourSuppressed: input.humourSuppressed,
  });

  if (safety) return [];
  if (intent === 'factual_question' || stance === 'inform') return [];
  if (intent === 'celebration' || stance === 'celebrate') return [];
  if (stance === 'listen' && (/\b(just (need to )?vent|don't want advice|do not want advice|please just listen|no advice)\b/i.test(lower) || intent === 'emotional_support')) {
    return [];
  }
  if (intent === 'emotional_support' && stance !== 'plan' && stance !== 'coach') {
    return [];
  }

  switch (intent) {
    case 'casual_conversation':
      if (/\bbored\b/.test(lower)) {
        return [
          suggestion('Something random', 'Give me something random', 90),
          suggestion('Play something', "Let's play something", 85),
          suggestion('Talk to me', 'Talk to me', 80),
        ];
      }
      return [];

    case 'planning':
    case 'productivity':
    case 'routine':
      return [
        suggestion('Make me a plan', 'Make me a plan for this', 90),
        suggestion('Prioritise these', 'Prioritise these for me', 85),
        suggestion('Break it into steps', 'Break this into steps', 80),
      ];

    case 'decision_support':
      return [
        suggestion('Pick one', 'Pick one for me', 90),
        suggestion('Compare them', 'Compare them', 85),
      ];

    case 'memory_recall':
      return [
        suggestion('What else?', 'What else do you remember about me?', 90),
        suggestion('Remember this', 'Remember this for me', 85),
      ];

    case 'brainstorming':
      return [
        suggestion('More ideas', 'Give me more ideas', 85),
        suggestion('Pick one', 'Pick the strongest option', 80),
      ];

    default:
      break;
  }

  if (stance === 'plan' || stance === 'coach') {
    return [
      suggestion('Make me a plan', 'Make me a plan for this', 90),
      suggestion('Prioritise these', 'Prioritise these for me', 85),
      suggestion('Break it into steps', 'Break this into steps', 80),
    ];
  }

  if (stance === 'challenge') return [];

  return [];
}

export function contextualSuggestionPrompts(input: {
  talkIntent: TalkIntent;
  userMessage: string;
  voxaReply: string;
}): string[] {
  return buildContextualSuggestions(input).map((item) => item.prompt);
}

/**
 * Turn-level chips win, including an intentional empty list
 * (e.g. factual answers should not fall back to coach/planning starters).
 */
export function resolveTurnSuggestionPrompts(input: {
  contextual?: Array<{ prompt: string }>;
  fallback: string[];
}): string[] {
  if (input.contextual) {
    return input.contextual.map((item) => item.prompt).filter((prompt) => prompt.trim().length > 0);
  }
  return input.fallback.filter((prompt) => prompt.trim().length > 0);
}
