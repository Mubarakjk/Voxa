import { getCompanionMode } from '../constants/companion-modes';
import { VOXA_SAFETY } from '../constants/safety';
import {
  CompanionModeId,
  Conversation,
  ConversationChannel,
  CreateGoalInput,
  CreateReminderInput,
  DailyBriefing,
  Goal,
  Memory,
  MemorySource,
  Message,
  MessageAttachment,
  PendingAttachmentInput,
  Reminder,
  attachmentDisplayLabel,
  toChatMessageView,
  TrustedContact,
  UserProfile,
  VoiceSession,
  nowIso,
} from '../types';
import { GenerateReplyResult, VoxaRepositories } from './contracts';
import { IAIService } from './contracts';
import { buildDailyBriefing } from '../utils/daily-briefing';
import { buildVoxaCheckInConfirmation, getUpcomingReminders } from '../utils/reminders';
import { actionIntentParser } from './actions/action-intent-parser';
import { ChatActionExecutor } from './actions/chat-action-executor';
import { CompanionIntelligenceService } from './intelligence/companion-intelligence-service';
import { HomeIntelligenceSnapshot } from '../types/companion-intelligence';
import { parseMusicIntent } from './music/music-recognition-service';
import { createAttachmentProcessor } from './attachments/attachment-processor';
import { attachmentStorageService } from './attachments/attachment-storage-service';
import { FeatureGateService } from './billing/feature-gate-service';
import { FeatureLimitError, SubscriptionService } from './billing/subscription-service';
import { UsageTrackingService } from './billing/usage-tracking-service';
import { GateResult } from '../types/subscription';
import { buildWowExperience, WowExperienceData } from './wow/wow-experience-service';
import { getRoutineCoachService } from './routine/routine-coach-service';
import { routineProactiveService } from './proactive/routine-proactive-service';
import { TodayRoutineSummary } from '../types/routine';
import { IStorageService } from './contracts';

export type CompanionBillingDeps = {
  subscription: SubscriptionService;
  featureGate: FeatureGateService;
  usageTracking: UsageTrackingService;
};

export type SendChatMessageInput = {
  userId: string;
  conversationId: string;
  content: string;
  mode: CompanionModeId;
  attachments?: PendingAttachmentInput[];
};

export type SendChatMessageOptions = {
  onStreamChunk?: (chunk: string) => void;
};

export type SendChatMessageResult = {
  userMessage: Message;
  voxaMessage: Message;
  aiMeta?: GenerateReplyResult;
  executedAction?: import('../types').AssistantActionId;
  sideEffect?: import('./actions/chat-action-executor').ChatSideEffect;
};

export type HomeDashboardData = {
  profile: UserProfile;
  memories: Memory[];
  reminders: Reminder[];
  upcomingReminders: Reminder[];
  activeGoals: Goal[];
  dailyBriefing: DailyBriefing;
  recentConversation: Conversation | null;
  recentMessages: Message[];
  insights: Array<{ id: string; label: string; value: string; detail: string }>;
  companionPrompt: string;
  companionNote: string;
  homeIntelligence: HomeIntelligenceSnapshot;
  relationshipSummary: string;
  wowExperience: WowExperienceData;
  routineSummary: TodayRoutineSummary;
  routineMessage: string | null;
};

export type CreateReminderResult = {
  reminder: Reminder;
  confirmationMessage: string;
};

export type SessionStartResult = {
  conversation: Conversation;
  openingMessage: Message;
  voiceSession: VoiceSession;
};

export type CreateGoalResult = {
  goal: Goal;
  linkedReminder?: Reminder;
};

/**
 * High-level companion orchestration for chat-like flows.
 * UI screens can call this instead of wiring repositories + AI directly.
 */
export class VoxaCompanionService {
  private readonly chatActions: ChatActionExecutor;
  private readonly billing?: CompanionBillingDeps;
  private readonly storage?: IStorageService;

