import { SupabaseClient } from '@supabase/supabase-js';

import { VoxaRepositories } from '../contracts';
import { IStorageService } from '../contracts/storage-service';
import { LocalConversationRepository } from '../local/local-conversation-repository';
import { LocalGoalRepository } from '../local/local-goal-repository';
import { LocalMemoryRepository } from '../local/local-memory-repository';
import { LocalMessageRepository } from '../local/local-message-repository';
import { LocalReminderRepository } from '../local/local-reminder-repository';
import { LocalTrustedContactRepository } from '../local/local-trusted-contact-repository';
import { LocalUserProfileRepository } from '../local/local-user-profile-repository';
import { LocalVoiceSessionRepository } from '../local/local-voice-session-repository';
import { createSupabaseRepositories } from '../supabase/supabase-repositories';
import { mergeMessages } from './message-merge';
import { recordChatSaveFailure, recordChatSaveSuccess } from '../../utils/chat-save-status';
import { getCurrentUserId } from '../supabase/client';

async function tryRemote<T>(label: string, primary: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
  try {
    return await primary();
  } catch (error) {
    console.warn(`[Voxa] Remote ${label} failed, using local cache.`, error);
    return fallback();
  }
}

async function tryRemoteWrite<T>(
  label: string,
  primary: () => Promise<T>,
  mirror: (value: T) => Promise<unknown>,
  fallback: () => Promise<T>,
): Promise<T> {
  try {
    const result = await primary();
    await mirror(result).catch(() => undefined);
    return result;
  } catch (error) {
    console.warn(`[Voxa] Remote ${label} write failed, saving locally.`, error);
    return fallback();
  }
}

/**
 * Supabase-primary repositories with AsyncStorage cache fallback for offline reads/writes.
 * Preferences live on the profile record — same hybrid profile repository.
 */
