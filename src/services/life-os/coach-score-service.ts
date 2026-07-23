import { Goal, Memory } from '../../types';
import { CoachScoreDomain, CoachScoreEntry, CoachScoreSnapshot } from '../../types/phase5-life-os';
import { nowIso } from '../../types/common';

const DOMAINS: CoachScoreDomain[] = [
  'consistency',
  'health_habits',
  'learning',
  'career_business',
  'routines',
  'reflection',
  'goal_momentum',
];

export function computeCoachScore(input: {
  userId: string;
  goals: Goal[];
  memories: Memory[];
  dreamCount: number;
  bucketCompleted: number;
  routinePercent?: number;
  journalCount?: number;
}): CoachScoreSnapshot {
  const activeGoals = input.goals.filter((g) => g.status === 'active');
  const completedGoals = input.goals.filter((g) => g.status === 'completed');
  const fitnessGoals = input.goals.filter((g) => g.category === 'fitness');
  const studyGoals = input.goals.filter((g) => g.category === 'study');
  const businessGoals = input.goals.filter((g) => g.category === 'business' || g.category === 'money');
  const recentMemories = input.memories.filter((m) => {
    const days = (Date.now() - new Date(m.createdAt).getTime()) / 86400000;
    return days <= 14;
  });

  const scores: CoachScoreEntry[] = DOMAINS.map((domain) => {
    switch (domain) {
      case 'consistency':
        return scoreDomain(domain, recentMemories.length >= 3, recentMemories.length, [
          `${recentMemories.length} memories in last 14 days`,
        ], recentMemories.length >= 3 ? 'Check in with Voxa tomorrow' : 'Save one moment from today');
      case 'health_habits':
        return scoreDomain(domain, fitnessGoals.length > 0, fitnessGoals.length * 20 + (fitnessGoals[0]?.progress ?? 0) / 2, [
          `${fitnessGoals.length} fitness goals`,
        ], fitnessGoals.length > 0 ? 'Complete one health habit today' : 'Add a small fitness goal');
      case 'learning':
        return scoreDomain(domain, studyGoals.length > 0, studyGoals.length * 25 + (studyGoals[0]?.progress ?? 0) / 3, [
          `${studyGoals.length} study goals`,
        ], 'Spend 15 minutes learning something new');
      case 'career_business':
        return scoreDomain(domain, businessGoals.length > 0, businessGoals.length * 30, [
          `${businessGoals.length} career/business goals`,
        ], 'Take one career action this week');
      case 'routines':
        return scoreDomain(domain, (input.routinePercent ?? 0) > 0, input.routinePercent ?? 0, [
          input.routinePercent ? `${input.routinePercent}% routine completion` : 'No routine data',
        ], 'Complete one routine block today');
      case 'reflection':
        return scoreDomain(domain, input.dreamCount > 0 || (input.journalCount ?? 0) > 0, Math.min(100, input.dreamCount * 15 + (input.journalCount ?? 0) * 10), [
          `${input.dreamCount} dreams logged`,
        ], 'Write one reflective sentence');
      case 'goal_momentum':
        return scoreDomain(domain, activeGoals.length > 0, Math.min(100, activeGoals.length * 15 + completedGoals.length * 20), [
          `${activeGoals.length} active, ${completedGoals.length} completed goals`,
        ], activeGoals[0] ? `Next step for: ${activeGoals[0].title}` : 'Create one meaningful goal');
      default:
        return emptyDomain(domain);
    }
  });

  return { userId: input.userId, scores, computedAt: nowIso() };
}

function scoreDomain(
  domain: CoachScoreDomain,
  hasData: boolean,
  rawValue: number,
  dataUsed: string[],
  improveAction: string,
): CoachScoreEntry {
  if (!hasData) {
    return {
      domain,
      value: 0,
      trend: 'steady',
      whyChanged: 'Not enough data yet.',
      dataUsed: [],
      confidence: 'insufficient',
      improveAction,
      hidden: false,
    };
  }
  const value = Math.max(0, Math.min(100, Math.round(rawValue)));
  return {
    domain,
    value,
    trend: value >= 50 ? 'up' : 'steady',
    whyChanged: value >= 50 ? 'Recent activity supports this score.' : 'Building momentum — keep going.',
    dataUsed,
    confidence: dataUsed.length >= 2 ? 'medium' : 'low',
    improveAction,
    hidden: false,
  };
}

function emptyDomain(domain: CoachScoreDomain): CoachScoreEntry {
  return {
    domain,
    value: 0,
    trend: 'steady',
    whyChanged: 'Not enough data yet.',
    dataUsed: [],
    confidence: 'insufficient',
    hidden: false,
  };
}
