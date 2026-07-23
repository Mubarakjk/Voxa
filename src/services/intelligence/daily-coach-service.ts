import { HomeIntelligenceSnapshot } from '../../types/companion-intelligence';
import { Goal, Memory, UserProfile } from '../../types';
import { DailyCoachSnapshot } from '../../types/phase2-intelligence';
import { TodayRoutineSummary } from '../../types/routine';
import { MoodHistoryEntry } from '../check-in/daily-check-in-service';

export type BuildDailyCoachInput = {
  profile: UserProfile;
  homeIntelligence: HomeIntelligenceSnapshot;
  goals: Goal[];
  memories: Memory[];
  routine: TodayRoutineSummary;
  moodHistory: MoodHistoryEntry[];
  routineNudge: string | null;
  ritualCoachLine: string | null;
};

export function buildDailyCoach(input: BuildDailyCoachInput): DailyCoachSnapshot {
  const firstName = input.profile.displayName.split(' ')[0];
  const hour = new Date().getHours();
  const adaptedFrom: string[] = [];

  const latestMood = input.moodHistory[0];
  const lowMood = latestMood?.mood === 'stressed';
  const highMood = latestMood?.mood === 'motivated' || latestMood?.mood === 'joyful';

  const topGoal = input.goals.find((g) => g.status === 'active');
  const deadlineGoal = input.goals.find(
    (g) => g.targetDate && new Date(g.targetDate).getTime() - Date.now() < 3 * 86400000,
  );

  let message = input.homeIntelligence.progressUpdate || input.homeIntelligence.dailyFocus;
  adaptedFrom.push('home intelligence');

  if (input.routineNudge) {
    message = input.routineNudge;
    adaptedFrom.push('routine');
  }

  if (input.ritualCoachLine) {
    message = input.ritualCoachLine;
    adaptedFrom.push('ritual');
  }

  if (lowMood) {
    message = 'Take today gently. One small step is enough — I am here with you.';
    adaptedFrom.push('mood trend');
  } else if (highMood && topGoal) {
    message = `Your energy is up — great day to push "${topGoal.title}" forward.`;
    adaptedFrom.push('mood + goal');
  }

  if (deadlineGoal) {
    message = `"${deadlineGoal.title}" is coming up soon. Want to plan one focused block today?`;
    adaptedFrom.push('goal deadline');
  }

  if (input.routine.totalCount > 0 && input.routine.completionPercent < 30 && hour >= 14) {
    message = `You're at ${input.routine.completionPercent}% on routines today. One completion would feel good.`;
    adaptedFrom.push('routine progress');
  }

  const recentMemory = input.memories[0];
  if (recentMemory && !lowMood && hour < 12) {
    message = `${message} I still remember: "${recentMemory.title.slice(0, 40)}".`;
    adaptedFrom.push('memory callback');
  }

  const greeting =
    hour < 12
      ? `Good morning, ${firstName}.`
      : hour < 17
        ? `Good afternoon, ${firstName}.`
        : `Good evening, ${firstName}.`;

  return {
    greeting,
    message,
    focus: input.homeIntelligence.dailyFocus,
    nudge: input.routineNudge,
    adaptedFrom: [...new Set(adaptedFrom)],
  };
}
