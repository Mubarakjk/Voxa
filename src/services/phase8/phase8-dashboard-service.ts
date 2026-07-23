import { CompanionIntelligenceBundle } from '../../types/companion-intelligence';
import { Goal, Memory, Reminder } from '../../types';
import { Phase8DashboardData } from '../../types/phase8-retention';
import { TodayRoutineSummary } from '../../types/routine';
import { IStorageService } from '../contracts';
import { buildLifeCalendar } from './life-calendar-service';
import { resolveCompanionMoodV8 } from './companion-mood-service';
import { buildSharedMemoriesTimeline } from './shared-memories-timeline-service';
import { getSharedChallengesService } from './shared-challenges-service';
import { buildMonthlyReplay, getMonthlyReplayService } from './monthly-replay-service';
import { buildPhotoStory } from './photo-story-service';
import { buildWidgetSnapshot } from './widget-data-service';
import { getFutureConversationsService } from './future-conversations-service';
import { getPreferenceMemoryService } from './preference-memory-service';
import { detectConversationMilestone, getConversationMilestonesService } from './conversation-milestones-service';
import { buildPhase8PromptExtension } from './phase8-prompt-service';
import { RELATIONSHIP_STAGE_LABELS, RelationshipStage } from '../../types/phase7-signature';
import { resolveRelationshipStage } from '../phase7/relationship-evolution-service';

export type BuildPhase8Input = {
  userId: string;
  bundle: CompanionIntelligenceBundle;
  memories: Memory[];
  goals: Goal[];
  reminders: Reminder[];
  routine: TodayRoutineSummary;
  streakDays: number;
  daysAway: number;
  todayFocus: string;
  coachQuote?: string;
  moodHistory: Array<{ label: string; date: string }>;
  celebrating?: boolean;
  relationshipStage?: RelationshipStage;
  storage?: IStorageService;
};

export async function buildPhase8Dashboard(input: BuildPhase8Input): Promise<Phase8DashboardData> {
  const calendar = buildLifeCalendar({
    reminders: input.reminders,
    memories: input.memories,
    goals: input.goals,
  });

  const companionMood = resolveCompanionMoodV8({
    bundle: input.bundle,
    routine: input.routine,
    streakDays: input.streakDays,
    daysAway: input.daysAway,
    celebrating: input.celebrating,
  });

  const sharedTimeline = buildSharedMemoriesTimeline({
    bundle: input.bundle,
    memories: input.memories,
    goals: input.goals,
  });

  const photoStory = buildPhotoStory(input.memories);

  let activeChallenge = null;
  let futureConversation = null;
  let preferences: import('../../types/phase8-retention').UserPreferenceMemory[] = [];
  let monthlyReplay: import('../../types/phase8-retention').MonthlyReplayData | null = null;
  let milestone = null;

  if (input.storage) {
    activeChallenge = await getSharedChallengesService(input.storage).getActive(input.userId);
    futureConversation = await getFutureConversationsService(input.storage).getDueToday(input.userId);
    preferences = await getPreferenceMemoryService(input.storage).list(input.userId);
    monthlyReplay = await getMonthlyReplayService(input.storage).getCached(input.userId);
    const shownIds = await getConversationMilestonesService(input.storage).loadShownIds();
    milestone = detectConversationMilestone({
      bundle: input.bundle,
      memories: input.memories,
      goals: input.goals,
      routine: input.routine,
      shownIds,
    });
  }

  if (!monthlyReplay) {
    monthlyReplay = buildMonthlyReplay({
      bundle: input.bundle,
      memories: input.memories,
      goals: input.goals,
      routine: input.routine,
      moodHistory: input.moodHistory,
    });
    if (input.storage) {
      void getMonthlyReplayService(input.storage).save(input.userId, monthlyReplay);
    }
  }

  const stage = input.relationshipStage ?? resolveRelationshipStage({
    daysTogether: Math.max(1, Math.floor((Date.now() - new Date(input.bundle.relationship.relationshipStartedAt).getTime()) / 86400000)),
    conversationCount: input.bundle.relationship.conversationCount,
    sharedMemories: input.bundle.relationship.sharedMemoryCount,
    goalsCompleted: input.bundle.relationship.goalsAchievedTogether,
  });

  const calendarLine = calendar.todayLine ?? calendar.tomorrowLine;
  const todayFocus = calendarLine ?? input.todayFocus;

  const widgetSnapshot = buildWidgetSnapshot({
    todayFocus,
    routine: input.routine,
    moodLabel: companionMood.mood,
    quote: input.coachQuote ?? input.bundle.relationship.summary.slice(0, 80),
    relationshipStreakDays: input.streakDays,
  });

  const preferenceBlock = input.storage
    ? getPreferenceMemoryService(input.storage).formatForPrompt(preferences)
    : '';

  const promptParts = [
    calendarLine ? `Calendar: ${calendarLine}` : null,
    futureConversation ? `Resume: ${futureConversation.resumeLine}` : null,
    `Mood: ${companionMood.mood}`,
    activeChallenge ? `Challenge: ${activeChallenge.title}` : null,
    preferenceBlock || null,
  ].filter(Boolean);

  return {
    calendar,
    companionMood,
    activeChallenge,
    sharedTimeline,
    monthlyReplay,
    photoStory,
    widgetSnapshot,
    futureConversation,
    preferences,
    milestone,
    todayFocus,
    promptBlock: buildPhase8PromptExtension(promptParts.join('\n')),
  };
}
