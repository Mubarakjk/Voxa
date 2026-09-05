import { TalkIntent } from '../ai/companion-intent';
import { ConversationState } from '../ai/companion-strategy';
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

/**
 * Intent-first contextual chips for the current turn.
 * Avoids stale planning/focus actions leaking into casual messages.
 */
export function buildContextualSuggestions(input: {
  talkIntent: TalkIntent;
  userMessage: string;
  voxaReply: string;
  strategy?: ConversationState;
}): SmartSuggestion[] {
  const user = input.userMessage.trim();
  const reply = input.voxaReply.trim();
  const lower = user.toLowerCase();
  const intent =
    input.talkIntent === 'memory_recall' || input.talkIntent === 'factual_question'
      ? input.talkIntent
      : (input.strategy?.intent ?? input.talkIntent);

  switch (intent) {
    case 'casual_conversation':
      if (/\bbored\b/.test(lower)) {
        return [
          suggestion('Something random', 'Give me something random', 90),
          suggestion('Play something', "Let's play something", 85),
          suggestion('Talk to me', 'Talk to me', 80),
        ];
      }
      return [
        suggestion('Keep chatting', 'Tell me more', 80),
        suggestion('Switch it up', 'Change the topic', 75),
        suggestion('Make me laugh', 'Make me laugh', 70),
      ];

    case 'factual_question':
      return [];

    case 'planning':
    case 'productivity':
      return [
        suggestion('Make a plan', 'Make me a plan for this', 90),
        suggestion('Break it down', 'Break this into steps', 85),
        suggestion('Focus session', 'Start a 25-minute focus session with me', 80),
      ];

    case 'decision_support':
      return [
        suggestion('Pick one for me', 'Pick one for me', 90),
        suggestion('Compare them', 'Compare them', 85),
        suggestion('Biggest downside?', "What's the biggest downside?", 80),
      ];

    case 'memory_recall':
      return [
        suggestion('What else?', 'What else do you remember about me?', 90),
        suggestion('Remember this', 'Remember this for me', 85),
      ];

    case 'celebration':
      return [
        suggestion('Tell me more', 'Let me tell you what happened', 85),
        suggestion("What's next?", "What's next?", 80),
      ];

    case 'emotional_support':
      return [
        suggestion('Talk it through', 'Help me talk this through', 85),
        suggestion('Keep it simple', 'Keep it simple with me', 75),
      ];

    case 'brainstorming':
      return [
        suggestion('More ideas', 'Give me more ideas', 85),
        suggestion('Pick one', 'Pick the strongest option', 80),
      ];

    default:
      break;
  }

  if (reply.endsWith('?')) {
    return [
      suggestion('Yes', 'Yes', 80),
      suggestion('Not really', 'Not really', 75),
      suggestion('Tell me more', 'Tell me more', 70),
    ];
  }

  return [
    suggestion('Go on', 'Go on', 75),
    suggestion('Different angle', 'Try a different angle', 70),
    suggestion('Keep it short', 'Keep it short', 65),
  ];
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
