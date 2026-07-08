import {
  CompanionIntelligenceBundle,
  HomeIntelligenceSnapshot,
  LifeTimelineEvent,
} from '../../types/companion-intelligence';
import { Conversation, Goal, Memory, Message, Reminder, UserProfile } from '../../types';
import { getDailyChallenge, getDailyQuote, getSurpriseMessage } from '../../constants/daily-quotes';
import { proactiveConversationService } from '../proactive/proactive-conversation-service';
import { FriendRelationshipProfile, buildFriendRelationshipProfile } from './friend-relationship-engine';
import { RelationshipMoment, relationshipMomentsEngine } from './relationship-moments-engine';
import { VoiceSession } from '../../types';

export type WowExperienceData = {
  dailyQuote: string;
  dailyChallenge: string;
  surpriseMessage: string | null;
  relationshipMoment: RelationshipMoment | null;
  relationshipMoments: RelationshipMoment[];
  moodLabel: string;
  moodDetail: string;
  streakDays: number;
  continueConversation: {
    conversationId: string;
    preview: string;
    lastAt: string;
  } | null;
  achievements: Array<{ id: string; title: string; subtitle: string; icon: string }>;
  weeklyRecap: string | null;
  monthlyRecap: string | null;
  lifeTimeline: LifeTimelineEvent[];
  voiceMemoryCount: number;
  progressPercent: number;
  heroMessage: string;
  proactiveMessage: string | null;
  relationshipScore: number;
  friendRecallLine: string | null;
  friendProfile: FriendRelationshipProfile;
};

export type BuildWowExperienceInput = {
  profile: UserProfile;
  bundle: CompanionIntelligenceBundle;
  homeIntelligence: HomeIntelligenceSnapshot;
  memories: Memory[];
  goals: Goal[];
  reminders: Reminder[];
  recentConversation: Conversation | null;
  recentMessages: Message[];
  insights: Array<{ id: string; label: string; value: string; detail: string }>;
  voiceSessions?: VoiceSession[];
  now?: Date;
};

export function buildWowExperience(input: BuildWowExperienceInput): WowExperienceData {
  const now = input.now ?? new Date();
  const dayKey = now.toISOString().slice(0, 10);
  const moodInsight = input.insights.find((i) => i.id === 'mood');

  const relationshipMoment = relationshipMomentsEngine.generate({
    profile: input.profile,
    bundle: input.bundle,
    goals: input.goals,
    memories: input.memories,
    reminders: input.reminders,
    now,
  });

  const relationshipMoments = relationshipMomentsEngine.generateAll({
    profile: input.profile,
    bundle: input.bundle,
    goals: input.goals,
    memories: input.memories,
    reminders: input.reminders,
    now,
  });

  const lastUserMessage = [...input.recentMessages].reverse().find((m) => m.role === 'user');
  const continueConversation =
    input.recentConversation && lastUserMessage
      ? {
          conversationId: input.recentConversation.id,
          preview: lastUserMessage.content.slice(0, 80),
          lastAt: lastUserMessage.createdAt,
        }
      : null;

  const relStart = new Date(input.bundle.relationship.relationshipStartedAt);
  const streakDays = Math.max(
    1,
    Math.floor((now.getTime() - relStart.getTime()) / (1000 * 60 * 60 * 24)),
  );

  const activeGoals = input.goals.filter((g) => g.status === 'active');
  const progressPercent =
    activeGoals.length > 0
      ? Math.round(activeGoals.reduce((sum, g) => sum + g.progress, 0) / activeGoals.length)
      : 0;

  const achievements = buildAchievements(input.bundle, input.goals, input.memories);

  const weeklyReflection = input.bundle.weeklyReflections[0];
  const weeklyRecap = weeklyReflection
    ? weeklyReflection.relationshipGrowth || weeklyReflection.progress
    : null;

  const monthlyRecap =
    input.bundle.relationship.conversationCount >= 30
      ? `${input.bundle.relationship.conversationCount} conversations, ${input.memories.length} memories, ${input.goals.filter((g) => g.progress >= 100).length} goals completed together.`
      : null;

  const voiceMemoryCount = input.recentMessages.filter((m) => m.metadata?.channel === 'voice').length;

  const friendProfile = buildFriendRelationshipProfile({
    profile: input.profile,
    bundle: input.bundle,
    memories: input.memories,
    goals: input.goals,
    voiceSessions: input.voiceSessions ?? [],
  });

  const proactive = proactiveConversationService.evaluate({
    profile: input.profile,
    bundle: input.bundle,
    goals: input.goals,
    reminders: input.reminders,
    lastConversationAt: input.recentConversation?.lastMessageAt,
    now,
  });

  const heroMessage =
    relationshipMoment?.message ??
    proactive?.message ??
    input.homeIntelligence.relationshipMessage ??
    "I'm really happy to see you.";

  return {
    dailyQuote: getDailyQuote(dayKey),
    dailyChallenge: getDailyChallenge(dayKey, input.profile.id),
    surpriseMessage: getSurpriseMessage(dayKey, input.profile.displayName.split(' ')[0]),
    relationshipMoment,
    relationshipMoments,
    moodLabel: moodInsight?.value ?? 'Calm',
    moodDetail: moodInsight?.detail ?? 'Check in with Voxa',
    streakDays,
    continueConversation,
    achievements,
    weeklyRecap,
    monthlyRecap,
    lifeTimeline: input.bundle.lifeTimeline.slice(0, 12),
    voiceMemoryCount,
    progressPercent,
    heroMessage,
    proactiveMessage: proactive?.message ?? null,
    relationshipScore: friendProfile.relationshipScore,
    friendRecallLine: friendProfile.naturalRecallLines[0] ?? null,
    friendProfile,
  };
}

function buildAchievements(
  bundle: CompanionIntelligenceBundle,
  goals: Goal[],
  memories: Memory[],
): WowExperienceData['achievements'] {
  const items: WowExperienceData['achievements'] = [];

  bundle.relationship.milestones.slice(0, 3).forEach((m) => {
    items.push({ id: m.id, title: m.label, subtitle: 'Milestone unlocked', icon: 'trophy-outline' });
  });

  if (goals.some((g) => g.progress >= 100)) {
    items.push({
      id: 'goal-master',
      title: 'Goal achiever',
      subtitle: 'Completed a goal with Voxa',
      icon: 'flag-outline',
    });
  }

  if (memories.length >= 10) {
    items.push({
      id: 'memory-keeper',
      title: 'Memory keeper',
      subtitle: `${memories.length} memories saved`,
      icon: 'sparkles-outline',
    });
  }

  if (bundle.relationship.conversationCount >= 50) {
    items.push({
      id: 'deep-bond',
      title: 'Deep bond',
      subtitle: '50+ conversations together',
      icon: 'heart-outline',
    });
  }

  if (bundle.insideJokes.length > 0) {
    items.push({
      id: 'inside-joke',
      title: 'Inside joke',
      subtitle: bundle.insideJokes[0].label.slice(0, 40),
      icon: 'happy-outline',
    });
  }

  return items.slice(0, 6);
}
