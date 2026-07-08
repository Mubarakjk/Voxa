import {
  CompanionIntelligenceBundle,
  createDefaultIntelligenceBundle,
} from '../../types/companion-intelligence';
import {
  createDefaultCompanionControls,
  createDefaultConversationStyle,
  createDefaultEvolvingPersonality,
} from '../../types/relationship-personality';
import { Goal, Message, UserProfile, nowIso } from '../../types';
import { CompanionModeId } from '../../types';
import { conversationStyleEngine } from './conversation-style-engine';
import { dailyPersonalityEngine } from './daily-personality-engine';
import { insideJokesEngine } from './inside-jokes-engine';
import { personalityEvolutionEngine } from './personality-evolution-engine';
import { weeklyReflectionEngine } from './weekly-reflection-engine';

export type RelationshipPersonalityAfterInput = {
  bundle: CompanionIntelligenceBundle;
  userProfile: UserProfile;
  userMessage: string;
  voxaReply: string;
  mode: CompanionModeId;
  goals: Goal[];
  messages: Message[];
  birthdayRemembered?: boolean;
};

export class RelationshipPersonalityService {
  afterConversation(input: RelationshipPersonalityAfterInput): CompanionIntelligenceBundle {
    const controls = resolveControls(input.userProfile);

    const personality = personalityEvolutionEngine.evolve({
      traits: input.bundle.personality,
      userMessage: input.userMessage,
      voxaReply: input.voxaReply,
      mode: input.mode,
      controls,
    });

    const insideJokes = insideJokesEngine.detect({
      jokes: input.bundle.insideJokes,
      userMessage: input.userMessage,
      voxaReply: input.voxaReply,
    });

    const conversationStyle = conversationStyleEngine.learn({
      style: input.bundle.conversationStyle,
      userMessage: input.userMessage,
      voxaReply: input.voxaReply,
    });

    let weeklyReflections = [...input.bundle.weeklyReflections];
    if (weeklyReflectionEngine.shouldGenerate(weeklyReflections)) {
      const reflection = weeklyReflectionEngine.generate({
        profile: input.userProfile,
        bundle: {
          ...input.bundle,
          personality,
          insideJokes,
          conversationStyle,
        },
        goals: input.goals,
        messages: input.messages,
      });
      weeklyReflections = [reflection, ...weeklyReflections].slice(0, 52);
    }

    return {
      ...input.bundle,
      personality,
      insideJokes,
      conversationStyle,
      weeklyReflections,
    };
  }

  getDailyModifier(now?: Date) {
    return dailyPersonalityEngine.resolve(now);
  }

  getAvailableJokes(bundle: CompanionIntelligenceBundle) {
    return insideJokesEngine.pickForPrompt(bundle.insideJokes);
  }

  getStyleGuidance(bundle: CompanionIntelligenceBundle) {
    return conversationStyleEngine.toPromptGuidance(bundle.conversationStyle);
  }

  getWeeklyHint(bundle: CompanionIntelligenceBundle) {
    return weeklyReflectionEngine.latestSummaryHint(bundle.weeklyReflections);
  }
}

export function resolveControls(profile: UserProfile) {
  return profile.preferences.companionControls ?? createDefaultCompanionControls();
}

export function hydrateIntelligenceBundle(
  userId: string,
  displayName: string,
  bundle: Partial<CompanionIntelligenceBundle> | CompanionIntelligenceBundle,
): CompanionIntelligenceBundle {
  const startedAt = bundle.relationship?.relationshipStartedAt ?? nowIso();
  const defaults = createDefaultIntelligenceBundle(userId, displayName, startedAt);

  return {
    profile: bundle.profile ?? defaults.profile,
    relationship: bundle.relationship ?? defaults.relationship,
    conversationQuality: bundle.conversationQuality ?? defaults.conversationQuality,
    lifeTimeline: bundle.lifeTimeline ?? defaults.lifeTimeline,
    personality:
      bundle.personality ?? createDefaultEvolvingPersonality(startedAt),
    insideJokes: bundle.insideJokes ?? [],
    conversationStyle:
      bundle.conversationStyle ?? createDefaultConversationStyle(startedAt),
    weeklyReflections: bundle.weeklyReflections ?? [],
  };
}

export const relationshipPersonalityService = new RelationshipPersonalityService();
