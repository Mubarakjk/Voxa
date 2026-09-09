import { CompanionIntelligenceBundle, LifeTimelineEvent } from '../../types/companion-intelligence';
import { Goal, Memory, Reminder, UserProfile } from '../../types';
import { Phase2DashboardData } from '../../types/phase2-intelligence';
import { TodayRoutineSummary } from '../../types/routine';
import { HomeIntelligenceSnapshot } from '../../types/companion-intelligence';
import { WowExperienceData } from '../wow/wow-experience-service';
import { MoodHistoryEntry } from '../check-in/daily-check-in-service';
import { CompanionJournalEntry } from '../journal/companion-journal-service';
import { RitualStreaks } from '../../types/ritual';
import { buildDailyCoach } from './daily-coach-service';
import { buildEmotionalMoments } from './emotional-moments-service';
import {
  countTimelineMilestones,
  getAvailableTimelineKinds,
  normalizeTimelineEvents,
} from './life-timeline-service';
import { summarizeMemoryThemes } from '../memory/memory-theme-service';

/** Word-aware preview so Life at a Glance never chops mid-word. */
function snippetPreview(text: string | undefined | null, maxChars = 140): string | null {
  if (!text) return null;
  const cleaned = text.trim().replace(/\s+/g, ' ');
  if (!cleaned) return null;
  if (cleaned.length <= maxChars) return cleaned;
  const cut = cleaned.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(' ');
  const base = lastSpace > Math.floor(maxChars * 0.55) ? cut.slice(0, lastSpace) : cut;
  return `${base}…`;
}

export type BuildPhase2DashboardInput = {
  profile: UserProfile;
  bundle: CompanionIntelligenceBundle;
  homeIntelligence: HomeIntelligenceSnapshot;
  wowExperience: WowExperienceData;
  goals: Goal[];
  memories: Memory[];
  reminders: Reminder[];
  routine: TodayRoutineSummary;
  moodHistory: MoodHistoryEntry[];
  journalEntry: CompanionJournalEntry | null;
  ritualStreaks: RitualStreaks;
  routineNudge: string | null;
  ritualCoachLine: string | null;
  daysAway?: number;
  timelineEvents: LifeTimelineEvent[];
};

export function buildPhase2Dashboard(input: BuildPhase2DashboardInput): Phase2DashboardData {
  const friend = input.wowExperience.friendProfile;
  const timelineEvents = normalizeTimelineEvents(input.timelineEvents);

  const moodHistory = input.moodHistory;
  const latestMood = moodHistory[0]?.label ?? input.wowExperience.moodLabel;
  let moodTrend: 'up' | 'steady' | 'down' = 'steady';
  if (moodHistory.length >= 2) {
    const stressed = ['stressed', 'sad', 'low'].some((w) => moodHistory[0].label.toLowerCase().includes(w));
    const better = ['calm', 'motivated', 'happy', 'good'].some((w) =>
      moodHistory[1].label.toLowerCase().includes(w),
    );
    if (stressed && !better) moodTrend = 'down';
    if (better && !stressed) moodTrend = 'up';
  }

  const sleepSchedule = input.profile.onboarding?.sleepSchedule ?? null;
  const habits = input.bundle.profile.habits?.slice(0, 5) ?? [];

  const lifeDashboard = {
    moodLabel: latestMood,
    moodTrend,
    sleepSchedule,
    routinePercent: input.routine.completionPercent,
    routineStreak: input.routine.streakDays,
    activeGoals: input.goals.length,
    topGoalTitle: input.goals[0]?.title ?? null,
    journalSnippet: snippetPreview(input.journalEntry?.body, 140),
    habits,
    checkInStreak: input.ritualStreaks.combined,
  };

  const relationshipDashboard = {
    conversationCount: input.wowExperience.conversationCount,
    daysTogether: friend.daysTogether,
    relationshipScore: friend.relationshipScore,
    ritualStreak: input.ritualStreaks.combined,
    goalsAchieved: input.bundle.relationship.goalsAchievedTogether,
    sharedMemories: input.memories.length,
    milestones: input.bundle.relationship.milestones.slice(0, 5).map((m) => ({
      id: m.id,
      label: m.label,
    })),
    highlightMemory: input.memories[0]?.title ?? null,
    naturalRecallLine: friend.naturalRecallLines[0] ?? null,
  };

  const dailyCoach = buildDailyCoach({
    profile: input.profile,
    homeIntelligence: input.homeIntelligence,
    goals: input.goals,
    memories: input.memories,
    routine: input.routine,
    moodHistory,
    routineNudge: input.routineNudge,
    ritualCoachLine: input.ritualCoachLine,
  });

  const emotionalMoments = buildEmotionalMoments({
    profile: input.profile,
    bundle: input.bundle,
    goals: input.goals,
    memories: input.memories,
    reminders: input.reminders,
    daysAway: input.daysAway,
    ritualStreak: input.ritualStreaks.combined,
  });

  return {
    lifeDashboard,
    relationshipDashboard,
    dailyCoach,
    emotionalMoments,
    timeline: {
      events: timelineEvents,
      availableKinds: getAvailableTimelineKinds(timelineEvents),
      milestoneCount: countTimelineMilestones(timelineEvents),
    },
    memoryThemes: summarizeMemoryThemes(input.memories),
  };
}
