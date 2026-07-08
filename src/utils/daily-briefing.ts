import { Goal, Memory, Reminder, UserProfile } from '../types';

function getGreeting(displayName: string): string {
  const hour = new Date().getHours();
  if (hour < 12) return `Good morning, ${displayName}`;
  if (hour < 17) return `Good afternoon, ${displayName}`;
  return `Good evening, ${displayName}`;
}

function isToday(isoDate: string): boolean {
  const date = new Date(isoDate);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function buildPersonalMessage(memories: Memory[], profile: UserProfile): string {
  const relevant =
    memories.find((item) => item.category === 'people' || item.category === 'preferences') ??
    memories.find((item) => item.category === 'goals' || item.category === 'emotional') ??
    memories[0];

  if (!relevant) {
    return `I'm learning what matters to you, ${profile.displayName}. Tell me more when you're ready.`;
  }

  return `I remember ${relevant.title.toLowerCase()} — ${relevant.content}`;
}

function buildSuggestedAction(input: {
  checkInsToday: Reminder[];
  activeGoals: Goal[];
  upcomingReminders: Reminder[];
}): string {
  if (input.checkInsToday.length > 0) {
    return `Your next check-in is "${input.checkInsToday[0].title}". Want to prep for it together?`;
  }

  if (input.activeGoals.length > 0) {
    const goal = input.activeGoals[0];
    return `You're ${goal.progress}% toward "${goal.title}". A small step today could move you forward.`;
  }

  if (input.upcomingReminders.length > 0) {
    return `You have "${input.upcomingReminders[0].title}" coming up. I can help you get ready.`;
  }

  return 'Open Chat and tell me what kind of support you want today.';
}

export function buildDailyBriefing(input: {
  profile: UserProfile;
  memories: Memory[];
  reminders: Reminder[];
  activeGoals: Goal[];
}) {
  const checkInsToday = input.reminders.filter(
    (item) =>
      item.status === 'scheduled' &&
      isToday(item.scheduledAt) &&
      (item.kind === 'check_in' || item.kind === 'daily_goal' || item.kind === 'reminder'),
  );

  const upcomingReminders = input.reminders
    .filter((item) => item.status === 'scheduled' && new Date(item.scheduledAt) >= new Date())
    .slice(0, 5);

  return {
    greeting: getGreeting(input.profile.displayName),
    personalMessage: buildPersonalMessage(input.memories, input.profile),
    suggestedAction: buildSuggestedAction({
      checkInsToday,
      activeGoals: input.activeGoals,
      upcomingReminders,
    }),
    checkInsToday,
    activeGoals: input.activeGoals.filter((item) => item.status === 'active').slice(0, 5),
  };
}