  constructor(
    private readonly repositories: VoxaRepositories,
    private readonly ai: IAIService,
    private readonly memoryEngine: import('./memory/memory-intelligence-service').MemoryIntelligenceService,
    private readonly companionIntelligence: CompanionIntelligenceService,
    billing?: CompanionBillingDeps,
    storage?: IStorageService,
  ) {
    this.billing = billing;
    this.storage = storage;
    this.chatActions = new ChatActionExecutor(this.repositories, actionIntentParser, {
      switchCompanionMode: (userId, mode) => this.switchCompanionMode(userId, mode),
      startVoiceSession: (userId, mode) => this.startVoiceSession(userId, mode),
      startSafeCallSession: (userId) => this.startSafeCallSession(userId),
      storage,
    });
  }

  private async assertGate(gate: GateResult) {
    if (!gate.allowed) {
      throw new FeatureLimitError(
        gate.reason ?? 'Upgrade to Voxa Pro to continue.',
        gate.feature,
        Boolean(gate.limitReached),
      );
    }
  }

  private async getBillingContext(userId: string, profile: UserProfile) {
    if (!this.billing) return null;
    const planStatus = await this.billing.subscription.buildPlanStatus(userId, profile.subscription);
    const usage = await this.billing.usageTracking.getUsage(userId);
    return { planStatus, usage };
  }

  async getPlanStatusForUser(userId: string) {
    if (!this.billing) return null;
    const profile = await this.repositories.userProfile.getProfile();
    if (!profile) return null;
    return this.billing.subscription.buildPlanStatus(userId, profile.subscription);
  }

  async getOrCreateProfile(displayName: string): Promise<UserProfile> {
    const existing = await this.repositories.userProfile.getProfile();
    if (existing) return existing;
    return this.repositories.userProfile.createProfile({ displayName });
  }

  async getProfile(): Promise<UserProfile | null> {
    return this.repositories.userProfile.getProfile();
  }

  async getOrCreateConversation(
    userId: string,
    mode: CompanionModeId,
    channel: ConversationChannel,
    title?: string,
  ): Promise<Conversation> {
    const conversations = await this.repositories.conversations.listConversations(userId);
    const existing = conversations.find(
      (item) => item.mode === mode && item.channel === channel && item.status === 'active',
    );
    if (existing) return existing;

    return this.repositories.conversations.createConversation({
      userId,
      mode,
      channel,
      title,
    });
  }

