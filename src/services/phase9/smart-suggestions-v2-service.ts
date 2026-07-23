import { createUuid } from '../../types';
import { SmartSuggestion, SmartSuggestionKind } from '../../types/phase9-intelligence';

export function buildSmartSuggestions(input: {
  userMessage: string;
  voxaReply: string;
  goalMentioned?: boolean;
  emotional?: boolean;
  isLargeTopic?: boolean;
}): SmartSuggestion[] {
  const lower = `${input.userMessage} ${input.voxaReply}`.toLowerCase();
  const suggestions: SmartSuggestion[] = [];

  const add = (kind: SmartSuggestionKind, label: string, prompt: string, priority: number) => {
    if (!suggestions.some((s) => s.kind === kind)) {
      suggestions.push({ id: createUuid(), kind, label, prompt, priority });
    }
  };

  if (/routine|daily|every morning|habit/.test(lower)) {
    add('create_routine', 'Create routine', 'Turn this into a daily routine for me', 85);
  }
  if (input.userMessage.trim().length >= 20) {
    add('save_memory', 'Save memory', 'Remember this for me', 70);
  }
  if (/reflect|today was|grateful|feel/.test(lower) || input.emotional) {
    add('journal', 'Journal this', 'Help me journal about this moment', 80);
  }
  if (/goal|achieve|working toward/.test(lower) || input.goalMentioned) {
    add('create_goal', 'Create goal', 'Create a goal from this conversation', 88);
  }
  if (/future self|who i want to become/.test(lower)) {
    add('future_self', 'Future Self', 'Talk to my future self about this', 75);
  }
  if (/someday|bucket|dream trip|visit/.test(lower)) {
    add('bucket_list', 'Bucket list', 'Add this to my bucket list', 72);
  }
  if (/should i|decide|choice|option/.test(lower)) {
    add('decision_sim', 'Decision simulator', 'Run this through the decision simulator', 82);
  }
  if (/debate|both sides|argue/.test(lower)) {
    add('debate', 'Debate mode', 'Open debate mode on this topic', 78);
  }
  if (/focus|deep work|distraction|concentrate/.test(lower) || input.isLargeTopic) {
    add('focus_session', 'Start focus', 'Start a 25-minute focus session with me', 90);
  }
  if (/challenge|30 day|commit|streak/.test(lower)) {
    add('create_challenge', 'Shared challenge', 'Start a shared challenge for this', 76);
  }

  return suggestions.sort((a, b) => b.priority - a.priority).slice(0, 3);
}
