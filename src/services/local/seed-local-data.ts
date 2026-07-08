import { STORAGE_KEYS } from '../../constants/storage-keys';
import { safeContacts, USER_NAME } from '../../constants/dummy-data';
import { CreateGoalInput, CreateMemoryInput, CreateReminderInput, nowIso, UserProfile } from '../../types';
import { VoxaRepositories, VoxaServices } from '../contracts';

function tomorrowAt(hour: number, minute = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function daysFromNowAt(days: number, hour: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

export async function seedLocalVoxaData(repositories: VoxaRepositories): Promise<UserProfile> {
  const existing = await repositories.userProfile.getProfile();
  if (existing) {
    const memories = await repositories.memories.listMemories(existing.id);
    if (memories.length > 0) {
      return existing;
    }
  }

  const profile = await repositories.userProfile.createProfile({ displayName: USER_NAME });

  const seedMemories: CreateMemoryInput[] = [
    {
      userId: profile.id,
      category: 'goals',
      title: 'Morning routine',
      content: 'Wants to wake at 6:30 AM and start with 10 minutes of journaling.',
      mood: 'motivated',
      importance: 4,
      tags: ['routine', 'morning'],
      source: 'manual',
      relatedMode: 'coach',
    },
    {
      userId: profile.id,
      category: 'people',
      title: 'Sister — Amira',
      content: 'Birthday coming up on April 18. Loves handwritten notes.',
      mood: 'warm',
      importance: 5,
      tags: ['family'],
      source: 'manual',
      relatedMode: 'friend',
    },
    {
      userId: profile.id,
      category: 'emotional',
      title: 'Evening wind-down',
      content: 'Prefers soft conversation and calm over productivity talk after 9 PM.',
      mood: 'calm',
      importance: 4,
      tags: ['evening', 'preferences'],
      source: 'conversation',
      relatedMode: 'reflection',
    },
  ];

  for (const memory of seedMemories) {
    await repositories.memories.createMemory(memory);
  }

  const seedReminders: CreateReminderInput[] = [
    {
      userId: profile.id,
      kind: 'check_in',
      title: 'Evening reflection',
      body: 'Gentle emotional check-in before bed.',
      scheduledAt: tomorrowAt(21, 0),
      recurrence: 'daily',
      mode: 'reflection',
      allowProactiveCall: true,
    },
    {
      userId: profile.id,
      kind: 'daily_goal',
      title: 'Morning journal',
      body: '10 minutes of journaling after waking.',
      scheduledAt: tomorrowAt(6, 45),
      recurrence: 'weekdays',
      mode: 'coach',
    },
    {
      userId: profile.id,
      kind: 'reminder',
      title: 'Hydrate',
      body: 'Drink a glass of water.',
      scheduledAt: daysFromNowAt(0, 15),
      recurrence: 'daily',
      mode: 'assistant',
    },
  ];

  for (const reminder of seedReminders) {
    await repositories.reminders.createReminder(reminder);
  }

  const seedGoals: CreateGoalInput[] = [
    {
      userId: profile.id,
      title: 'Morning journal habit',
      description: '10 minutes of journaling after waking.',
      category: 'productivity',
      status: 'active',
      progress: 35,
    },
    {
      userId: profile.id,
      title: 'Run 3 times per week',
      description: 'Build a steady running routine.',
      category: 'fitness',
      status: 'active',
      progress: 20,
    },
  ];

  for (const goal of seedGoals) {
    await repositories.goals.createGoal(goal);
  }

  for (const contact of safeContacts) {
    await repositories.trustedContacts.createContact({
      userId: profile.id,
      name: contact.name,
      relation: contact.relation,
      status: contact.status,
    });
  }

  const conversation = await repositories.conversations.createConversation({
    userId: profile.id,
    mode: 'friend',
    channel: 'chat',
    title: 'Evening check-in',
  });

  const seededMessages = [
    { role: 'voxa' as const, content: `Good evening, ${profile.displayName}. How are you feeling tonight?` },
    { role: 'user' as const, content: 'A bit tired, but grateful for how the day went.' },
    { role: 'voxa' as const, content: "That's beautiful. Want to unwind together?" },
  ];

  for (const item of seededMessages) {
    await repositories.messages.createMessage({
      conversationId: conversation.id,
      role: item.role,
      content: item.content,
      mode: 'friend',
    });
  }

  await repositories.conversations.updateConversation(conversation.id, {
    lastMessageAt: nowIso(),
  });

  return profile;
}

export async function clearAllLocalVoxaData(
  storage: { multiRemove(keys: string[]): Promise<void> },
): Promise<void> {
  await storage.multiRemove(Object.values(STORAGE_KEYS));
}

export async function resetLocalVoxaData(services: VoxaServices): Promise<UserProfile> {
  await clearAllLocalVoxaData(services.storage);
  return seedLocalVoxaData(services.repositories);
}