  async getHomeDashboard(userId: string): Promise<HomeDashboardData> {
    const profile = await this.repositories.userProfile.getProfile();
    if (!profile) throw new Error('User profile not found');

    const [memories, reminders, conversations, activeGoals, voiceSessions] = await Promise.all([
      this.repositories.memories.listMemories(userId),
      this.repositories.reminders.listReminders(userId),
      this.repositories.conversations.listConversations(userId),
      this.repositories.goals.listActiveGoals(userId),
      this.repositories.voiceSessions.listSessions(userId),
    ]);

    const upcomingReminders = getUpcomingReminders(reminders, 5);
    const homeIntelligence = await this.companionIntelligence.generateHomeIntelligence(userId, profile);
    const bundle = await this.companionIntelligence.getBundle(userId, profile.displayName);

    const dailyBriefing = buildDailyBriefing({
      profile,
      memories,
      reminders,
      activeGoals,
    });
    dailyBriefing.greeting = homeIntelligence.personalGreeting;
    dailyBriefing.personalMessage = homeIntelligence.dailyFocus;
    dailyBriefing.suggestedAction = homeIntelligence.suggestedConversation;
    const upcomingReminder = upcomingReminders[0];
    const recentConversation = conversations[0] ?? null;
    const recentMessages = recentConversation
      ? await this.repositories.messages.listMessages(recentConversation.id)
      : [];
    const latestMemory = memories[0];
    const voiceConversation = conversations.find((item) => item.channel === 'voice');

    const insights = [
      {
        id: 'mood',
        label: 'Mood today',
        value: capitalize(latestMemory?.mood ?? 'Calm'),
        detail: latestMemory ? `Based on ${latestMemory.title}` : 'Check in with Voxa',
      },
      {
        id: 'call',
        label: 'Last call',
        value: voiceConversation?.lastMessageAt ? 'Recent' : '—',
        detail: voiceConversation?.lastMessageAt
          ? `Voice · ${formatRelativeTime(voiceConversation.lastMessageAt)}`
          : 'No calls yet',
      },
      {
        id: 'goals',
        label: 'Active goals',
        value: String(activeGoals.length),
        detail: activeGoals[0]?.title ?? 'Create a goal with Voxa',
      },
      {
        id: 'memories',
        label: 'Memories',
        value: String(memories.length),
        detail: upcomingReminder
          ? `Next: ${upcomingReminder.title}`
          : `${memories.length} saved locally`,
      },
    ];

    const wowExperience = buildWowExperience({
      profile,
      bundle,
      homeIntelligence,
      memories,
      goals: activeGoals,
      reminders,
      recentConversation,
      recentMessages,
      insights,
      voiceSessions,
    });

    const routineSummary = this.storage
      ? await getRoutineCoachService(this.storage, this.repositories).getTodaySchedule(userId)
      : {
          blocks: [],
          completedCount: 0,
          totalCount: 0,
          completionPercent: 0,
          nextBlock: null,
          streakDays: 0,
        };

    const routineMessages = routineProactiveService.generateMessages(profile, routineSummary);
    const routineMessage = routineMessages[0]?.message ?? null;

    return {
      profile,
      memories,
      reminders,
      upcomingReminders,
      activeGoals,
      dailyBriefing,
      recentConversation,
      recentMessages,
      insights,
      companionPrompt: homeIntelligence.relationshipMessage.startsWith('"')
        ? homeIntelligence.relationshipMessage
        : `"${homeIntelligence.relationshipMessage}"`,
      companionNote: homeIntelligence.memoryHighlight ?? homeIntelligence.progressUpdate,
      homeIntelligence,
      relationshipSummary: bundle.relationship.summary,
      wowExperience,
      routineSummary,
      routineMessage,
    };
  }

  async loadChatMessages(conversationId: string) {
    const messages = await this.repositories.messages.listMessages(conversationId);
    return messages
      .filter((item) => item.role !== 'system')
      .map((item) => toChatMessageView(item));
  }

  async switchCompanionMode(userId: string, mode: CompanionModeId) {
    const profile = await this.repositories.userProfile.getProfile();
    if (!profile) throw new Error('User profile not found');

    await this.repositories.userProfile.updateProfile({
      companion: { ...profile.companion, lastUsedMode: mode },
    });

    const conversation = await this.getOrCreateConversation(userId, mode, 'chat');
    const existingMessages = await this.repositories.messages.listMessages(conversation.id);

    if (existingMessages.length === 0) {
      const modeConfig = getCompanionMode(mode);
      await this.repositories.messages.createMessage({
        conversationId: conversation.id,
        role: 'voxa',
        content: modeConfig.openingMessage,
        mode,
      });
      await this.repositories.conversations.updateConversation(conversation.id, {
        lastMessageAt: nowIso(),
      });
    }

    return {
      mode: getCompanionMode(mode),
      conversation,
    };
  }

  async listMemories(userId: string) {
    return this.repositories.memories.listMemories(userId);
  }

  async deleteMemory(memoryId: string) {
    await this.repositories.memories.deleteMemory(memoryId);
  }

  async clearAllMemories(userId: string) {
    await this.repositories.memories.clearMemoriesForUser(userId);
  }

  async listTrustedContacts(userId: string): Promise<TrustedContact[]> {
    return this.repositories.trustedContacts.listContacts(userId);
  }

