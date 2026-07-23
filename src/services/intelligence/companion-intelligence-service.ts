import {
  CompanionIntelligenceBundle,
  HomeIntelligenceSnapshot,
  ProactiveDecision,
  UnifiedCompanionContext,
} from '../../types/companion-intelligence';
import { VoxaRepositories } from '../contracts';
import { IStorageService } from '../contracts/storage-service';
import { MemoryIntelligenceService } from '../memory/memory-intelligence-service';
import { CompanionModeId, Message, UserProfile } from '../../types';
import { getUpcomingReminders } from '../../utils/reminders';
import { companionProfileEngine } from './companion-profile-engine';
import { CompanionIntelligenceStore, createCompanionIntelligenceStore } from './companion-intelligence-store';
import { contextEngine } from './context-engine';
import { conversationQualityEngine } from './conversation-quality-engine';
import { homeIntelligenceEngine } from './home-intelligence-engine';
import { lifeTimelineEngine } from './life-timeline-engine';
import { proactiveDecisionEngine } from './proactive-decision-engine';
import { relationshipEngine } from './relationship-engine';
import { relationshipPersonalityService } from '../personality/relationship-personality-service';
import { adaptiveIntelligenceService } from './adaptive-intelligence-service';
import { emotionalAwarenessEngine } from './emotional-awareness-engine';
import { modeInferenceEngine } from './mode-inference-engine';
import { sportsIntelligenceEngine } from './sports-intelligence-engine';
import { memoryAgingEngine } from '../personality/memory-aging-engine';
import { nowIso } from '../../types';
import { MoodHistoryEntry } from '../check-in/daily-check-in-service';

export type AfterConversationInput = {
  userId: string;
  userProfile: UserProfile;
  userMessage: string;
  voxaReply: string;
  mode: CompanionModeId;
};

export class CompanionIntelligenceService {
  private readonly store: CompanionIntelligenceStore;

  constructor(
    private readonly repositories: VoxaRepositories,
    storage: IStorageService,
    private readonly memoryEngine: MemoryIntelligenceService,
  ) {
    this.store = createCompanionIntelligenceStore(storage);
  }

  async getBundle(userId: string, displayName: string): Promise<CompanionIntelligenceBundle> {
    return this.store.load(userId, displayName);
  }

  async buildContext(input: {
    userId: string;
    userProfile: UserProfile;
    mode: CompanionModeId;
    conversationId: string;
    userMessage: string;
    moodHistory?: MoodHistoryEntry[];
    online?: boolean;
  }): Promise<UnifiedCompanionContext> {
    const bundle = await this.getBundle(input.userId, input.userProfile.displayName);

    const [memories, goals, reminders, conversations, messages] = await Promise.all([
      this.repositories.memories.listMemories(input.userId),
      this.repositories.goals.listActiveGoals(input.userId),
      this.repositories.reminders.listReminders(input.userId),
      this.repositories.conversations.listConversations(input.userId),
      this.repositories.messages.listMessages(input.conversationId),
    ]);

    const { signals, plan, graphPrompt } = await adaptiveIntelligenceService.planResponse({
      userMessage: input.userMessage,
      bundle,
      memories,
      goals,
      moodHistory: input.moodHistory ?? [],
      online: input.online,
    });

    const effectiveMode = plan.companionMode;

    const topMemories = await this.memoryEngine.retrieveForPrompt(input.userId, {
      userMessage: input.userMessage,
      mode: effectiveMode,
      recentMessageTexts: messages.slice(-6).map((m) => m.content),
      memoryLevel: input.userProfile.preferences.companionControls?.memoryLevel ?? 'balanced',
    });

    const base = contextEngine.build({
      userProfile: input.userProfile,
      bundle,
      mode: effectiveMode,
      topMemories,
      activeGoals: goals,
      upcomingReminders: getUpcomingReminders(reminders, 5),
      recentMessages: messages,
      recentConversations: conversations.slice(0, 5),
    });

    const adaptiveExtension = adaptiveIntelligenceService.toPromptExtension(plan, graphPrompt);

    return {
      ...base,
      mode: effectiveMode,
      adaptivePlan: plan,
      adaptiveModeLabel: plan.modeLabel,
      principlesBlock: `${base.principlesBlock}\n\n${adaptiveExtension}`,
    };
  }

