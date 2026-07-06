import {
  CompanionModeId,
  Conversation,
  ConversationChannel,
  CreateReminderInput,
  Memory,
  Message,
  Reminder,
  toChatMessageView,
  UserProfile,
} from '../types';
import { GenerateReplyResult, VoxaRepositories } from './contracts';
import { IAIService } from './contracts';
import { buildVoxaCheckInConfirmation, getUpcomingReminders } from '../utils/reminders';

export type SendChatMessageInput = {
  userId: string;
  conversationId: string;
  content: string;
  mode: CompanionModeId;
};

export type SendChatMessageResult = {
  userMessage: Message;
  voxaMessage: Message;
  aiMeta?: GenerateReplyResult;
};

export type HomeDashboardData = {
  profile: UserProfile;
  memories: Memory[];
  reminders: Reminder[];
  upcomingReminders: Reminder[];
  recentConversation: Conversation | null;
  recentMessages: Message[];
  insights: Array<{ id: string; label: string; value: string; detail: string }>;
  companionPrompt: string;
  companionNote: string;
};

export type CreateReminderResult = {
  reminder: Reminder;
  confirmationMessage: string;
};

export type SessionStartResult = {
  conversation: Conversation;
  openingMessage: Message;
};

/**
 * High-level companion orchestration for chat-like flows.
 * UI screens can call this instead of wiring repositories + AI directly.
 */
export class VoxaCompanionService {
  constructor(
    private readonly repositories: VoxaRepositories,
    private readonly ai: IAIService,
    private readonly memoryEngine: import('./memory/memory-intelligence-service').MemoryIntelligenceService,
  ) {}

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

    const [memories, reminders, conversations] = await Promise.all([
      this.repositories.memories.listMemories(userId),
      this.repositories.reminders.listReminders(userId),
      this.repositories.conversations.listConversations(userId),
    ]);

    const recentConversation = conversations[0] ?? null;
    const recentMessages = recentConversation
      ? await this.repositories.messages.listMessages(recentConversation.id)
      : [];

    const latestMemory = memories[0];
    const voiceConversation = conversations.find((item) => item.channel === 'voice');
    const upcomingReminders = getUpcomingReminders(reminders, 5);
    const upcomingReminder = upcomingReminders[0];
    const lastVoxaMessage = [...recentMessages].reverse().find((item) => item.role === 'voxa');

    return {
      profile,
      memories,
      reminders,
      upcomingReminders,
      recentConversation,
      recentMessages,
      insights: [
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
          id: 'memories',
          label: 'Memories',
          value: String(memories.length),
          detail: upcomingReminder
            ? `Next: ${upcomingReminder.title}`
            : `${memories.length} saved locally`,
        },
      ],
      companionPrompt:
        lastVoxaMessage?.content ??
        `"Hey ${profile.displayName}, I'm here whenever you want to talk."`,
      companionNote:
        memories.find((item) => item.category === 'emotional' || item.category === 'preferences')?.content ??
        'Voxa learns what matters to you over time.',
    };
  }

  async loadChatMessages(conversationId: string) {
    const messages = await this.repositories.messages.listMessages(conversationId);
    return messages
      .filter((item) => item.role !== 'system')
      .map((item) => toChatMessageView(item));
  }

  async sendChatMessage(input: SendChatMessageInput): Promise<SendChatMessageResult> {
    const profile = await this.repositories.userProfile.getProfile();
    if (!profile) throw new Error('User profile required before sending messages.');

    const userMessage = await this.repositories.messages.createMessage({
      conversationId: input.conversationId,
      role: 'user',
      content: input.content,
      mode: input.mode,
    });

    const history = await this.repositories.messages.listMessages(input.conversationId);
    const recentMessageTexts = history
      .filter((item) => item.role !== 'system')
      .slice(-6)
      .map((item) => item.content);

    const memories = profile.preferences.memoryEnabled
      ? await this.memoryEngine.retrieveForPrompt(input.userId, {
          userMessage: input.content,
          mode: input.mode,
          recentMessageTexts,
        })
      : [];

    const aiResult = await this.ai.generateReply({
      mode: input.mode,
      userMessage: input.content,
      conversationHistory: history,
      userProfile: profile,
      memories,
    });

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
      userMessage: input.content,
      voxaReply: voxaMessage.content,
      mode: input.mode,
      userProfile: profile,
    });

    return { userMessage, voxaMessage, aiMeta: aiResult };
  }

  async startVoiceSession(userId: string): Promise<SessionStartResult> {
    const profile = await this.repositories.userProfile.getProfile();
    if (!profile) throw new Error('User profile not found');

    const conversation = await this.getOrCreateConversation(userId, 'friend', 'voice', 'Voice call');
    const history = await this.repositories.messages.listMessages(conversation.id);
    const memories = profile.preferences.memoryEnabled
      ? await this.memoryEngine.retrieveForPrompt(userId, {
          userMessage: 'Starting a voice call with Voxa.',
          mode: 'friend',
          recentMessageTexts: history.map((item) => item.content),
        })
      : [];

    const aiResult = await this.ai.generateReply({
      mode: 'friend',
      userMessage: 'Starting a voice call with Voxa.',
      conversationHistory: history,
      userProfile: profile,
      memories,
    });

    const openingMessage = await this.repositories.messages.createMessage({
      conversationId: conversation.id,
      role: 'voxa',
      content: aiResult.content,
      mode: 'friend',
      metadata: { channel: 'voice' },
    });

    await this.repositories.conversations.updateConversation(conversation.id, {
      lastMessageAt: openingMessage.createdAt,
    });

    await this.memoryEngine.processAfterReply({
      userId,
      userMessage: 'Starting a voice call with Voxa.',
      voxaReply: openingMessage.content,
      mode: 'friend',
      userProfile: profile,
    });

    return { conversation, openingMessage };
  }

  async startSafeCallSession(userId: string): Promise<SessionStartResult> {
    const profile = await this.repositories.userProfile.getProfile();
    if (!profile) throw new Error('User profile not found');

    const conversation = await this.repositories.conversations.createConversation({
      userId,
      mode: 'safe_call',
      channel: 'safe_call',
      title: 'Safe Call session',
    });

    const memories = profile.preferences.memoryEnabled
      ? await this.memoryEngine.retrieveForPrompt(userId, {
          userMessage: 'I need to start a safe call.',
          mode: 'safe_call',
        })
      : [];

    const aiResult = await this.ai.generateReply({
      mode: 'safe_call',
      userMessage: 'I need to start a safe call.',
      conversationHistory: [],
      userProfile: profile,
      memories,
    });

    const openingMessage = await this.repositories.messages.createMessage({
      conversationId: conversation.id,
      role: 'voxa',
      content: aiResult.content,
      mode: 'safe_call',
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

    return { conversation, openingMessage };
  }

  async createScheduledReminder(input: CreateReminderInput): Promise<CreateReminderResult> {
    const reminder = await this.repositories.reminders.createReminder(input);
    return {
      reminder,
      confirmationMessage: buildVoxaCheckInConfirmation(reminder),
    };
  }

  async listUpcomingReminders(userId: string, limit = 5): Promise<Reminder[]> {
    const reminders = await this.repositories.reminders.listReminders(userId);
    return getUpcomingReminders(reminders, limit);
  }
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatRelativeTime(isoDate: string) {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'Yesterday' : `${days} days ago`;
}