  async createGoal(input: CreateGoalInput, options?: { linkCheckIn?: boolean }): Promise<CreateGoalResult> {
    const profile = await this.repositories.userProfile.getProfile();
    if (profile && this.billing) {
      const ctx = await this.getBillingContext(input.userId, profile);
      if (ctx) await this.assertGate(this.billing.featureGate.canCreateGoal(ctx.planStatus, ctx.usage));
    }

    let goal = await this.repositories.goals.createGoal(input);
    let linkedReminder: Reminder | undefined;

    if (options?.linkCheckIn) {
      const scheduledAt = new Date();
      scheduledAt.setDate(scheduledAt.getDate() + 1);
      scheduledAt.setHours(9, 0, 0, 0);

      linkedReminder = await this.repositories.reminders.createReminder({
        userId: input.userId,
        kind: 'daily_goal',
        title: `Check-in: ${goal.title}`,
        body: goal.description,
        scheduledAt: scheduledAt.toISOString(),
        recurrence: 'daily',
        mode: 'coach',
        goalId: goal.id,
      });

      goal = await this.repositories.goals.updateGoal(goal.id, {
        linkedReminderId: linkedReminder.id,
      });
    }

    return { goal, linkedReminder };
  }

  async listActiveGoals(userId: string) {
    return this.repositories.goals.listActiveGoals(userId);
  }

  async activateVoiceSession(sessionId: string): Promise<VoiceSession> {
    return this.repositories.voiceSessions.updateSession(sessionId, {
      state: 'active',
      startedAt: nowIso(),
    });
  }

  async endVoiceSession(sessionId: string, durationSeconds: number): Promise<VoiceSession> {
    const session = await this.repositories.voiceSessions.getSession(sessionId);
    const ended = await this.repositories.voiceSessions.updateSession(sessionId, {
      state: 'ended',
      endedAt: nowIso(),
      durationSeconds,
    });

    if (session && this.billing && durationSeconds > 0) {
      const minutes = Math.max(1, Math.ceil(durationSeconds / 60));
      await this.billing.usageTracking.recordVoiceMinute(session.userId, minutes);
      await this.billing.subscription.refreshUsageCounts(session.userId, this.repositories);
    }

    return ended;
  }

  async getActiveVoiceSession(userId: string) {
    return this.repositories.voiceSessions.getActiveSession(userId);
  }

