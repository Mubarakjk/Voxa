import { buildCompanionPrinciplesBlock } from '../../constants/companion-principles';
import { UnifiedCompanionContext } from '../../types/companion-intelligence';
import {
  CompanionModeId,
  Conversation,
  Goal,
  Memory,
  Message,
  Reminder,
  UserProfile,
} from '../../types';
import { CompanionIntelligenceBundle } from '../../types/companion-intelligence';
import { dailyPersonalityEngine } from '../personality/daily-personality-engine';
import { insideJokesEngine } from '../personality/inside-jokes-engine';
import { conversationStyleEngine } from '../personality/conversation-style-engine';
import { resolveControls } from '../personality/relationship-personality-service';
import {
  companionControlsToPromptBlock,
  resolveVoiceIdentity,
  voiceIdentityToPromptBlock,
} from '../voice/voice-identity-resolver';
import { weeklyReflectionEngine } from '../personality/weekly-reflection-engine';
import { memoryAgingEngine } from '../personality/memory-aging-engine';
import { memoryConfidenceService } from '../memory/memory-confidence-service';

export type BuildContextInput = {
  userProfile: UserProfile;
  bundle: CompanionIntelligenceBundle;
  mode: CompanionModeId;
  topMemories: Memory[];
  activeGoals: Goal[];
  upcomingReminders: Reminder[];
  recentMessages: Message[];
  recentConversations: Conversation[];
  now?: Date;
};

export class ContextEngine {
  build(input: BuildContextInput): UnifiedCompanionContext {
    const now = input.now ?? new Date();
    const hour = now.getHours();

    let timeOfDay: UnifiedCompanionContext['timeOfDay'] = 'afternoon';
    if (hour < 12) timeOfDay = 'morning';
    else if (hour < 17) timeOfDay = 'afternoon';
    else if (hour < 22) timeOfDay = 'evening';
    else timeOfDay = 'night';

    return {
      userProfile: input.userProfile,
      intelligenceProfile: input.bundle.profile,
      relationship: input.bundle.relationship,
      mode: input.mode,
      topMemories: input.topMemories,
      activeGoals: input.activeGoals,
      upcomingReminders: input.upcomingReminders,
      recentMessages: input.recentMessages,
      recentConversations: input.recentConversations,
      timeOfDay,
      currentDate: now.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
      currentTime: now.toISOString(),
      conversationQuality: input.bundle.conversationQuality,
      principlesBlock: buildCompanionPrinciplesBlock(),
      personality: input.bundle.personality,
      conversationStyle: input.bundle.conversationStyle,
      dailyPersonality: dailyPersonalityEngine.resolve(now),
      availableInsideJokes: insideJokesEngine.pickForPrompt(input.bundle.insideJokes),
      companionControls: resolveControls(input.userProfile),
      weeklyReflectionHint: weeklyReflectionEngine.latestSummaryHint(input.bundle.weeklyReflections),
    };
  }