  async afterConversation(input: AfterConversationInput): Promise<CompanionIntelligenceBundle> {
    const bundle = await this.getBundle(input.userId, input.userProfile.displayName);

    const [memories, goals, reminders, conversations, messages, voiceSessions] = await Promise.all([
      this.repositories.memories.listMemories(input.userId),
      this.repositories.goals.listGoals(input.userId),
      this.repositories.reminders.listReminders(input.userId),
      this.repositories.conversations.listConversations(input.userId),
      this.repositories.conversations.listConversations(input.userId).then(async (convs) => {
        const recent = convs[0];
        if (!recent) return [] as Message[];
        return this.repositories.messages.listMessages(recent.id);
      }),
      this.repositories.voiceSessions.listSessions(input.userId),
    ]);

    const updatedProfile = companionProfileEngine.update({
      profile: input.userProfile,
      intelligence: bundle.profile,
      memories,
      goals,
      reminders,
      userMessage: input.userMessage,
      voxaReply: input.voxaReply,
      mode: input.mode,
    });

    const birthdayRemembered = detectBirthdayRemembered(input.voxaReply, memories);

    const updatedRelationship = relationshipEngine.update({
      relationship: bundle.relationship,
      profile: input.userProfile,
      intelligence: updatedProfile,
      conversations,
      messages,
      memories,
      goals,
      voiceSessions,
      userMessage: input.userMessage,
      birthdayRemembered,
    });

    const updatedQuality = conversationQualityEngine.recordExchange(
      bundle.conversationQuality,
      input.userMessage,
      input.voxaReply,
    );

    let timeline = lifeTimelineEngine.rebuild({
      userId: input.userId,
      bundle: {
        ...bundle,
        profile: updatedProfile,
        relationship: updatedRelationship,
        conversationQuality: updatedQuality,
      },
      goals,
      memories,
      conversations,
      messages,
    });
    timeline = lifeTimelineEngine.appendFromExchange(
      timeline,
      input.userId,
      input.userMessage,
      input.voxaReply,
    );

    const personalityBundle = relationshipPersonalityService.afterConversation({
      bundle: {
        profile: updatedProfile,
        relationship: updatedRelationship,
        conversationQuality: updatedQuality,
        lifeTimeline: timeline,
        personality: bundle.personality,
        insideJokes: bundle.insideJokes,
        conversationStyle: bundle.conversationStyle,
        weeklyReflections: bundle.weeklyReflections,
        adaptive: bundle.adaptive,
      },
      userProfile: input.userProfile,
      userMessage: input.userMessage,
      voxaReply: input.voxaReply,
      mode: input.mode,
      goals,
      messages,
      birthdayRemembered,
    });

    const signals = modeInferenceEngine.inferSignals(input.userMessage, personalityBundle);
    const modeLabel = modeInferenceEngine.inferModeLabel(signals, personalityBundle);
    const sportsPrefs = sportsIntelligenceEngine.extractPreferences(memories, personalityBundle.adaptive.sportsPreferences);
    const emotional = emotionalAwarenessEngine.analyze({
      profile: updatedProfile,
      moodHistory: [],
      baseline: personalityBundle.adaptive.emotionalBaseline,
      userMessage: input.userMessage,
    });

    let adaptive = {
      ...personalityBundle.adaptive,
      lastModeLabel: modeLabel,
      lastSignals: signals,
      sportsPreferences: sportsPrefs,
      emotionalBaseline: emotional.baseline,
      updatedAt: nowIso(),
    };
    if (emotional.checkInOffer) {
      adaptive = {
        ...adaptive,
        emotionalBaseline: emotionalAwarenessEngine.recordCheckInOffered(adaptive.emotionalBaseline),
      };
    }

    const fadeCandidates = memoryAgingEngine.fadeTrivial(memories);
    for (const candidate of fadeCandidates.slice(0, 2)) {
      await this.repositories.memories
        .updateMemory(candidate.memory.id, {
          importance: candidate.suggestedImportance as 1 | 2 | 3 | 4 | 5,
        })
        .catch(() => undefined);
    }

    const next: CompanionIntelligenceBundle = { ...personalityBundle, adaptive };

    await this.store.save(input.userId, next);
    return next;
  }

  async generateHomeIntelligence(userId: string, profile: UserProfile): Promise<HomeIntelligenceSnapshot> {
    const bundle = await this.getBundle(userId, profile.displayName);
    const [memories, goals, reminders, conversations] = await Promise.all([
      this.repositories.memories.listMemories(userId),
      this.repositories.goals.listActiveGoals(userId),
      this.repositories.reminders.listReminders(userId),
      this.repositories.conversations.listConversations(userId),
    ]);

    const lastMessageAt = conversations[0]?.lastMessageAt;
    const decision = this.evaluateProactive(profile, bundle, goals, reminders, lastMessageAt);

    return homeIntelligenceEngine.generate({
      profile,
      bundle,
      memories,
      goals,
      upcomingReminders: getUpcomingReminders(reminders, 5),
      proactiveMessage: decision.shouldReachOut ? decision.suggestedMessage : null,
    });
  }

  evaluateProactive(
    profile: UserProfile,
    bundle: CompanionIntelligenceBundle,
    goals: import('../../types').Goal[],
    reminders: import('../../types').Reminder[],
    lastMessageAt?: string,
  ): ProactiveDecision {
    return proactiveDecisionEngine.evaluate({
      profile,
      bundle,
      goals,
      reminders,
      lastMessageAt,
    });
  }

  getPromptExtension(context: UnifiedCompanionContext): string {
    return contextEngine.toPromptExtension(context);
  }
}

export function createCompanionIntelligenceService(
  repositories: VoxaRepositories,
  storage: IStorageService,
  memoryEngine: MemoryIntelligenceService,
) {
  return new CompanionIntelligenceService(repositories, storage, memoryEngine);
}

function detectBirthdayRemembered(voxaReply: string, memories: import('../../types').Memory[]) {
  const lower = voxaReply.toLowerCase();
  const mentionsBirthday = /birthday|happy birthday|born on/.test(lower);
  const hasBirthdayMemory = memories.some(
    (m) => m.category === 'birthdays' || /birthday/.test(`${m.title} ${m.content}`.toLowerCase()),
  );
  return mentionsBirthday && hasBirthdayMemory;
}
