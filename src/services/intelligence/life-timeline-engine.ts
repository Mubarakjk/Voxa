import {
  CompanionIntelligenceBundle,
  LifeTimelineEvent,
  LifeTimelineEventKind,
} from '../../types/companion-intelligence';
import { Conversation, Goal, Memory, Message, nowIso } from '../../types';
import { stableTimelineId } from './life-timeline-service';

export class LifeTimelineEngine {
  rebuild(input: {
    userId: string;
    bundle: CompanionIntelligenceBundle;
    goals: Goal[];
    memories: Memory[];
    conversations: Conversation[];
    messages: Message[];
  }): LifeTimelineEvent[] {
    const events: LifeTimelineEvent[] = [];

    for (const goal of input.goals) {
      events.push(this.event(input.userId, 'goal', goal.title, goal.description, goal.createdAt, {
        relatedGoalCategory: goal.category,
        progress: goal.progress,
        status: goal.status,
      }));
      if (goal.status === 'completed' || goal.progress >= 100) {
        events.push(
          this.event(input.userId, 'achievement', `Completed: ${goal.title}`, undefined, goal.updatedAt, {
            relatedGoalCategory: goal.category,
          }),
        );
      }
    }

    for (const memory of input.memories) {
      const kind = this.memoryKind(memory.category);
      events.push(
        this.event(input.userId, kind, memory.title, memory.content, memory.occurredAt ?? memory.createdAt, {
          relatedMemoryCategory: memory.category,
        }),
      );
    }

    for (const conversation of input.conversations) {
      if (conversation.summary) {
        events.push(
          this.event(
            input.userId,
            'conversation',
            conversation.title ?? `${conversation.mode} chat`,
            conversation.summary,
            conversation.lastMessageAt ?? conversation.createdAt,
            { mode: conversation.mode },
          ),
        );
      }
    }

    for (const milestone of input.bundle.relationship.milestones) {
      events.push(
        this.event(input.userId, 'relationship', milestone.label, undefined, milestone.achievedAt, {
          milestoneId: milestone.id,
        }),
      );
    }

    for (const achievement of input.bundle.profile.recentAchievements) {
      events.push(this.event(input.userId, 'achievement', achievement, undefined, nowIso()));
    }

    return dedupeByTitle(events)
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
      .slice(0, 100);
  }

  appendFromExchange(
    timeline: LifeTimelineEvent[],
    userId: string,
    userMessage: string,
    voxaReply: string,
  ): LifeTimelineEvent[] {
    const lower = userMessage.toLowerCase();
    let next = [...timeline];

    if (/got the job|new job|started at|promoted/.test(lower)) {
      next.unshift(this.event(userId, 'work', 'Career update', userMessage.slice(0, 200), nowIso()));
    }
    if (/trip to|traveling to|vacation in|visited/.test(lower)) {
      next.unshift(this.event(userId, 'trip', 'Trip mentioned', userMessage.slice(0, 200), nowIso()));
    }
    if (/passed|exam|graduated|finished the course/.test(lower)) {
      next.unshift(this.event(userId, 'study', 'Study milestone', userMessage.slice(0, 200), nowIso()));
    }
    if (/pr|personal best|ran |workout|gym/.test(lower)) {
      next.unshift(this.event(userId, 'fitness', 'Fitness milestone', userMessage.slice(0, 200), nowIso()));
    }
    if (/birthday/.test(lower)) {
      next.unshift(this.event(userId, 'birthday', 'Birthday mentioned', userMessage.slice(0, 200), nowIso()));
    }

    if (voxaReply.length > 120 && /remember this|big moment|milestone/.test(voxaReply.toLowerCase())) {
      next.unshift(
        this.event(userId, 'conversation', 'Memorable moment with Voxa', voxaReply.slice(0, 160), nowIso()),
      );
    }

    return next.slice(0, 100);
  }

  private event(
    userId: string,
    kind: LifeTimelineEventKind,
    title: string,
    description: string | undefined,
    occurredAt: string,
    metadata?: Record<string, unknown>,
  ): LifeTimelineEvent {
    return {
      id: stableTimelineId(kind, title, occurredAt),
      userId,
      kind,
      title,
      description,
      occurredAt,
      metadata,
    };
  }

  private memoryKind(category: import('../../types').Memory['category']): LifeTimelineEventKind {
    if (category === 'birthdays') return 'birthday';
    if (category === 'study') return 'study';
    if (category === 'fitness') return 'fitness';
    if (category === 'work' || category === 'business') return 'work';
    if (category === 'future_plans') return 'trip';
    return 'memory';
  }
}

function dedupeByTitle(events: LifeTimelineEvent[]) {
  const seen = new Set<string>();
  return events.filter((e) => {
    const key = `${e.kind}:${e.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export const lifeTimelineEngine = new LifeTimelineEngine();
