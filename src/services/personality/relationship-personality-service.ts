import {
  CompanionIntelligenceBundle,
  createDefaultIntelligenceBundle,
} from '../../types/companion-intelligence';
import {
  createDefaultCompanionControls,
  createDefaultConversationStyle,
  createDefaultEvolvingPersonality,
} from '../../types/relationship-personality';
import { createDefaultAdaptiveState } from '../../types/phase3-intelligence';
import { Goal, Message, UserProfile, nowIso } from '../../types';
import { CompanionModeId } from '../../types';
import { asArray, asStringArray } from '../../utils/as-array';
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
  const profileIn = bundle.profile;
  const relationshipIn = bundle.relationship;
  const qualityIn = bundle.conversationQuality;

  return {
    profile: {
      ...defaults.profile,
      ...profileIn,
      userId,
      goals: asStringArray(profileIn?.goals),
      routines: asStringArray(profileIn?.routines),
      habits: asStringArray(profileIn?.habits),
      moodTrend: asArray(profileIn?.moodTrend),
      favouriteTopics: asStringArray(profileIn?.favouriteTopics),
      productivityPatterns: asStringArray(profileIn?.productivityPatterns),
      fitnessProgress: asStringArray(profileIn?.fitnessProgress),
      studyProgress: asStringArray(profileIn?.studyProgress),
      interests: asStringArray(profileIn?.interests),
      relationships: asArray(profileIn?.relationships),
      importantDates: asArray(profileIn?.importantDates),
      recentAchievements: asStringArray(profileIn?.recentAchievements),
      currentChallenges: asStringArray(profileIn?.currentChallenges),
      communicationStyle: profileIn?.communicationStyle ?? defaults.profile.communicationStyle,
      preferredMode: profileIn?.preferredMode ?? defaults.profile.preferredMode,
      updatedAt: profileIn?.updatedAt ?? defaults.profile.updatedAt,
    },
    relationship: {
      ...defaults.relationship,
      ...relationshipIn,
      userId,
      relationshipStartedAt: relationshipIn?.relationshipStartedAt ?? startedAt,
      conversationCount: Number(relationshipIn?.conversationCount) || 0,
      voiceCallCount: Number(relationshipIn?.voiceCallCount) || 0,
      sharedMemoryCount: Number(relationshipIn?.sharedMemoryCount) || 0,
      goalsAchievedTogether: Number(relationshipIn?.goalsAchievedTogether) || 0,
      milestones: asArray(relationshipIn?.milestones),
      favouriteTopics: asStringArray(relationshipIn?.favouriteTopics),
      preferredConversationHours: asArray(relationshipIn?.preferredConversationHours),
      summary:
        typeof relationshipIn?.summary === 'string' && relationshipIn.summary.trim()
          ? relationshipIn.summary
          : defaults.relationship.summary,
      updatedAt: relationshipIn?.updatedAt ?? defaults.relationship.updatedAt,
    },
    conversationQuality: {
      recentQuestions: asStringArray(qualityIn?.recentQuestions),
      recentGreetings: asStringArray(qualityIn?.recentGreetings),
      recentSuggestedTopics: asStringArray(qualityIn?.recentSuggestedTopics),
      updatedAt: qualityIn?.updatedAt ?? startedAt,
    },
    lifeTimeline: asArray(bundle.lifeTimeline),
    personality: bundle.personality ?? createDefaultEvolvingPersonality(startedAt),
    insideJokes: asArray(bundle.insideJokes),
    conversationStyle: {
      ...createDefaultConversationStyle(startedAt),
      ...bundle.conversationStyle,
      pacingPreference: bundle.conversationStyle?.pacingPreference ?? 0.5,
      questioningStyle: bundle.conversationStyle?.questioningStyle ?? 0.5,
      emojiAffinity: bundle.conversationStyle?.emojiAffinity ?? 0.3,
      humourAffinity: bundle.conversationStyle?.humourAffinity ?? 0.5,
    },
    weeklyReflections: asArray(bundle.weeklyReflections),
    adaptive: (() => {
      const adaptiveIn = bundle.adaptive ?? createDefaultAdaptiveState(startedAt);
      const sports = adaptiveIn.sportsPreferences;
      const baseline = adaptiveIn.emotionalBaseline;
      return {
        ...createDefaultAdaptiveState(startedAt),
        ...adaptiveIn,
        sportsPreferences: {
          teams: asStringArray(sports?.teams),
          athletes: asStringArray(sports?.athletes),
          sports: asStringArray(sports?.sports),
          updatedAt: sports?.updatedAt ?? startedAt,
        },
        emotionalBaseline: {
          averageMood: baseline?.averageMood ?? 'neutral',
          recentTrend: baseline?.recentTrend ?? 'steady',
          lastShiftDetectedAt: baseline?.lastShiftDetectedAt,
          checkInsOfferedAt: asArray(baseline?.checkInsOfferedAt),
        },
        updatedAt: adaptiveIn.updatedAt ?? startedAt,
      };
    })(),
  };
}

export const relationshipPersonalityService = new RelationshipPersonalityService();
