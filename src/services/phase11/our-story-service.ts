import { CompanionIntelligenceBundle } from '../../types/companion-intelligence';
import { Goal, Memory } from '../../types';
import { OurStoryEntry } from '../../types/phase11-living-companion';
import { buildSharedMemoriesTimeline } from '../phase8/shared-memories-timeline-service';

export function buildOurStory(input: {
  bundle: CompanionIntelligenceBundle;
  memories: Memory[];
  goals: Goal[];
  challengeStreak?: number;
  firstChallengeDone?: boolean;
}): OurStoryEntry[] {
  const base = buildSharedMemoriesTimeline({
    bundle: input.bundle,
    memories: input.memories,
    goals: input.goals,
    limit: 20,
  }).map((e) => ({ ...e, milestone: false }));

  const rel = input.bundle.relationship;
  const milestones: OurStoryEntry[] = [];

  milestones.push({
    id: 'story-first',
    title: 'First conversation',
    narrative: 'Where it all started.',
    occurredAt: rel.relationshipStartedAt,
    kind: 'milestone',
    milestone: true,
  });

  if (rel.conversationCount >= 100) {
    milestones.push({
      id: 'story-100-chats',
      title: '100 chats together',
      narrative: 'A hundred conversations — and counting.',
      occurredAt: rel.updatedAt,
      kind: 'conversation',
      milestone: true,
    });
  }

  const firstGoal = input.goals.find((g) => g.status === 'completed');
  if (firstGoal) {
    milestones.push({
      id: `story-goal-${firstGoal.id}`,
      title: 'First goal achieved',
      narrative: `"${firstGoal.title}" — done.`,
      occurredAt: firstGoal.updatedAt ?? firstGoal.createdAt,
      kind: 'goal',
      milestone: true,
    });
  }

  if (input.firstChallengeDone) {
    milestones.push({
      id: 'story-first-challenge',
      title: 'First daily challenge',
      narrative: 'You showed up for yourself.',
      occurredAt: new Date().toISOString(),
      kind: 'milestone',
      milestone: true,
    });
  }

  return [...milestones, ...base]
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, 16);
}
