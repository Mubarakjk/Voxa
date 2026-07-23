import { CompanionModeId, Goal, Memory, UserProfile } from '../../types';
import { CompanionJournalEntry } from '../journal/companion-journal-service';
import { TodayRoutineSummary } from '../../types/routine';
import { LifeCalendarSnapshot } from '../../types/phase8-retention';
import { DailyPlan, RelationshipIntelligenceSnapshot } from '../../types/phase9-intelligence';
import { buildPremiumStarters } from '../phase9/premium-starters-service';

export type ConversationStarterContext = {
  profile: UserProfile;
  routine?: TodayRoutineSummary | null;
  activeGoals?: Goal[];
  latestJournal?: CompanionJournalEntry | null;
  recentMoodLabel?: string | null;
  continuePreview?: string | null;
  pinnedMemories?: Memory[];
  recentMemory?: Memory | null;
  calendar?: LifeCalendarSnapshot | null;
  dailyPlan?: DailyPlan | null;
  relationshipIntel?: RelationshipIntelligenceSnapshot | null;
  premiumStarters?: string[];
};

export function buildConversationStarters(context: ConversationStarterContext): string[] {
  if (context.premiumStarters?.length) {
    return context.premiumStarters.slice(0, 4);
  }

  if (context.dailyPlan && context.calendar) {
    return buildPremiumStarters({
      profile: context.profile,
      goals: context.activeGoals ?? [],
      routine: context.routine ?? { blocks: [], completedCount: 0, totalCount: 0, completionPercent: 0, nextBlock: null, streakDays: 0 },
      calendar: context.calendar,
      dailyPlan: context.dailyPlan,
      memories: context.pinnedMemories ?? (context.recentMemory ? [context.recentMemory] : []),
      relationshipIntel: context.relationshipIntel ?? undefined,
      continuePreview: context.continuePreview,
      pinnedMemories: context.pinnedMemories,
      recentMoodLabel: context.recentMoodLabel,
    });
  }

  const firstName = context.profile.displayName.split(' ')[0];
  const starters: string[] = [];
  const hour = new Date().getHours();

  if (context.continuePreview?.trim()) {
    starters.push('Continue where we left off');
  }

  if (context.routine && context.routine.nextBlock) {
    starters.push(`Help me with “${context.routine.nextBlock.title}”`);
  } else if (hour < 12) {
    starters.push('Help me plan today');
  }

  const topGoal = context.activeGoals?.find((goal) => goal.status === 'active');
  if (topGoal) {
    starters.push(`Check in on my ${topGoal.title.toLowerCase()} goal`);
  }

  if (hour >= 17 && context.latestJournal) {
    starters.push('I want to reflect on today');
  } else if (context.recentMoodLabel && /stress|hard|tired|low/i.test(context.recentMoodLabel)) {
    starters.push('I could use a gentle check-in');
  }

  const pinned = context.pinnedMemories?.[0] ?? context.recentMemory;
  if (pinned && starters.length < 3) {
    starters.push(`Remind me what I said about ${pinned.title.toLowerCase()}`);
  }

  if (starters.length === 0) {
    return [
      `Hey ${firstName}, how are you?`,
      'What should I focus on today?',
      'Tell me something encouraging',
    ];
  }

  const unique = [...new Set(starters)];
  return unique.slice(0, 3);
}

export function buildPostReplyStarters(
  voxaReply: string,
  mode: CompanionModeId,
): string[] {
  const lower = voxaReply.toLowerCase();
  if (/goal|routine|plan|schedule|tomorrow/.test(lower)) {
    return ['What should I do next?', 'Help me make this realistic', 'Thanks — that helps'];
  }
  if (/feel|mood|stress|hard|sorry/.test(lower)) {
    return ['Tell me more', 'What would help right now?', 'Thanks for listening'];
  }
  if (mode === 'coach') {
    return ['Break that into steps', 'Hold me accountable gently', 'What matters most?'];
  }
  return ['Tell me more', 'Say that another way', 'Thanks — that helps'];
}