  async sendChatMessage(
    input: SendChatMessageInput,
    options?: SendChatMessageOptions,
  ): Promise<SendChatMessageResult> {
    const profile = await this.repositories.userProfile.getProfile();
    if (!profile) throw new Error('User profile required before sending messages.');

    const hasAttachments = Boolean(input.attachments?.length);
    if (!input.content.trim() && !hasAttachments) {
      throw new Error('Message cannot be empty.');
    }

    const billingCtx = await this.getBillingContext(input.userId, profile);
    if (billingCtx && this.billing) {
      if (hasAttachments) {
        for (const attachment of input.attachments!) {
          if (attachment.type === 'image') {
            await this.assertGate(this.billing.featureGate.canUploadImage(billingCtx.planStatus, billingCtx.usage));
          }
          if (attachment.type === 'video') {
            await this.assertGate(this.billing.featureGate.canUploadVideo(billingCtx.planStatus, billingCtx.usage));
          }
          if (attachment.type === 'audio') {
            await this.assertGate(this.billing.featureGate.canUseVoiceNote(billingCtx.planStatus, billingCtx.usage));
          }
          if (attachment.type === 'file') {
            await this.assertGate(this.billing.featureGate.canUploadDocument(billingCtx.planStatus, billingCtx.usage));
          }
        }
      }
      await this.assertGate(this.billing.featureGate.canUseAiChat(billingCtx.planStatus, billingCtx.usage));
    }

    let effectiveUserText = input.content.trim();
    let attachments: MessageAttachment[] | undefined;
    let mediaSource: MemorySource = 'text';
    let imageUrlForVision: string | undefined;
    let imageAnalysisSummary: string | undefined;

    if (hasAttachments) {
      const processor = createAttachmentProcessor(this.ai);
      const processed = await processor.processPending(input.attachments!, input.content);
      attachments = processed.attachments;
      effectiveUserText = processed.effectiveUserText;
      mediaSource = processed.mediaSource;
      imageUrlForVision = processed.imageUrlForVision;
      imageAnalysisSummary = processed.imageAnalysisSummary;
    }

    const displayContent =
      input.content.trim() ||
      (attachments?.length ? attachmentDisplayLabel(attachments[0]) : '');

    let userMessage = await this.repositories.messages.createMessage({
      conversationId: input.conversationId,
      role: 'user',
      content: displayContent,
      mode: input.mode,
      attachments,
    });

    if (attachments?.length) {
      const processor = createAttachmentProcessor(this.ai);
      const uploaded = await processor.uploadAll({
        userId: input.userId,
        conversationId: input.conversationId,
        messageId: userMessage.id,
        attachments,
      });
      userMessage = await this.repositories.messages.updateMessage(userMessage.id, { attachments: uploaded });
    }

    if (!hasAttachments && parseMusicIntent(input.content)) {
      const voxaMessage = await this.repositories.messages.createMessage({
        conversationId: input.conversationId,
        role: 'voxa',
        content:
          "Open Music in Settings to identify songs, or ask me about an artist once you've recognised a track.",
        mode: input.mode,
      });
      await this.repositories.conversations.updateConversation(input.conversationId, {
        lastMessageAt: voxaMessage.createdAt,
      });
      return { userMessage, voxaMessage };
    }

    const [activeGoalsForParse, remindersForParse] = await Promise.all([
      this.repositories.goals.listActiveGoals(input.userId),
      this.repositories.reminders.listReminders(input.userId),
    ]);
    const upcomingForParse = getUpcomingReminders(remindersForParse, 5);

    const parsedIntent = await this.chatActions.parseMessage(effectiveUserText, {
      ai: this.ai,
      userProfile: profile,
      mode: input.mode,
      activeGoals: activeGoalsForParse,
      upcomingReminders: upcomingForParse,
    });
    if (parsedIntent) {
      const actionResult = await this.chatActions.execute(parsedIntent, {
        userId: input.userId,
        mode: input.mode,
        conversationId: input.conversationId,
      });

      const replyConversationId =
        actionResult.sideEffect?.type === 'switch_mode'
          ? actionResult.sideEffect.conversationId
          : input.conversationId;

      const replyMode =
        actionResult.sideEffect?.type === 'switch_mode'
          ? actionResult.sideEffect.mode
          : input.mode;

      const voxaMessage = await this.repositories.messages.createMessage({
        conversationId: replyConversationId,
        role: 'voxa',
        content: actionResult.confirmationMessage,
        mode: replyMode,
        metadata: { executedAction: parsedIntent.action },
      });

      await this.repositories.conversations.updateConversation(replyConversationId, {
        lastMessageAt: voxaMessage.createdAt,
      });

      if (parsedIntent.action === 'switch_mode') {
        await this.repositories.userProfile.updateProfile({
          companion: { ...profile.companion, lastUsedMode: replyMode },
        });
      }

      await this.companionIntelligence.afterConversation({
        userId: input.userId,
        userProfile: profile,
        userMessage: effectiveUserText,
        voxaReply: voxaMessage.content,
        mode: replyMode,
      });

      return {
        userMessage,
        voxaMessage,
        executedAction: parsedIntent.action,
        sideEffect: actionResult.sideEffect,
      };
    }

    const history = await this.repositories.messages.listMessages(input.conversationId);
    const recentMessageTexts = history
      .filter((item) => item.role !== 'system')
      .slice(-6)
      .map((item) => item.content);

    const memories = profile.preferences.memoryEnabled
      ? await this.memoryEngine.retrieveForPrompt(input.userId, {
          userMessage: effectiveUserText,
          mode: input.mode,
          recentMessageTexts,
        })
      : [];

    const [activeGoals, allReminders] = await Promise.all([
      this.repositories.goals.listActiveGoals(input.userId),
      this.repositories.reminders.listReminders(input.userId),
    ]);
    const upcomingReminders = getUpcomingReminders(allReminders, 5);

    const unifiedContext = await this.companionIntelligence.buildContext({
      userId: input.userId,
      userProfile: profile,
      mode: input.mode,
      conversationId: input.conversationId,
      userMessage: effectiveUserText,
    });
    const companionContextExtension = this.companionIntelligence.getPromptExtension(unifiedContext);

    const aiInput = {
      mode: input.mode,
      userMessage: effectiveUserText,
      conversationHistory: history,
      userProfile: profile,
      memories,
      goals: activeGoals,
      upcomingReminders,
      currentTime: unifiedContext.currentTime,
      companionContextExtension,
      imageUrlForVision,
      imageAnalysisSummary,
    };

    let aiResult: GenerateReplyResult;
    if (options?.onStreamChunk && isStreamCapableAI(this.ai)) {
      aiResult = await this.ai.generateReplyStream(aiInput, options.onStreamChunk);
    } else {
      aiResult = await this.ai.generateReply(aiInput);
      if (options?.onStreamChunk) {
        await simulateStream(aiResult.content, options.onStreamChunk);
      }
    }

    const voxaMessage = await this.repositories.messages.createMessage({
      conversationId: input.conversationId,
      role: 'voxa',
      content: aiResult.content,
      mode: input.mode,
    });

    await this.repositories.conversations.updateConversation(input.conversationId, {
      lastMessageAt: voxaMessage.createdAt,
    });

    await this.repositories.userProfile.updateProfile({
      companion: { ...profile.companion, lastUsedMode: input.mode },
    });

    await this.memoryEngine.processAfterReply({
      userId: input.userId,
      userMessage: effectiveUserText,
      voxaReply: voxaMessage.content,
      mode: input.mode,
      userProfile: profile,
      mediaSource: hasAttachments ? mediaSource : undefined,
    }).catch((err) => console.warn('[Voxa] Background memory extraction failed.', err));

    void this.companionIntelligence.afterConversation({
      userId: input.userId,
      userProfile: profile,
      userMessage: effectiveUserText,
      voxaReply: voxaMessage.content,
      mode: input.mode,
    }).catch((err) => console.warn('[Voxa] Background personality update failed.', err));

    await this.maybeSummarizeConversation({
      conversationId: input.conversationId,
      profile,
      mode: input.mode,
      messages: [...history, userMessage, voxaMessage],
      activeGoals,
      upcomingReminders,
    });

    if (this.billing) {
      await this.billing.usageTracking.recordAiMessage(input.userId);
      if (hasAttachments) {
        for (const attachment of input.attachments!) {
          if (attachment.type === 'image') await this.billing.usageTracking.recordImageUpload(input.userId);
          if (attachment.type === 'video') await this.billing.usageTracking.recordVideoUpload(input.userId);
          if (attachment.type === 'audio') await this.billing.usageTracking.recordVoiceNote(input.userId);
          if (attachment.type === 'file') await this.billing.usageTracking.recordDocument(input.userId);
        }
      }
      await this.billing.subscription.refreshUsageCounts(input.userId, this.repositories);
    }

    return { userMessage, voxaMessage, aiMeta: aiResult };
  }

