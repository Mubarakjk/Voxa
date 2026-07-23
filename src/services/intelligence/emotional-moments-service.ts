import { CompanionIntelligenceBundle } from '../../types/companion-intelligence';
import { Goal, Memory, Reminder, UserProfile } from '../../types';
import { EmotionalMomentSnapshot } from '../../types/phase2-intelligence';
import { relationshipMomentsEngine } from '../wow/relationship-moments-engine';
import { getMissedDayMessage } from '../ritual/ritual-service';

export type BuildEmotionalMomentsInput = {
  profile: UserProfile;
  bundle: CompanionIntelligenceBundle;
  goals: Goal[];
  memories: Memory[];
  reminders: Reminder[];
  daysAway?: number;
  ritualStreak?: number;
  now?: Date;
};

export function buildEmotionalMoments(input: BuildEmotionalMomentsInput): EmotionalMomentSnapshot[] {
  const moments: EmotionalMomentSnapshot[] = [];
  const now = input.now ?? new Date();

  const relationshipMoments = relationshipMomentsEngine.generateAll({
    profile: input.profile,
    bundle: input.bundle,
    goals: input.goals,
    memories: input.memories,
    reminders: input.reminders,
    now,
  });

  for (const moment of relationshipMoments) {
    moments.push({
      id: moment.id,
      title: moment.kind.replace('_', ' '),
      message: moment.message,
      kind:
        moment.kind === 'goal_complete' || moment.kind === 'streak'
          ? 'celebration'
          : moment.kind === 'birthday' || moment.kind === 'anniversary'
            ? 'anniversary'
            : moment.kind === 'memory_recall'
              ? 'callback'
              : moment.kind === 'encouragement'
                ? 'support'
                : 'milestone',
      priority: moment.priority,
    });
  }

  const daysAway = input.daysAway ?? 0;
  const missed = getMissedDayMessage(daysAway);
  if (missed) {
    moments.push({
      id: `return-${daysAway}`,
      title: 'Welcome back',
      message: missed,
      kind: 'support',
      priority: 70,
    });
  }

  if ((input.ritualStreak ?? 0) >= 7) {
    moments.push({
      id: `ritual-${input.ritualStreak}`,
      title: 'Consistency',
      message: `${input.ritualStreak} days of showing up for yourself. That builds trust.`,
      kind: 'celebration',
      priority: 60,
    });
  }

  const proudMemory = input.memories.find((m) =>
    /proud|achieved|completed|milestone/.test(`${m.title} ${m.content}`.toLowerCase()),
  );
  if (proudMemory) {
    moments.push({
      id: `callback-${proudMemory.id}`,
      title: 'I remember',
      message: `You once told me about "${proudMemory.title}". Still proud of you for that.`,
      kind: 'callback',
      priority: 55,
    });
  }

  return moments.sort((a, b) => b.priority - a.priority).slice(0, 5);
}