export function createHybridRepositories(
  client: SupabaseClient,
  storage: IStorageService,
): VoxaRepositories {
  const remote = createSupabaseRepositories(client);
  const local: VoxaRepositories = {
    userProfile: new LocalUserProfileRepository(storage),
    memories: new LocalMemoryRepository(storage),
    conversations: new LocalConversationRepository(storage),
    messages: new LocalMessageRepository(storage),
    reminders: new LocalReminderRepository(storage),
    goals: new LocalGoalRepository(storage),
    voiceSessions: new LocalVoiceSessionRepository(storage),
    trustedContacts: new LocalTrustedContactRepository(storage),
  };

  return {
    userProfile: {
      getProfile: async () => {
        try {
          const remoteProfile = await remote.userProfile.getProfile();
          if (remoteProfile) {
            await local.userProfile.saveProfile(remoteProfile).catch(() => undefined);
            return remoteProfile;
          }
        } catch (error) {
          console.warn('[Voxa] Remote profile failed, checking local cache.', error);
        }
        const authId = await getCurrentUserId();
        const localProfile = await local.userProfile.getProfile();
        if (authId && localProfile && localProfile.id !== authId) {
          console.warn('[Voxa] Local profile cache belongs to a different user — skipping fallback.');
          return null;
        }
        return localProfile;
      },
      saveProfile: (profile) =>
        tryRemoteWrite(
          'profile',
          () => remote.userProfile.saveProfile(profile),
          (saved) => local.userProfile.saveProfile(saved),
          () => local.userProfile.saveProfile(profile),
        ),
      createProfile: (input) =>
        tryRemoteWrite(
          'profile',
          () => remote.userProfile.createProfile(input),
          (created) => local.userProfile.saveProfile(created),
          () => local.userProfile.createProfile(input),
        ),
      updateProfile: (input) =>
        tryRemoteWrite(
          'profile',
          () => remote.userProfile.updateProfile(input),
          (updated) => local.userProfile.saveProfile(updated),
          () => local.userProfile.updateProfile(input),
        ),
      clearProfile: () =>
        tryRemote('profile.clear', () => remote.userProfile.clearProfile(), () => local.userProfile.clearProfile()),
    },
    memories: {
      listMemories: (userId) =>
        tryRemote('memories.list', () => remote.memories.listMemories(userId), () => local.memories.listMemories(userId)),
      getMemory: (id) =>
        tryRemote('memories.get', () => remote.memories.getMemory(id), () => local.memories.getMemory(id)),
      createMemory: (input) =>
        tryRemoteWrite(
          'memories.create',
          () => remote.memories.createMemory(input),
          () => Promise.resolve(),
          () => local.memories.createMemory(input),
        ),
      updateMemory: (id, input) =>
        tryRemoteWrite(
          'memories.update',
          () => remote.memories.updateMemory(id, input),
          (updated) => local.memories.updateMemory(id, input).catch(() => updated),
          () => local.memories.updateMemory(id, input),
        ),
      deleteMemory: (id) =>
        tryRemote(
          'memories.delete',
          async () => {
            await remote.memories.deleteMemory(id);
            await local.memories.deleteMemory(id).catch(() => undefined);
          },
          () => local.memories.deleteMemory(id),
        ),
      clearMemoriesForUser: (userId) =>
        tryRemote(
          'memories.clear',
          async () => {
            await remote.memories.clearMemoriesForUser(userId);
            await local.memories.clearMemoriesForUser(userId).catch(() => undefined);
          },
          () => local.memories.clearMemoriesForUser(userId),
        ),
    },
    goals: {
      listGoals: (userId) =>
        tryRemote('goals.list', () => remote.goals.listGoals(userId), () => local.goals.listGoals(userId)),
      listActiveGoals: (userId) =>
        tryRemote('goals.active', () => remote.goals.listActiveGoals(userId), () => local.goals.listActiveGoals(userId)),
      getGoal: (id) => tryRemote('goals.get', () => remote.goals.getGoal(id), () => local.goals.getGoal(id)),
      createGoal: (input) =>
        tryRemoteWrite(
          'goals.create',
          () => remote.goals.createGoal(input),
          () => Promise.resolve(),
          () => local.goals.createGoal(input),
        ),
      updateGoal: (id, input) =>
        tryRemoteWrite(
          'goals.update',
          () => remote.goals.updateGoal(id, input),
          () => local.goals.updateGoal(id, input),
          () => local.goals.updateGoal(id, input),
        ),
      deleteGoal: (id) =>
        tryRemote(
          'goals.delete',
          async () => {
            await remote.goals.deleteGoal(id);
            await local.goals.deleteGoal(id).catch(() => undefined);
          },
          () => local.goals.deleteGoal(id),
        ),
    },
    reminders: {
      listReminders: (userId) =>
        tryRemote('reminders.list', () => remote.reminders.listReminders(userId), () => local.reminders.listReminders(userId)),
      listUpcomingCheckIns: (userId) =>
        tryRemote(
          'reminders.upcoming',
          () => remote.reminders.listUpcomingCheckIns(userId),
          () => local.reminders.listUpcomingCheckIns(userId),
        ),
      getReminder: (id) =>
        tryRemote('reminders.get', () => remote.reminders.getReminder(id), () => local.reminders.getReminder(id)),
      createReminder: (input) =>
        tryRemoteWrite(
          'reminders.create',
          () => remote.reminders.createReminder(input),
          () => Promise.resolve(),
          () => local.reminders.createReminder(input),
        ),
      updateReminder: (id, input) =>
        tryRemoteWrite(
          'reminders.update',
          () => remote.reminders.updateReminder(id, input),
          () => local.reminders.updateReminder(id, input),
          () => local.reminders.updateReminder(id, input),
        ),
      deleteReminder: (id) =>
        tryRemote(
          'reminders.delete',
          async () => {
            await remote.reminders.deleteReminder(id);
            await local.reminders.deleteReminder(id).catch(() => undefined);
          },
          () => local.reminders.deleteReminder(id),
        ),
    },
    conversations: {
      listConversations: (userId) =>
        tryRemote(
          'conversations.list',
          () => remote.conversations.listConversations(userId),
          () => local.conversations.listConversations(userId),
        ),
      getConversation: (id) =>
        tryRemote('conversations.get', () => remote.conversations.getConversation(id), () => local.conversations.getConversation(id)),
      createConversation: (input) =>
        tryRemoteWrite(
          'conversations.create',
          () => remote.conversations.createConversation(input),
          () => Promise.resolve(),
          () => local.conversations.createConversation(input),
        ),
      updateConversation: (id, input) =>
        tryRemoteWrite(
          'conversations.update',
          () => remote.conversations.updateConversation(id, input),
          () => local.conversations.updateConversation(id, input),
          () => local.conversations.updateConversation(id, input),
        ),
      deleteConversation: (id) =>
        tryRemote(
          'conversations.delete',
          async () => {
            await remote.conversations.deleteConversation(id);
            await local.conversations.deleteConversation(id).catch(() => undefined);
          },
          () => local.conversations.deleteConversation(id),
        ),
    },
    messages: {
      listMessages: async (conversationId) => {
        const localMessages = await local.messages.listMessages(conversationId);
        try {
          const remoteMessages = await remote.messages.listMessages(conversationId);
          const merged = mergeMessages(localMessages, remoteMessages);
          await Promise.all(merged.map((item) => local.messages.upsertMessage(item).catch(() => item)));
          return merged;
        } catch (error) {
          console.warn('[Voxa] Remote messages.list failed, using local cache.', error);
          return localMessages;
        }
      },
      createMessage: async (input) => {
        try {
          const created = await remote.messages.createMessage(input);
          await local.messages.upsertMessage(created).catch(() => undefined);
          recordChatSaveSuccess('Remote OK');
          return created;
        } catch (error) {
          console.warn('[Voxa] Remote messages.create failed, saving locally.', error);
          recordChatSaveFailure(error);
          return local.messages.createMessage(input);
        }
      },
      upsertMessage: (message) => local.messages.upsertMessage(message),
      updateMessage: async (id, input) => {
        try {
          const updated = await remote.messages.updateMessage(id, input);
          await local.messages.upsertMessage(updated).catch(() => undefined);
          recordChatSaveSuccess('Update OK');
          return updated;
        } catch (error) {
          console.warn('[Voxa] Remote messages.update failed, updating locally.', error);
          recordChatSaveFailure(error);
          return local.messages.updateMessage(id, input);
        }
      },
      deleteMessagesForConversation: (conversationId) =>
        tryRemote(
          'messages.delete',
          async () => {
            await remote.messages.deleteMessagesForConversation(conversationId);
            await local.messages.deleteMessagesForConversation(conversationId).catch(() => undefined);
          },
          () => local.messages.deleteMessagesForConversation(conversationId),
        ),
    },
    voiceSessions: {
      listSessions: (userId) =>
        tryRemote('voice.list', () => remote.voiceSessions.listSessions(userId), () => local.voiceSessions.listSessions(userId)),
      getActiveSession: (userId) =>
        tryRemote(
          'voice.active',
          () => remote.voiceSessions.getActiveSession(userId),
          () => local.voiceSessions.getActiveSession(userId),
        ),
      getSession: (id) =>
        tryRemote('voice.get', () => remote.voiceSessions.getSession(id), () => local.voiceSessions.getSession(id)),
      createSession: (input) =>
        tryRemoteWrite(
          'voice.create',
          () => remote.voiceSessions.createSession(input),
          () => Promise.resolve(),
          () => local.voiceSessions.createSession(input),
        ),
      updateSession: (id, input) =>
        tryRemoteWrite(
          'voice.update',
          () => remote.voiceSessions.updateSession(id, input),
          () => local.voiceSessions.updateSession(id, input),
          () => local.voiceSessions.updateSession(id, input),
        ),
    },
    trustedContacts: {
      listContacts: (userId) =>
        tryRemote(
          'contacts.list',
          () => remote.trustedContacts.listContacts(userId),
          () => local.trustedContacts.listContacts(userId),
        ),
      createContact: (input) =>
        tryRemoteWrite(
          'contacts.create',
          () => remote.trustedContacts.createContact(input),
          () => Promise.resolve(),
          () => local.trustedContacts.createContact(input),
        ),
    },
  };
}
