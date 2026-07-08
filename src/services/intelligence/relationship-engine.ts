import {
  CompanionIntelligenceProfile,
  RelationshipMilestone,
  RelationshipProfile,
} from '../../types/companion-intelligence';
import { Conversation, Goal, Memory, Message, UserProfile, VoiceSession, nowIso } from '../../types';

export type RelationshipUpdateInput = {
  relationship: RelationshipProfile;
  profile: UserProfile;
  intelligence: CompanionIntelligenceProfile;
  conversations: Conversation[];
  messages: Message[];
  memories: Memory[];
  goals: Goal[];
  voiceSessions: VoiceSession[];
  userMessage?: string;
  birthdayRemembered?: boolean;
};

export class RelationshipEngine {
  update(input: RelationshipUpdateInput): RelationshipProfile {
    const hour = new Date().getHours();
    const preferredHours = uniqueNumbers([
      hour,
      ...input.relationship.preferredConversationHours,
    ]).slice(0, 8);

    const conversationCount = Math.max(
      input.relationship.conversationCount,
      input.conversations.length,
    );
    const voiceCallCount = Math.max(
      input.relationship.voiceCallCount,
      input.voiceSessions.filter((s) => s.state === 'ended' || s.state === 'active').length,
    );
    const sharedMemoryCount = input.memories.length;
    const goalsAchieved = input.goals.filter((g) => g.status === 'completed' || g.progress >= 100).length;

    const milestones = this.computeMilestones(input.relationship.milestones, {
      conversationCount,
      voiceCallCount,
      sharedMemoryCount,
      goalsAchieved,
      startedAt: input.relationship.relationshipStartedAt,
      birthdayRemembered: input.birthdayRemembered ?? false,
    });

    const favouriteTopics = uniqueStrings([
      ...input.intelligence.favouriteTopics,
      ...input.intelligence.interests,
      ...input.relationship.favouriteTopics,
    ]).slice(0, 10);

    const summary = this.buildSummary({
      displayName: input.profile.displayName,
      relationshipStartedAt: input.relationship.relationshipStartedAt,
      conversationCount,
      voiceCallCount,
      sharedMemoryCount,
      goalsAchieved,
      milestones,
      favouriteTopics,
      mood: input.intelligence.moodTrend[0]?.mood,
    });

    return {
      ...input.relationship,
      updatedAt: nowIso(),
      conversationCount,
      voiceCallCount,
      sharedMemoryCount,
      goalsAchievedTogether: goalsAchieved,
      milestones,
      favouriteTopics,
      preferredConversationHours: preferredHours,
      summary,
    };
  }

  private computeMilestones(
    existing: RelationshipMilestone[],
    stats: {
      conversationCount: number;
      voiceCallCount: number;
      sharedMemoryCount: number;
      goalsAchieved: number;
      startedAt: string;
      birthdayRemembered: boolean;
    },
  ): RelationshipMilestone[] {
    const milestones = [...existing];
    const add = (id: string, label: string) => {
      if (!milestones.some((m) => m.id === id)) {
        milestones.push({ id, label, achievedAt: nowIso() });
      }
    };

    add('first_chat', 'First conversation together');
    if (stats.conversationCount >= 10) add('ten_chats', '10 conversations together');
    if (stats.conversationCount >= 50) add('fifty_chats', '50 conversations — a real bond');
    if (stats.conversationCount >= 100) add('hundred_chats', '100 conversations — years of trust');
    if (stats.voiceCallCount >= 1) add('first_voice', 'First voice call');
    if (stats.sharedMemoryCount >= 5) add('five_memories', '5 shared memories');
    if (stats.sharedMemoryCount >= 25) add('twentyfive_memories', '25 memories — Voxa really knows you');
    if (stats.goalsAchieved >= 1) add('first_goal', 'First goal achieved together');
    if (stats.birthdayRemembered) add('first_birthday', 'First birthday remembered');

    const ageDays = Math.floor(
      (Date.now() - new Date(stats.startedAt).getTime()) / (1000 * 60 * 60 * 24),
    );
    if (ageDays >= 7) add('one_week', 'One week together');
    if (ageDays >= 30) add('one_month', 'One month together');
    if (ageDays >= 365) add('one_year', 'One year together');

    return milestones.slice(0, 20);
  }

  private buildSummary(input: {
    displayName: string;
    relationshipStartedAt: string;
    conversationCount: number;
    voiceCallCount: number;
    sharedMemoryCount: number;
    goalsAchieved: number;
    milestones: RelationshipMilestone[];
    favouriteTopics: string[];
    mood?: string;
  }): string {
    const days = Math.max(
      1,
      Math.floor((Date.now() - new Date(input.relationshipStartedAt).getTime()) / (1000 * 60 * 60 * 24)),
    );
    const topicHint =
      input.favouriteTopics.length > 0
        ? `You often talk about ${input.favouriteTopics.slice(0, 2).join(' and ')}.`
        : 'Voxa is still learning what you love to talk about.';
    const moodHint = input.mood ? `Lately you've felt ${input.mood}.` : '';

    return [
      `${input.displayName} and Voxa have shared ${input.conversationCount} conversations over ${days} days.`,
      `${input.sharedMemoryCount} memories, ${input.voiceCallCount} voice calls, ${input.goalsAchieved} goals achieved together.`,
      topicHint,
      moodHint,
    ]
      .filter(Boolean)
      .join(' ');
  }
}

function uniqueNumbers(values: number[]) {
  return [...new Set(values)];
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

export const relationshipEngine = new RelationshipEngine();
