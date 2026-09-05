import { SupabaseClient } from '@supabase/supabase-js';

import {
  createId,
  CreateConversationInput,
  CreateGoalInput,
  CreateMemoryInput,
  CreateMessageInput,
  CreateReminderInput,
  CreateTrustedContactInput,
  CreateUserProfileInput,
  CreateVoiceSessionInput,
  Message,
  nowIso,
  UpdateConversationInput,
  UpdateGoalInput,
  UpdateMemoryInput,
  UpdateReminderInput,
  UpdateUserProfileInput,
  UpdateVoiceSessionInput,
  mergeCompanion,
  mergePreferences,
  createDefaultSubscription,
} from '../../types';
import {
  IConversationRepository,
  IGoalRepository,
  IMemoryRepository,
  IMessageRepository,
  IReminderRepository,
  ITrustedContactRepository,
  IUserProfileRepository,
  IVoiceSessionRepository,
  VoxaRepositories,
} from '../contracts';
import { getCurrentUserId } from './client';
import {
  conversationFromRow,
  goalFromRow,
  memoryFromRow,
  memoryToInsert,
  memoryToUpdate,
  messageFromRow,
  profileFromRow,
  profileToUpdate,
  reminderFromRow,
  reminderToUpdate,
  trustedContactFromRow,
  voiceSessionFromRow,
} from './mappers';

async function requireUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Not authenticated.');
  return userId;
}

export class SupabaseUserProfileRepository implements IUserProfileRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getProfile() {
    const userId = await requireUserId();
    const { data, error } = await this.client.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (error) throw error;
    return data ? profileFromRow(data) : null;
  }

  async saveProfile(profile: import('../../types').UserProfile) {
    const { data, error } = await this.client
      .from('profiles')
      .upsert({
        id: profile.id,
        display_name: profile.displayName,
        email: profile.email,
        age: profile.age,
        main_reason: profile.mainReason,
        timezone: profile.timezone,
        onboarding_complete: profile.onboardingComplete,
        preferences: profile.preferences,
        companion: profile.companion,
        companion_identity: profile.companionIdentity ?? null,
        onboarding: profile.onboarding,
        subscription: profile.subscription,
        updated_at: nowIso(),
      })
      .select('*')
      .single();
    if (error) throw error;
    return profileFromRow(data);
  }

  async createProfile(input: CreateUserProfileInput) {
    const existing = await this.getProfile();
    if (existing) return existing;
    const userId = await requireUserId();
    const timestamp = nowIso();
    const { data, error } = await this.client
      .from('profiles')
      .upsert({
        id: userId,
        display_name: input.displayName,
        email: input.email,
        timezone: input.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
        updated_at: timestamp,
      })
      .select('*')
      .single();
    if (error) throw error;
    return profileFromRow(data);
  }

  async updateProfile(input: UpdateUserProfileInput) {
    const current = await this.getProfile();
    if (!current) throw new Error('User profile not found');

    const updated = {
      ...current,
      ...input,
      preferences: mergePreferences(current.preferences, input.preferences),
      companion: mergeCompanion(current.companion, input.companion),
      companionIdentity: input.companionIdentity
        ? { ...current.companionIdentity, ...input.companionIdentity }
        : current.companionIdentity,
      subscription: input.subscription
        ? { ...(current.subscription ?? createDefaultSubscription()), ...input.subscription }
        : current.subscription,
      updatedAt: nowIso(),
    };

    const { data, error } = await this.client
      .from('profiles')
      .update({
        ...profileToUpdate(input),
        preferences: updated.preferences,
        companion: updated.companion,
        companion_identity: updated.companionIdentity ?? null,
        onboarding: updated.onboarding,
        subscription: updated.subscription,
      })
      .eq('id', current.id)
      .select('*')
      .single();
    if (error) throw error;
    return profileFromRow(data);
  }

  async clearProfile() {
    const userId = await requireUserId();
    await this.client.from('profiles').delete().eq('id', userId);
  }
}

export class SupabaseMemoryRepository implements IMemoryRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listMemories(userId: string) {
    const { data, error } = await this.client
      .from('memories')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(memoryFromRow);
  }

  async getMemory(id: string) {
    const { data, error } = await this.client.from('memories').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? memoryFromRow(data) : null;
  }

  async createMemory(input: CreateMemoryInput) {
    const timestamp = nowIso();
    const id = createId('memory');
    const { data, error } = await this.client
      .from('memories')
      .insert(memoryToInsert(input, id, timestamp))
      .select('*')
      .single();
    if (error) throw error;
    return memoryFromRow(data);
  }

  async updateMemory(id: string, input: UpdateMemoryInput) {
    let tags = input.tags;
    if (input.pinned !== undefined) {
      const current = await this.getMemory(id);
      const base = tags ?? current?.tags ?? [];
      tags = input.pinned
        ? [...base.filter((tag) => tag !== 'pinned'), 'pinned']
        : base.filter((tag) => tag !== 'pinned');
    }
    const { data, error } = await this.client
      .from('memories')
      .update(memoryToUpdate(input, tags))
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return memoryFromRow(data);
  }

  async deleteMemory(id: string) {
    const { error } = await this.client.from('memories').delete().eq('id', id);
    if (error) throw error;
  }

  async clearMemoriesForUser(userId: string) {
    const { error } = await this.client.from('memories').delete().eq('user_id', userId);
    if (error) throw error;
  }
}

