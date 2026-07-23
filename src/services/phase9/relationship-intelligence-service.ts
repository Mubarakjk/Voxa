import { CompanionIntelligenceBundle } from '../../types/companion-intelligence';
import { RelationshipIntelligenceSnapshot, RelationshipTrend } from '../../types/phase9-intelligence';

export function buildRelationshipIntelligence(input: {
  bundle: CompanionIntelligenceBundle;
  moodHistory: Array<{ label: string; date: string }>;
  streakDays: number;
  daysAway: number;
}): RelationshipIntelligenceSnapshot {
  const sources: string[] = [];
  let trend: RelationshipTrend = 'stable';

  const recentMoods = input.moodHistory.slice(0, 7).map((m) => m.label.toLowerCase());
  const stressCount = recentMoods.filter((m) => /stress|anxious|overwhelm|tired|low|hard/.test(m)).length;
  const positiveCount = recentMoods.filter((m) => /good|great|happy|motivated|calm|energ/.test(m)).length;

  if (stressCount >= 4) {
    trend = 'burnout_risk';
    sources.push(`${stressCount}/7 heavy moods`);
  } else if (stressCount >= 2) {
    trend = 'stressed';
    sources.push('recent stress pattern');
  } else if (positiveCount >= 4) {
    trend = 'excited';
    sources.push('positive mood streak');
  } else if (input.streakDays >= 7) {
    trend = 'motivated';
    sources.push(`${input.streakDays}d streak`);
  } else if (input.daysAway >= 5) {
    trend = 'stable';
    sources.push('return after break');
  }

  const labels: Record<RelationshipTrend, { label: string; detail: string }> = {
    stable: { label: 'Steady', detail: 'Things feel balanced lately.' },
    stressed: { label: 'Under pressure', detail: 'You have had a heavy few days — I am here.' },
    burnout_risk: { label: 'Watch the pace', detail: 'A lot on your plate — rest counts too.' },
    excited: { label: 'Riding momentum', detail: 'Good energy lately — let us use it well.' },
    motivated: { label: 'Showing up', detail: 'Consistency is building something real.' },
    frustrated: { label: 'Friction', detail: 'Something has been sticking — worth naming.' },
    low_confidence: { label: 'Quiet doubt', detail: 'You do not have to carry this alone.' },
    success: { label: 'Winning', detail: 'Real progress showing up in your life.' },
  };

  const copy = labels[trend];
  return { trend, label: copy.label, detail: copy.detail, dataPoints: sources };
}

export function relationshipIntelPromptBlock(snap: RelationshipIntelligenceSnapshot): string {
  if (snap.trend === 'stable') return '';
  return `Relationship signal: ${snap.label} — ${snap.detail} Adjust tone accordingly. Never guilt the user.`;
}
