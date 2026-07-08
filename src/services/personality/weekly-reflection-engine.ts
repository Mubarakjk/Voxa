import {
  CompanionIntelligenceBundle,
  RelationshipMilestone,
} from '../../types/companion-intelligence';
import { WeeklyReflection } from '../../types/relationship-personality';
import { Goal, Message, UserProfile, createId, nowIso } from '../../types';

export class WeeklyReflectionEngine {
  shouldGenerate(reflections: WeeklyReflection[]): boolean {
    if (reflections.length === 0) return true;
    const latest = reflections[0];
    const daysSince =
      (Date.now() - new Date(latest.generatedAt).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince >= 7;
  }

  generate(input: {
    profile: UserProfile;
    bundle: CompanionIntelligenceBundle;
    goals: Goal[];
    messages: Message[];
  }): WeeklyReflection {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const ip = input.bundle.profile;
    const rel = input.bundle.relationship;
    const achieved = input.goals.filter((g) => g.status === 'completed' || g.progress >= 100);

    const userMessages = input.messages.filter((m) => m.role === 'user').slice(-20);
    const favouriteConversation =
      userMessages.sort((a, b) => b.content.length - a.content.length)[0]?.content.slice(0, 160) ??
      undefined;

    return {
      id: createId('reflection'),
      weekStarting: weekStart.toISOString(),
      generatedAt: nowIso(),
      wins: ip.recentAchievements.slice(0, 5),
      challenges: ip.currentChallenges.slice(0, 4),
      progress: this.buildProgressLine(input.goals),
      relationshipGrowth: rel.summary,
      goalsAchieved: achieved.map((g) => g.title),
      favouriteConversation,
      suggestionsForNextWeek: this.buildSuggestions(input.bundle, input.goals),
    };
  }

  latestSummaryHint(reflections: WeeklyReflection[]): string | undefined {
    const latest = reflections[0];
    if (!latest) return undefined;
    return `Last week: ${latest.wins[0] ?? latest.progress}. Focus: ${latest.suggestionsForNextWeek[0] ?? 'Keep showing up.'}`;
  }

  private buildProgressLine(goals: Goal[]) {
    const active = goals.filter((g) => g.status === 'active');
    if (active.length === 0) return 'No active goals tracked this week.';
    const avg = Math.round(active.reduce((sum, g) => sum + g.progress, 0) / active.length);
    return `Average goal progress: ${avg}%. Top focus: "${active[0].title}".`;
  }

  private buildSuggestions(bundle: CompanionIntelligenceBundle, goals: Goal[]) {
    const suggestions: string[] = [];
    const stale = goals.find((g) => g.status === 'active' && g.progress < 20);
    if (stale) suggestions.push(`Revisit "${stale.title}" with one tiny step.`);
    if (bundle.profile.currentChallenges[0]) {
      suggestions.push(`Make space for: ${bundle.profile.currentChallenges[0]}.`);
    }
    if (bundle.relationship.milestones.length > 0) {
      const latest = bundle.relationship.milestones[bundle.relationship.milestones.length - 1];
      suggestions.push(`Celebrate your milestone: ${latest.label}.`);
    }
    suggestions.push('Pick one conversation topic you have been avoiding.');
    return suggestions.slice(0, 4);
  }
}

export function formatMilestonesForTimeline(milestones: RelationshipMilestone[]) {
  return milestones.map((m) => ({
    id: m.id,
    title: m.label,
    occurredAt: m.achievedAt,
    kind: 'relationship' as const,
  }));
}

export const weeklyReflectionEngine = new WeeklyReflectionEngine();