  async retryMessageAttachmentUpload(input: {
    userId: string;
    conversationId: string;
    messageId: string;
    attachmentId: string;
  }): Promise<Message> {
    const messages = await this.repositories.messages.listMessages(input.conversationId);
    const message = messages.find((item) => item.id === input.messageId);
    if (!message?.attachments?.length) {
      throw new Error('Message not found.');
    }

    const attachment = message.attachments.find((item) => item.id === input.attachmentId);
    if (!attachment) {
      throw new Error('Attachment not found.');
    }

    const uploaded = await attachmentStorageService.uploadAttachment({
      userId: input.userId,
      conversationId: input.conversationId,
      messageId: input.messageId,
      attachment: { ...attachment, uploadStatus: 'uploading' },
    });

    const nextAttachments = message.attachments.map((item) =>
      item.id === attachment.id ? uploaded : item,
    );
    return this.repositories.messages.updateMessage(message.id, { attachments: nextAttachments });
  }

  async deleteReminder(reminderId: string): Promise<void> {
    const reminder = await this.repositories.reminders.getReminder(reminderId);
    if (reminder?.notificationId) {
      await import('./notifications/notification-service').then(({ notificationService }) =>
        notificationService.cancelNotification(reminder.notificationId!),
      );
    }
    await this.repositories.reminders.deleteReminder(reminderId);
  }