  toPromptExtension(context: UnifiedCompanionContext): string {
    const ip = context.intelligenceProfile;
    const rel = context.relationship;

    const moodLine =
      ip.moodTrend.length > 0
        ? `Recent mood trend: ${ip.moodTrend.slice(0, 3).map((m) => m.mood).join(' → ')}`
        : '';

    const topicsLine =
      ip.favouriteTopics.length > 0 ? `Favourite topics: ${ip.favouriteTopics.slice(0, 5).join(', ')}` : '';

    const peopleLine =
      ip.relationships.length > 0
        ? `Important people: ${ip.relationships.slice(0, 4).map((p) => p.name).join(', ')}`
        : '';

    const challengesLine =
      ip.currentChallenges.length > 0
        ? `Current challenges: ${ip.currentChallenges.slice(0, 3).join('; ')}`
        : '';

    const achievementsLine =
      ip.recentAchievements.length > 0
        ? `Recent wins: ${ip.recentAchievements.slice(0, 3).join('; ')}`
        : '';

    const varietyBlock = [
      context.conversationQuality.recentGreetings.length > 0
        ? `Avoid repeating these greetings: ${context.conversationQuality.recentGreetings.slice(0, 3).join(' | ')}`
        : '',
      context.conversationQuality.recentQuestions.length > 0
        ? `Avoid repeating these questions: ${context.conversationQuality.recentQuestions.slice(0, 3).join(' | ')}`
        : '',
      context.conversationQuality.recentSuggestedTopics.length > 0
        ? `Recently suggested topics (pick something fresh): ${context.conversationQuality.recentSuggestedTopics.slice(0, 3).join(' | ')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    const recentConvos =
      context.recentConversations.length > 0
        ? context.recentConversations
            .slice(0, 2)
            .map((c) => `- ${c.mode}${c.summary ? `: ${c.summary.slice(0, 80)}` : ''}`)
            .join('\n')
        : '- No prior thread summaries yet.';

    const personality = context.personality;
    const controls = context.companionControls;
    const styleGuidance = conversationStyleEngine.toPromptGuidance(context.conversationStyle);
    const voiceIdentity = resolveVoiceIdentity(context.userProfile);
    const voiceBlock = voiceIdentityToPromptBlock(voiceIdentity, context.userProfile.companionIdentity);
    const controlsBlock = companionControlsToPromptBlock(controls);

    const jokesBlock =
      context.availableInsideJokes.length > 0
        ? `Shared moments (reference lightly, at most one per reply): ${context.availableInsideJokes
            .map((j) => `"${j.label}" (${j.kind})`)
            .join('; ')}`
        : '';

    const memoryLines =
      context.topMemories.length > 0
        ? context.topMemories
            .map((m) => `- ${m.title}: ${m.content.slice(0, 120)} (${memoryAgingEngine.describeForPrompt(m)}, ${memoryConfidenceService.describeForPrompt(m)})`)
            .join('\n')
        : '';

    return [
      context.principlesBlock,
      '',
      '## Companion intelligence',
      `Communication style: ${ip.communicationStyle}`,
      `Time of day: ${context.timeOfDay} · ${context.currentDate}`,
      moodLine,
      topicsLine,
      peopleLine,
      challengesLine,
      achievementsLine,
      ip.routines.length > 0 ? `Routines: ${ip.routines.slice(0, 3).join('; ')}` : '',
      ip.habits.length > 0 ? `Habits: ${ip.habits.slice(0, 3).join('; ')}` : '',
      '',
      '## Evolving personality (adapt gradually — never swing dramatically)',
      `Humour ${Math.round(personality.humourPreference * 100)}% · Length ${Math.round(personality.conversationLengthPreference * 100)}% · Emoji ${Math.round(personality.emojiPreference * 100)}% · Detail ${Math.round(personality.detailLevel * 100)}%`,
      personality.favouriteTopics.length > 0
        ? `Learned favourite topics: ${personality.favouriteTopics.slice(0, 6).join(', ')}`
        : '',
      '',
      '## Daily rhythm',
      `${context.dailyPersonality.label}: ${context.dailyPersonality.guidance}`,
      '',
      '## Conversation style (learned)',
      styleGuidance,
      '',
      '## User preferences (respect these)',
      controlsBlock,
      context.weeklyReflectionHint ? `\n## Private weekly reflection hint\n${context.weeklyReflectionHint}` : '',
      voiceBlock ? `\n${voiceBlock}` : '',
      jokesBlock ? `\n## Inside jokes & nicknames\n${jokesBlock}` : '',
      memoryLines ? `\n## Top memories\n${memoryLines}` : '',
      '',
      '## Relationship with Voxa',
      rel.summary,
      `Milestones: ${rel.milestones.slice(-3).map((m) => m.label).join(' · ') || 'Just beginning'}`,
      '',
      '## Recent conversation threads',
      recentConvos,
      varietyBlock ? `\n## Conversation variety\n${varietyBlock}` : '',
      context.adaptivePlan
        ? `\n## Adaptive response plan\nMode: ${context.adaptiveModeLabel ?? context.adaptivePlan.modeLabel}\nTone: ${context.adaptivePlan.tone}\nLength: ${context.adaptivePlan.lengthHint}`
        : '',
    ]
      .filter(Boolean)
      .join('\n');
  }
}

function levelLabel(value: number) {
  if (value >= 0.67) return 'high';
  if (value <= 0.33) return 'low';
  return 'medium';
}

export const contextEngine = new ContextEngine();
