import { CompanionIntelligenceBundle } from '../../types/companion-intelligence';
import { RelationshipGrowthSnapshot } from '../../types/phase4-intelligence';

export class RelationshipGrowthService {
  build(bundle: CompanionIntelligenceBundle): RelationshipGrowthSnapshot {
    const rel = bundle.relationship;
    const daysTogether = Math.max(
      1,
      Math.floor((Date.now() - new Date(rel.relationshipStartedAt).getTime()) / 86400000),
    );

    let evolutionLine: string | null = null;
    if (daysTogether >= 180) evolutionLine = "I've watched you become much more confident.";
    else if (rel.conversationCount >= 30) evolutionLine = 'Our conversations keep getting deeper.';
    else if (rel.sharedMemoryCount >= 10) evolutionLine = 'I know you better than most apps ever will.';

    let anniversaryLine: string | null = null;
    if (daysTogether >= 365) anniversaryLine = "We've known each other for over a year.";
    else if (daysTogether >= 180) anniversaryLine = "We've known each other for six months.";
    else if (daysTogether >= 30) anniversaryLine = 'One month together — still early, already meaningful.';

    const firstInterview = rel.milestones.find((m) => /interview|study|goal/i.test(m.label));
    const memoryCallback = firstInterview
      ? `I still remember ${firstInterview.label.toLowerCase()}.`
      : rel.milestones[0]
        ? `I still remember ${rel.milestones[0].label.toLowerCase()}.`
        : null;

    if (memoryCallback && !evolutionLine) evolutionLine = memoryCallback;

    return {
      daysTogether,
      sharedMemories: rel.sharedMemoryCount,
      milestones: rel.milestones.slice(-6).map((m) => ({ id: m.id, label: m.label })),
      insideJokes: bundle.insideJokes.slice(0, 4).map((j) => j.label),
      evolutionLine,
      anniversaryLine,
      supportMoments: bundle.profile.moodTrend.filter((m) => /stress|sad|low/i.test(m.mood)).length,
    };
  }
}

export const relationshipGrowthService = new RelationshipGrowthService();