  private async maybeSummarizeConversation(input: {
    conversationId: string;
    profile: UserProfile;
    mode: CompanionModeId;
    messages: Message[];
    activeGoals: Goal[];
    upcomingReminders: Reminder[];
  }) {
    const nonSystem = input.messages.filter((item) => item.role !== 'system');
    if (nonSystem.length < 8 || nonSystem.length % 8 !== 0) return;

    try {
      const summary = await this.ai.summarizeConversation({
        userProfile: input.profile,
        mode: input.mode,
        messages: input.messages,
        goals: input.activeGoals,
        upcomingReminders: input.upcomingReminders,
        currentTime: new Date().toISOString(),
      });
      await this.repositories.conversations.updateConversation(input.conversationId, { summary });
    } catch (error) {
      console.warn('[Voxa] Conversation summary skipped.', error);
    }
  }

  async startVoiceSession(userId: string, mode: CompanionModeId = 'friend'): Promise<SessionStartResult> {
    const profile = await this.repositories.userProfile.getProfile();
    if (!profile) throw new Error('User profile not found');

    const billingCtx = await this.getBillingContext(userId, profile);
    if (billingCtx && this.billing) {
      await this.assertGate(this.billing.featureGate.canUseVoice(billingCtx.planStatus, billingCtx.usage));
    }

    const conversation = await this.getOrCreateConversation(userId, mode, 'voice', 'Voice call');
    const voiceSession = await this.repositories.voiceSessions.createSession({
      userId,
      conversationId: conversation.id,
      mode,
      isSafeCall: false,
    });

    const history = await this.repositories.messages.listMessages(conversation.id);
    const modeConfig = getCompanionMode(mode);
    const memories = profile.preferences.memoryEnabled
      ? await this.memoryEngine.retrieveForPrompt(userId, {
          userMessage: 'Starting a voice call with Voxa.',
          mode,
          recentMessageTexts: history.map((item) => item.content),
        })
      : [];

    let openingContent = modeConfig.openingMessage;
    try {
      const aiResult = await this.ai.generateReply({
        mode,
        userMessage: 'Starting a voice call with Voxa.',
        conversationHistory: history,
        userProfile: profile,
        memories,
      });
      openingContent = aiResult.content;
    } catch {
      openingContent = modeConfig.openingMessage;
    }

    const openingMessage = await this.repositories.messages.createMessage({
      conversationId: conversation.id,
      role: 'voxa',
      content: openingContent,
      mode,
      metadata: { channel: 'voice' },
    });

    const activeSession = await this.repositories.voiceSessions.updateSession(voiceSession.id, {
      state: 'active',
      startedAt: nowIso(),
      transcriptMessageIds: [openingMessage.id],
    });

    await this.repositories.conversations.updateConversation(conversation.id, {
      lastMessageAt: openingMessage.createdAt,
    });

    await this.memoryEngine.processAfterReply({
      userId,
      userMessage: 'Starting a voice call with Voxa.',
      voxaReply: openingMessage.content,
      mode,
      userProfile: profile,
    });

    return { conversation, openingMessage, voiceSession: activeSession };
  }

