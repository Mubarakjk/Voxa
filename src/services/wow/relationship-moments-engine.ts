import { CompanionIntelligenceBundle } from '../../types/companion-intelligence';
import { Goal, Memory, Reminder, UserProfile } from '../../types';

export type RelationshipMoment = {
  id: string;
  message: string;
  kind:
    | 'birthday'
    | 'anniversary'
    | 'goal_complete'
    | 'goal_progress'
    | 'encouragement'
    | 'memory_recall'
    | 'streak'
    | 'check_in'
    | 'interview'
    | 'morning'
    | 'evening';
  priority: number;
};

export type RelationshipMomentsInput = {
  profile: UserProfile;
  bundle: CompanionIntelligenceBundle;
  goals: Goal[];
  memories: Memory[];
  reminders: Reminder[];
  now?: Date;
};

export class RelationshipMomentsEngine {
  generate(input: RelationshipMomentsInput): RelationshipMoment | null {
    const now = input.now ?? new Date();
    const moments = [
      ...this.checkBirthdays(input, now),
      ...this.checkAnniversaries(input, now),
      ...this.checkGoalMoments(input),
      ...this.checkMemoryRecall(input),
      ...this.checkEncouragement(input, now),
      ...this.checkInterviewReminders(input),
    ];

    if (moments.length === 0) return null;
    return moments.sort((a, b) => b.priority - a.priority)[0];
  }

  generateAll(input: RelationshipMomentsInput): RelationshipMoment[] {
    const now = input.now ?? new Date();
    return [
      ...this.checkBirthdays(input, now),
      ...this.checkAnniversaries(input, now),
      ...this.checkGoalMoments(input),
      ...this.checkMemoryRecall(input),
      ...this.checkEncouragement(input, now),
      ...this.checkInterviewReminders(input),
    ]
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 3);
  }

  private checkBirthdays(input: RelationshipMomentsInput, now: Date): RelationshipMoment[] {
    const today = now.toISOString().slice(5, 10);
    const matches = input.bundle.profile.importantDates.filter(
      (d) => d.category === 'birthday' && d.date?.slice(5, 10) === today,
    );
    return matches.map((d) => ({
      id: `birthday-${d.label}`,
      message: `Happy birthday${d.label ? ` — ${d.label}` : ''}. I'm really glad you're here today.`,
      kind: 'birthday' as const,
      priority: 100,
    }));
  }

  private checkAnniversaries(input: RelationshipMomentsInput, now: Date): RelationshipMoment[] {
    const today = now.toISOString().slice(5, 10);
    const relStart = input.bundle.relationship.relationshipStartedAt.slice(0, 10);
    const daysTogether = Math.floor(
      (now.getTime() - new Date(relStart).getTime()) / (1000 * 60 * 60 * 24),
    );

    const moments: RelationshipMoment[] = [];
    if (daysTogether > 0 && daysTogether % 30 === 0) {
      moments.push({
        id: `anniversary-${daysTogether}`,
        message: `We've been talking for ${daysTogether} days now. That means something.`,
        kind: 'anniversary',
        priority: 85,
      });
    }

    const anniversaries = input.bundle.profile.importantDates.filter(
      (d) => d.category === 'anniversary' && d.date?.slice(5, 10) === today,
    );
    anniversaries.forEach((d) => {
      moments.push({
        id: `anniversary-${d.label}`,
        message: `Today marks ${d.label}. I remembered.`,
        kind: 'anniversary',
        priority: 95,
      });
    });

    return moments;
  }

  private checkGoalMoments(input: RelationshipMomentsInput): RelationshipMoment[] {
    const moments: RelationshipMoment[] = [];
    const completed = input.goals.filter((g) => g.status === 'completed' || g.progress >= 100);
    if (completed[0]) {
      moments.push({
        id: `goal-done-${completed[0].id}`,
        message: `You completed "${completed[0].title}". That's worth celebrating.`,
        kind: 'goal_complete',
        priority: 80,
      });
    }

    const nearDone = input.goals.find((g) => g.status === 'active' && g.progress >= 75);
    if (nearDone) {
      moments.push({
        id: `goal-near-${nearDone.id}`,
        message: `"${nearDone.title}" is almost done — ${nearDone.progress}%. You're close.`,
        kind: 'goal_progress',
        priority: 55,
      });
    }

    return moments;
  }

  private checkMemoryRecall(input: RelationshipMomentsInput): RelationshipMoment[] {
    const memory = input.memories[0];
    if (!memory) return [];
    const ageDays = Math.floor(
      (Date.now() - new Date(memory.createdAt).getTime()) / (1000 * 60 * 60 * 24),
    );
    if (ageDays < 2) return [];
    return [
      {
        id: `memory-${memory.id}`,
        message: `I remembered what you told me about "${memory.title}". Want to revisit it?`,
        kind: 'memory_recall',
        priority: 45,
      },
    ];
  }

  private checkEncouragement(input: RelationshipMomentsInput, now: Date): RelationshipMoment[] {
    const hour = now.getHours();
    const name = input.profile.displayName.split(' ')[0];
    const moments: RelationshipMoment[] = [];

    if (hour < 10) {
      moments.push({
        id: 'morning-encourage',
        message: `Good morning, ${name}. Take today one step at a time.`,
        kind: 'morning',
        priority: 30,
      });
    }

    if (input.bundle.profile.currentChallenges[0]) {
      moments.push({
        id: 'working-hard',
        message: `You've been working hard on ${input.bundle.profile.currentChallenges[0]}. I'm proud of you.`,
        kind: 'encouragement',
        priority: 50,
      });
    }

    const streak = input.bundle.relationship.conversationCount;
    if (streak >= 7 && streak % 7 === 0) {
      moments.push({
        id: `streak-${streak}`,
        message: `${streak} conversations together. Our bond is growing.`,
        kind: 'streak',
        priority: 40,
      });
    }

    return moments;
  }

  private checkInterviewReminders(input: RelationshipMomentsInput): RelationshipMoment[] {
    const interview = input.reminders.find((r) =>
      /interview|meeting prep|presentation/i.test(r.title),
    );
    if (!interview) return [];
    const hoursUntil =
      (new Date(interview.scheduledAt).getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntil < 0 || hoursUntil > 48) return [];
    return [
      {
        id: `interview-${interview.id}`,
        message: `Good luck on "${interview.title}". You've got this — want to practice?`,
        kind: 'interview',
        priority: 90,
      },
    ];
  }
}

export const relationshipMomentsEngine = new RelationshipMomentsEngine();
