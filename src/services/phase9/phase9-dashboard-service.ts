import { CompanionIntelligenceBundle } from '../../types/companion-intelligence';
import { Goal, Memory, Reminder, UserProfile } from '../../types';
import { Phase9DashboardData, QUICK_PROMPTS } from '../../types/phase9-intelligence';
import { TodayRoutineSummary } from '../../types/routine';
import { LifeCalendarSnapshot } from '../../types/phase8-retention';
import { IStorageService } from '../contracts';
import { buildDailyPlan } from './daily-planner-service';
import { getFocusModeService } from './focus-wake-service';
import { getConversationStyleMemoryService } from './conversation-style-memory-service';
import { buildRelationshipIntelligence, relationshipIntelPromptBlock } from './relationship-intelligence-service';
import { buildKnowledgeProfile, formatKnowledgeForPrompt } from './knowledge-profile-service';
import { getPreferenceMemoryService } from '../phase8/preference-memory-service';
import { buildSmartSuggestions } from './smart-suggestions-v2-service';
import { detectThinkingStyle, thinkingStylePromptBlock } from './thinking-styles-service';
import { buildPhase9PromptExtension } from './phase9-prompt-service';
import { getFuturePlatformStatuses } from './future-platform-interfaces';
import { buildPremiumStarters } from './premium-starters-service';

export type BuildPhase9Input = {
  userId: string;
  profile: UserProfile;
  bundle: CompanionIntelligenceBundle;
  memories: Memory[];
  goals: Goal[];
  reminders: Reminder[];
  routine: TodayRoutineSummary;
  calendar: LifeCalendarSnapshot;
  todayFocus: string;
  moodHistory: Array<{ label: string; date: string }>;
  streakDays: number;
  daysAway: number;
  recentUserMessage?: string | null;
  storage?: IStorageService;
};

export async function buildPhase9Dashboard(input: BuildPhase9Input): Promise<Phase9DashboardData> {
  const dailyPlan = buildDailyPlan({
    profile: input.profile,
    goals: input.goals,
    routine: input.routine,
    reminders: input.reminders,
    calendar: input.calendar,
    todayFocus: input.todayFocus,
  });

  const relationshipIntel = buildRelationshipIntelligence({
    bundle: input.bundle,
    moodHistory: input.moodHistory,
    streakDays: input.streakDays,
    daysAway: input.daysAway,
  });

  let stylePrefs = {
    prefersBullets: false,
    prefersShort: false,
    prefersDeep: false,
    prefersHumour: false,
    prefersExamples: false,
    prefersStepByStep: false,
    updatedAt: new Date().toISOString(),
  };
  let preferences: import('../../types/phase8-retention').UserPreferenceMemory[] = [];
  let activeFocus = null;

  if (input.storage) {
    stylePrefs = await getConversationStyleMemoryService(input.storage).get(input.userId);
    preferences = await getPreferenceMemoryService(input.storage).list(input.userId);
    activeFocus = await getFocusModeService(input.storage).getActive(input.userId);
  }

  const knowledgeProfile = buildKnowledgeProfile(preferences);
  const thinkingStyle = detectThinkingStyle(input.recentUserMessage ?? dailyPlan.headline);

  const quickPrompts = buildPremiumStarters({
    profile: input.profile,
    goals: input.goals,
    routine: input.routine,
    calendar: input.calendar,
    dailyPlan,
    memories: input.memories,
    relationshipIntel,
  }).slice(0, 4);

  const promptParts = [
    thinkingStylePromptBlock(thinkingStyle),
    relationshipIntelPromptBlock(relationshipIntel),
    formatKnowledgeForPrompt(knowledgeProfile),
    dailyPlan.items.length ? `Today's plan: ${dailyPlan.items.map((i) => i.label).join('; ')}` : null,
  ].filter(Boolean);

  return {
    dailyPlan,
    relationshipIntel,
    knowledgeProfile,
    stylePrefs,
    activeFocus,
    smartSuggestions: [],
    quickPrompts: quickPrompts.length > 0 ? quickPrompts : [...QUICK_PROMPTS].slice(0, 4),
    thinkingStyle,
    promptBlock: buildPhase9PromptExtension(promptParts.join('\n')),
    futurePlatforms: getFuturePlatformStatuses(),
  };
}