  async startSafeCallSession(userId: string): Promise<SessionStartResult> {
    const profile = await this.repositories.userProfile.getProfile();
    if (!profile) throw new Error('User profile not found');

    const billingCtx = await this.getBillingContext(userId, profile);
    if (billingCtx && this.billing) {
      await this.assertGate(this.billing.featureGate.canUseVoice(billingCtx.planStatus, billingCtx.usage));
    }

    const conversation = await this.repositories.conversations.createConversation({
      userId,
      mode: 'safe_call',
      channel: 'safe_call',
      title: 'Safe Call session',
    });

    const voiceSession = await this.repositories.voiceSessions.createSession({
      userId,
      conversationId: conversation.id,
      mode: 'safe_call',
      isSafeCall: true,
      checkInIntervalMinutes: 30,
    });

    const modeConfig = getCompanionMode('safe_call');
    const memories = profile.preferences.memoryEnabled
      ? await this.memoryEngine.retrieveForPrompt(userId, {
          userMessage: 'I need to start a safe call.',
          mode: 'safe_call',
        })
      : [];

    let openingContent = `${modeConfig.openingMessage} ${VOXA_SAFETY.notEmergency}`;
    try {
      const aiResult = await this.ai.generateReply({
        mode: 'safe_call',
        userMessage: 'I need to start a safe call.',
        conversationHistory: [],
        userProfile: profile,
        memories,
      });
      openingContent = `${aiResult.content} ${VOXA_SAFETY.notEmergency}`;
    } catch {
      openingContent = `${modeConfig.openingMessage} ${VOXA_SAFETY.notEmergency}`;
    }

    const openingMessage = await this.repositories.messages.createMessage({
      conversationId: conversation.id,
      role: 'voxa',
      content: openingContent,
      mode: 'safe_call',
      metadata: { channel: 'safe_call', isSafeCall: true },
    });

    const activeSession = await this.repositories.voiceSessions.updateSession(voiceSession.id, {
      state: 'active',
      startedAt: nowIso(),
      transcriptMessageIds: [openingMessage.id],
    });

    await this.repositories.conversations.updateConversation(conversation.id, {
      lastMessageAt: openingMessage.createdAt,
    });

    await this.memoryEngine.processAfterReply({
      userId,
      userMessage: 'I need to start a safe call.',
      voxaReply: openingMessage.content,
      mode: 'safe_call',
      userProfile: profile,
    });

    return { conversation, openingMessage, voiceSession: activeSession };
  }

  async createScheduledReminder(input: CreateReminderInput): Promise<CreateReminderResult> {
    const profile = await this.repositories.userProfile.getProfile();
    if (profile && this.billing) {
      const ctx = await this.getBillingContext(input.userId, profile);
      if (ctx) await this.assertGate(this.billing.featureGate.canCreateReminder(ctx.planStatus, ctx.usage));
    }

    const reminder = await this.repositories.reminders.createReminder(input);

    try {
      const { notificationService } = await import('./notifications/notification-service');
      const notificationId = await notificationService.scheduleReminderFromEntity(reminder);
      await this.repositories.reminders.updateReminder(reminder.id, { notificationId });
    } catch (error) {
      console.warn('[Voxa] Failed to schedule notification for reminder.', error);
    }

    return {
      reminder,
      confirmationMessage: buildVoxaCheckInConfirmation(reminder),
    };
  }

  async refreshUsageCounts(userId: string) {
    if (!this.billing) return;
    await this.billing.subscription.refreshUsageCounts(userId, this.repositories);
  }

  async listUpcomingReminders(userId: string, limit = 5): Promise<Reminder[]> {
    const reminders = await this.repositories.reminders.listReminders(userId);
    return getUpcomingReminders(reminders, limit);
  }
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

type StreamCapableAI = IAIService & {
  generateReplyStream: (
    input: import('./contracts').GenerateReplyInput,
    onChunk: (chunk: string) => void,
  ) => Promise<GenerateReplyResult>;
};

function isStreamCapableAI(ai: IAIService): ai is StreamCapableAI {
  return typeof (ai as StreamCapableAI).generateReplyStream === 'function';
}

async function simulateStream(content: string, onChunk: (chunk: string) => void) {
  const tokens = content.split(/(\s+)/);
  for (const token of tokens) {
    onChunk(token);
    await new Promise((resolve) => setTimeout(resolve, 18));
  }
}

function formatRelativeTime(isoDate: string) {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'Yesterday' : `${days} days ago`;
}
