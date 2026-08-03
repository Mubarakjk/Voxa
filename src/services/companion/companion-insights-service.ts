import { Goal, Memory } from '../../types';
import { MEMORY_CATEGORY_LABELS } from '../../constants/memory-categories';
import { MoodHistoryEntry } from '../check-in/daily-check-in-service';
import { RelationshipGrowthSnapshot } from '../../types/relationship-growth';

export type CompanionInsightConfidence = 'high' | 'medium' | 'low';

export type CompanionInsight = {
  id: string;
  text: string;
  /** Short provenance shown to the user */
  evidence: string;
  confidence: CompanionInsightConfidence;
  kind: 'pattern' | 'progress' | 'consistency' | 'preference';
};

/**
 * Evidence-only companion observations.
 * Never invents facts — every line must cite stored data.
 */
export function buildCompanionInsights(input: {
  memories: Memory[];
  goals: Goal[];
  moodHistory: MoodHistoryEntry[];
  growth: RelationshipGrowthSnapshot | null;
  checkInsCompleted: number;
  routineStreakDays?: number;
}): CompanionInsight[] {
  const insights: CompanionInsight[] = [];
  const { memories, goals, moodHistory, growth, checkInsCompleted, routineStreakDays } = input;

  const completed = goals.filter((g) => g.status === 'completed');
  const active = goals.filter((g) => g.status === 'active');
  const codingGoals = goals.filter((g) =>
    /cod|dev|program|software|build/i.test(`${g.title} ${g.description ?? ''} ${g.category ?? ''}`),
  );
  if (codingGoals.length >= 2) {
    const done = codingGoals.filter((g) => g.status === 'completed').length;
    const pct = Math.round((done / codingGoals.length) * 100);
    if (done > 0) {
      insights.push({
        id: 'coding-goal-progress',
        text: `You've completed ${pct}% of your coding-related goals (${done} of ${codingGoals.length}).`,
        evidence: `${codingGoals.length} goals matching coding/dev themes`,
        confidence: codingGoals.length >= 3 ? 'high' : 'medium',
        kind: 'progress',
      });
    }
  }

  if (completed.length >= 3) {
    insights.push({
      id: 'goals-completed',
      text: `You've completed ${completed.length} goals together — consistency is showing.`,
      evidence: `${completed.length} goals with status completed`,
      confidence: 'high',
      kind: 'progress',
    });
  } else if (active.length >= 1) {
    insights.push({
      id: 'active-goals',
      text: `You're actively working on ${active.length} goal${active.length === 1 ? '' : 's'}.`,
      evidence: `${active.length} active goals`,
      confidence: 'high',
      kind: 'progress',
    });
  }

  const categoryCounts = new Map<string, number>();
  for (const memory of memories) {
    categoryCounts.set(memory.category, (categoryCounts.get(memory.category) ?? 0) + 1);
  }
  const topCategory = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topCategory && topCategory[1] >= 3) {
    const label = MEMORY_CATEGORY_LABELS[topCategory[0] as Memory['category']] ?? topCategory[0];
    insights.push({
      id: `category-${topCategory[0]}`,
      text: `You return often to ${label.toLowerCase()} — ${topCategory[1]} saved moments in that area.`,
      evidence: `${topCategory[1]} memories in category ${topCategory[0]}`,
      confidence: topCategory[1] >= 5 ? 'high' : 'medium',
      kind: 'preference',
    });
  }

  const planningSignals = memories.filter((m) =>
    /plan|planning|before I|prepare|prep/i.test(`${m.title} ${m.content}`),
  );
  if (planningSignals.length >= 2) {
    insights.push({
      id: 'planning-before-acting',
      text: 'You often talk about planning before acting.',
      evidence: `${planningSignals.length} memories mentioning planning/prep`,
      confidence: planningSignals.length >= 4 ? 'high' : 'medium',
      kind: 'pattern',
    });
  }

  const eveningMoods = moodHistory.filter((m) => {
    const hour = new Date(m.savedAt).getHours();
    return hour >= 17 || hour < 1;
  });
  const productiveTags = memories.filter((m) =>
    /productive|evening|night|after (work|lunch)|focus/i.test(`${m.title} ${m.content} ${m.tags.join(' ')}`),
  );
  if (productiveTags.length >= 2) {
    insights.push({
      id: 'evening-productivity',
      text: 'You mention productivity most around evenings or after focused blocks.',
      evidence: `${productiveTags.length} memories with productivity/evening cues`,
      confidence: 'medium',
      kind: 'pattern',
    });
  } else if (eveningMoods.length >= 4) {
    insights.push({
      id: 'evening-checkins',
      text: 'You check in most often in the evening.',
      evidence: `${eveningMoods.length} mood entries saved after 5pm`,
      confidence: 'medium',
      kind: 'pattern',
    });
  }

  const stressed = moodHistory.filter((m) => m.mood === 'stressed').length;
  const journalish = memories.filter((m) =>
    /journal|reflect|wrote|writing/i.test(`${m.title} ${m.content} ${m.tags.join(' ')}`),
  );
  if (stressed >= 2 && journalish.length >= 2) {
    insights.push({
      id: 'journal-after-stress',
      text: 'You tend to capture thoughts more after stressful days.',
      evidence: `${stressed} stressed moods · ${journalish.length} journal/reflect memories`,
      confidence: 'medium',
      kind: 'pattern',
    });
  }

  if (typeof routineStreakDays === 'number' && routineStreakDays >= 5) {
    insights.push({
      id: 'routine-streak',
      text: `You've become more consistent — a ${routineStreakDays}-day routine streak.`,
      evidence: `routine streakDays=${routineStreakDays}`,
      confidence: 'high',
      kind: 'consistency',
    });
  }

  if (checkInsCompleted >= 5) {
    insights.push({
      id: 'checkin-habit',
      text: `You've completed ${checkInsCompleted} check-ins — a real habit of showing up.`,
      evidence: `${checkInsCompleted} check-in entries`,
      confidence: 'high',
      kind: 'consistency',
    });
  }

  if (growth && growth.daysTogether >= 14) {
    insights.push({
      id: 'days-together',
      text: `${growth.daysTogether} days together · ${growth.metrics.conversationCount} conversations shared.`,
      evidence: `growth snapshot daysTogether=${growth.daysTogether}`,
      confidence: 'high',
      kind: 'consistency',
    });
  }

  return insights.slice(0, 8);
}