export class SupabaseGoalRepository implements IGoalRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listGoals(userId: string) {
    const { data, error } = await this.client
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(goalFromRow);
  }

  async listActiveGoals(userId: string) {
    const goals = await this.listGoals(userId);
    return goals.filter((item) => item.status === 'active');
  }

  async getGoal(id: string) {
    const { data, error } = await this.client.from('goals').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? goalFromRow(data) : null;
  }

  async createGoal(input: CreateGoalInput) {
    const timestamp = nowIso();
    const id = createId('goal');
    const { data, error } = await this.client
      .from('goals')
      .insert({
        id,
        user_id: input.userId,
        title: input.title,
        description: input.description,
        category: input.category,
        status: input.status ?? 'active',
        progress: input.progress ?? 0,
        target_date: input.targetDate,
        linked_reminder_id: input.linkedReminderId,
        created_at: timestamp,
        updated_at: timestamp,
      })
      .select('*')
      .single();
    if (error) throw error;
    return goalFromRow(data);
  }

  async updateGoal(id: string, input: UpdateGoalInput) {
    const { data, error } = await this.client
      .from('goals')
      .update({
        title: input.title,
        description: input.description,
        category: input.category,
        status: input.status,
        progress: input.progress,
        target_date: input.targetDate,
        linked_reminder_id: input.linkedReminderId,
        updated_at: nowIso(),
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return goalFromRow(data);
  }

  async deleteGoal(id: string) {
    const { error } = await this.client.from('goals').delete().eq('id', id);
    if (error) throw error;
  }
}

export class SupabaseReminderRepository implements IReminderRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listReminders(userId: string) {
    const { data, error } = await this.client
      .from('reminders')
      .select('*')
      .eq('user_id', userId)
      .order('scheduled_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(reminderFromRow);
  }

  async listUpcomingCheckIns(userId: string) {
    const now = nowIso();
    const reminders = await this.listReminders(userId);
    return reminders.filter(
      (item) =>
        (item.kind === 'check_in' || item.allowProactiveCall) &&
        item.status === 'scheduled' &&
        item.scheduledAt >= now,
    );
  }

  async getReminder(id: string) {
    const { data, error } = await this.client.from('reminders').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? reminderFromRow(data) : null;
  }

  async createReminder(input: CreateReminderInput) {
    const timestamp = nowIso();
    const id = createId('reminder');
    const { data, error } = await this.client
      .from('reminders')
      .insert({
        id,
        user_id: input.userId,
        kind: input.kind,
        title: input.title,
        body: input.body,
        scheduled_at: input.scheduledAt,
        recurrence: input.recurrence ?? 'none',
        status: 'scheduled',
        mode: input.mode,
        allow_proactive_call: input.allowProactiveCall ?? input.kind === 'check_in',
        goal_id: input.goalId,
        created_at: timestamp,
        updated_at: timestamp,
      })
      .select('*')
      .single();
    if (error) throw error;
    return reminderFromRow(data);
  }

  async updateReminder(id: string, input: UpdateReminderInput) {
    const { data, error } = await this.client
      .from('reminders')
      .update(reminderToUpdate(input))
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return reminderFromRow(data);
  }

  async deleteReminder(id: string) {
    const { error } = await this.client.from('reminders').delete().eq('id', id);
    if (error) throw error;
  }
}

export class SupabaseConversationRepository implements IConversationRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listConversations(userId: string) {
    const { data, error } = await this.client
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(conversationFromRow);
  }

  async getConversation(id: string) {
    const { data, error } = await this.client.from('conversations').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? conversationFromRow(data) : null;
  }

  async createConversation(input: CreateConversationInput) {
    const timestamp = nowIso();
    const id = createId('conv');
    const { data, error } = await this.client
      .from('conversations')
      .insert({
        id,
        user_id: input.userId,
        mode: input.mode,
        channel: input.channel,
        title: input.title,
        status: 'active',
        created_at: timestamp,
        updated_at: timestamp,
      })
      .select('*')
      .single();
    if (error) throw error;
    return conversationFromRow(data);
  }

  async updateConversation(id: string, input: UpdateConversationInput) {
    const { data, error } = await this.client
      .from('conversations')
      .update({
        title: input.title,
        status: input.status,
        last_message_at: input.lastMessageAt,
        summary: input.summary,
        updated_at: nowIso(),
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return conversationFromRow(data);
  }

  async deleteConversation(id: string) {
    const { error } = await this.client.from('conversations').delete().eq('id', id);
    if (error) throw error;
  }
}

export class SupabaseMessageRepository implements IMessageRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listMessages(conversationId: string) {
    const { data, error } = await this.client
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(messageFromRow);
  }

  async createMessage(input: CreateMessageInput) {
    const userId = await requireUserId();
    const id = input.id ?? createId('msg');
    const { data, error } = await this.client
      .from('messages')
      .insert({
        id,
        conversation_id: input.conversationId,
        user_id: userId,
        role: input.role,
        content: input.content,
        mode: input.mode,
        status: input.status ?? 'sent',
        metadata: input.metadata,
        attachments: input.attachments ?? [],
        created_at: nowIso(),
      })
      .select('*')
      .single();
    if (error) throw error;
    return messageFromRow(data);
  }

  async updateMessage(id: string, input: import('../../types').UpdateMessageInput) {
    const patch: Record<string, unknown> = {};
    if (input.content !== undefined) patch.content = input.content;
    if (input.status !== undefined) patch.status = input.status;
    if (input.metadata !== undefined) patch.metadata = input.metadata;
    if (input.attachments !== undefined) patch.attachments = input.attachments;

    const { data, error } = await this.client.from('messages').update(patch).eq('id', id).select('*').single();
    if (error) throw error;
    return messageFromRow(data);
  }

  async upsertMessage(message: Message) {
    const userId = await requireUserId();
    const { data, error } = await this.client
      .from('messages')
      .upsert({
        id: message.id,
        conversation_id: message.conversationId,
        user_id: userId,
        role: message.role,
        content: message.content,
        mode: message.mode,
        status: message.status,
        metadata: message.metadata,
        attachments: message.attachments ?? [],
        created_at: message.createdAt,
      })
      .select('*')
      .single();
    if (error) throw error;
    return messageFromRow(data);
  }

  async deleteMessagesForConversation(conversationId: string) {
    const { error } = await this.client.from('messages').delete().eq('conversation_id', conversationId);
    if (error) throw error;
  }

  async deleteMessage(id: string) {
    const { error } = await this.client.from('messages').delete().eq('id', id);
    if (error) throw error;
  }
}

export class SupabaseVoiceSessionRepository implements IVoiceSessionRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listSessions(userId: string) {
    const { data, error } = await this.client
      .from('voice_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(voiceSessionFromRow);
  }

  async getActiveSession(userId: string) {
    const sessions = await this.listSessions(userId);
    return sessions.find((item) => item.state === 'ringing' || item.state === 'active') ?? null;
  }

  async getSession(id: string) {
    const { data, error } = await this.client.from('voice_sessions').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? voiceSessionFromRow(data) : null;
  }

  async createSession(input: CreateVoiceSessionInput) {
    const timestamp = nowIso();
    const id = createId('voice');
    const { data, error } = await this.client
      .from('voice_sessions')
      .insert({
        id,
        user_id: input.userId,
        conversation_id: input.conversationId,
        mode: input.mode,
        state: 'ringing',
        is_safe_call: input.isSafeCall ?? false,
        duration_seconds: 0,
        transcript_message_ids: [],
        check_in_interval_minutes: input.checkInIntervalMinutes,
        created_at: timestamp,
        updated_at: timestamp,
      })
      .select('*')
      .single();
    if (error) throw error;
    return voiceSessionFromRow(data);
  }

  async updateSession(id: string, input: UpdateVoiceSessionInput) {
    const { data, error } = await this.client
      .from('voice_sessions')
      .update({
        state: input.state,
        started_at: input.startedAt,
        ended_at: input.endedAt,
        duration_seconds: input.durationSeconds,
        transcript_message_ids: input.transcriptMessageIds,
        check_in_interval_minutes: input.checkInIntervalMinutes,
        updated_at: nowIso(),
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return voiceSessionFromRow(data);
  }
}

export class SupabaseTrustedContactRepository implements ITrustedContactRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listContacts(userId: string) {
    const { data, error } = await this.client
      .from('trusted_contacts')
      .select('*')
      .eq('user_id', userId);
    if (error) throw error;
    return (data ?? []).map(trustedContactFromRow);
  }

  async createContact(input: CreateTrustedContactInput) {
    const timestamp = nowIso();
    const id = createId('contact');
    const { data, error } = await this.client
      .from('trusted_contacts')
      .insert({
        id,
        user_id: input.userId,
        name: input.name,
        relation: input.relation,
        status: input.status ?? 'Available',
        phone: input.phone,
        is_emergency: input.isEmergency ?? false,
        created_at: timestamp,
        updated_at: timestamp,
      })
      .select('*')
      .single();
    if (error) throw error;
    return trustedContactFromRow(data);
  }
}

export function createSupabaseRepositories(client: SupabaseClient): VoxaRepositories {
  return {
    userProfile: new SupabaseUserProfileRepository(client),
    memories: new SupabaseMemoryRepository(client),
    goals: new SupabaseGoalRepository(client),
    reminders: new SupabaseReminderRepository(client),
    conversations: new SupabaseConversationRepository(client),
    messages: new SupabaseMessageRepository(client),
    voiceSessions: new SupabaseVoiceSessionRepository(client),
    trustedContacts: new SupabaseTrustedContactRepository(client),
  };
}
