import { Goal, Memory, UserProfile } from '../../types';
import { DailyPlan, RelationshipIntelligenceSnapshot } from '../../types/phase9-intelligence';
import { TodayRoutineSummary } from '../../types/routine';
import { LifeCalendarSnapshot } from '../../types/phase8-retention';

export type PremiumStarterContext = {
  profile: UserProfile;
  goals: Goal[];
  routine: TodayRoutineSummary;
  calendar: LifeCalendarSnapshot;
  dailyPlan: DailyPlan;
  memories: Memory[];
  relationshipIntel?: RelationshipIntelligenceSnapshot;
  continuePreview?: string | null;
  pinnedMemories?: Memory[];
  recentMoodLabel?: string | null;
};

export function buildPremiumStarters(context: PremiumStarterContext): string[] {
  const firstName = context.profile.displayName.split(' ')[0];
  const starters: string[] = [];
  const hour = new Date().getHours();

  if (context.continuePreview?.trim()) {
    starters.push(`Pick up where we left off — ${context.continuePreview.slice(0, 40)}`);
  }

  if (context.calendar.todayLine) {
    starters.push(context.calendar.todayLine.replace(/\.$/, '') + ' — help me prep');
  } else if (context.calendar.tomorrowLine) {
    starters.push(context.calendar.tomorrowLine.replace(/\.$/, '') + ' — what should I do?');
  }

  const topPlan = context.dailyPlan.items[0];
  if (topPlan && !starters.some((s) => s.includes(topPlan.label))) {
    starters.push(`Let's focus on: ${topPlan.label}`);
  }

  if (context.relationshipIntel?.trend === 'stressed' || context.relationshipIntel?.trend === 'burnout_risk') {
    starters.push('I need a calm check-in — no fixing, just listen');
  } else if (context.recentMoodLabel && /stress|hard|tired|low/i.test(context.recentMoodLabel)) {
    starters.push('Rough day — talk me through it');
  }

  const topGoal = context.goals.find((g) => g.status === 'active');
  if (topGoal) {
    starters.push(`Where am I with "${topGoal.title}"?`);
  }

  if (hour < 11 && context.routine.nextBlock) {
    starters.push(`Coach me through "${context.routine.nextBlock.title}"`);
  } else if (hour >= 17) {
    starters.push('Help me close out today well');
  }

  const pinned = context.pinnedMemories?.[0] ?? context.memories.find((m) => m.pinned) ?? context.memories[0];
  if (pinned && starters.length < 4) {
    starters.push(`You remember "${pinned.title}" — still relevant?`);
  }

  if (starters.length === 0) {
    return [
      `${firstName}, what is actually on your mind?`,
      'Help me plan the next 2 hours',
      'I want to talk about something real',
    ];
  }

  return [...new Set(starters)].slice(0, 4);
}
