import { EvolvingPersonalityTraits } from '../../types/relationship-personality';
import { CompanionModeId, nowIso } from '../../types';
import { CompanionControlPreferences } from '../../types/relationship-personality';

const MAX_NUDGE = 0.04;

export type PersonalityEvolutionInput = {
  traits: EvolvingPersonalityTraits;
  userMessage: string;
  voxaReply: string;
  mode: CompanionModeId;
  controls: CompanionControlPreferences;
};

export class PersonalityEvolutionEngine {
  evolve(input: PersonalityEvolutionInput): EvolvingPersonalityTraits {
    const user = input.userMessage;
    const lower = user.toLowerCase();

    const targets = { ...input.traits };

    if (/lol|haha|funny|😂|🤣|lmao/.test(lower)) {
      targets.humourPreference = nudge(input.traits.humourPreference, 0.85);
    }
    if (/too long|shorter|tldr|keep it brief|quick answer/.test(lower)) {
      targets.conversationLengthPreference = nudge(input.traits.conversationLengthPreference, 0.2);
    }
    if (/more detail|explain|tell me more|go deeper/.test(lower)) {
      targets.conversationLengthPreference = nudge(input.traits.conversationLengthPreference, 0.85);
      targets.detailLevel = nudge(input.traits.detailLevel, 0.8);
    }
    if (/emoji|😊|❤️/.test(user)) {
      targets.emojiPreference = nudge(input.traits.emojiPreference, 0.75);
    }
    if (/no emoji|less emoji/.test(lower)) {
      targets.emojiPreference = nudge(input.traits.emojiPreference, 0.1);
    }
    if (/motivat|you got this|push me|hold me accountable/.test(lower)) {
      targets.motivationalStyle = nudge(input.traits.motivationalStyle, 0.8);
      targets.accountabilityStyle = nudge(input.traits.accountabilityStyle, 0.75);
    }
    if (/gentle|soft|no pressure|easy on me/.test(lower)) {
      targets.encouragementStyle = nudge(input.traits.encouragementStyle, 0.85);
      targets.accountabilityStyle = nudge(input.traits.accountabilityStyle, 0.25);
    }
    if (/\?/.test(user) && user.split(/\s+/).length < 12) {
      targets.curiosityLevel = nudge(input.traits.curiosityLevel, 0.7);
    }

    targets.preferredWordingWarmth = nudge(
      input.traits.preferredWordingWarmth,
      input.controls.voiceWarmth,
    );
    targets.humourPreference = nudge(input.traits.humourPreference, input.controls.humour);
    targets.emojiPreference = nudge(input.traits.emojiPreference, input.controls.emojiUsage);
    targets.detailLevel = nudge(input.traits.detailLevel, input.controls.conversationDepth);
    targets.encouragementStyle = nudge(input.traits.encouragementStyle, input.controls.friendliness);

    if (input.mode === 'coach') {
      targets.accountabilityStyle = nudge(targets.accountabilityStyle, input.controls.coachStrictness);
    }

    const topicTokens = extractTopics(user);
    targets.favouriteTopics = unique([
      ...topicTokens,
      ...input.traits.favouriteTopics,
    ]).slice(0, 12);

    return { ...targets, updatedAt: nowIso() };
  }
}

function nudge(current: number, target: number) {
  const delta = Math.sign(target - current) * Math.min(Math.abs(target - current), MAX_NUDGE);
  return clamp(current + delta, 0, 1);
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function extractTopics(text: string) {
  const topics: string[] = [];
  const lower = text.toLowerCase();
  for (const word of ['music', 'work', 'study', 'fitness', 'family', 'travel', 'games', 'food']) {
    if (lower.includes(word)) topics.push(word);
  }
  return topics;
}

function unique(items: string[]) {
  return [...new Set(items)];
}

export const personalityEvolutionEngine = new PersonalityEvolutionEngine();
