import { HomeIntelligenceSnapshot } from '../../types/companion-intelligence';
import { CompanionIntelligenceBundle } from '../../types/companion-intelligence';
import { Goal, Memory, Reminder, UserProfile } from '../../types';
import { conversationQualityEngine } from './conversation-quality-engine';
import { resolveGreetingFirstName } from '../../utils/greeting-name';

export type HomeIntelligenceInput = {
  profile: UserProfile;
  bundle: CompanionIntelligenceBundle;
  memories: Memory[];
  goals: Goal[];
  upcomingReminders: Reminder[];
  proactiveMessage: string | null;
  now?: Date;
};

const GREETING_POOL = {
  morning: [
    'Good morning',
    'Hey — morning',
    'Rise and breathe',
    'Morning, friend',
  ],
  afternoon: ['Good afternoon', 'Hey there', 'Hope your day is going okay'],
  evening: ['Good evening', 'Hey — winding down?', 'Evening check-in'],
  night: ['Hey night owl', 'Still up?', "Quiet hours — I'm here if you need me"],
};

const CONVERSATION_STARTERS = [
  "What's been on your mind lately?",
  'Want to talk about something light or something real?',
  'I was thinking about what you shared recently — want to continue?',
  'How are you feeling right now, honestly?',
  'Pick a topic — work, goals, or just life.',
];

export class HomeIntelligenceEngine {
  generate(input: HomeIntelligenceInput): HomeIntelligenceSnapshot {
    const now = input.now ?? new Date();
    const hour = now.getHours();
    const dayKey = now.toISOString().slice(0, 10);
    const timeSlot = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 22 ? 'evening' : 'night';

    const greetingBase = conversationQualityEngine.pickVariedOpener(
      input.bundle.conversationQuality,
      GREETING_POOL[timeSlot],
    );
    const firstName = resolveGreetingFirstName(input.profile.displayName);
    const personalGreeting = firstName ? `${greetingBase}, ${firstName}` : greetingBase;

    const dailyFocus = this.buildDailyFocus(input, dayKey);
    const progressUpdate = this.buildProgressUpdate(input.goals, input.bundle);
    const goalReminder = this.buildGoalReminder(input.goals);
    const relationshipMessage =
      input.proactiveMessage ?? input.bundle.relationship.summary.split('.')[0] + '.';
    const memoryHighlight = input.memories[0]
      ? `${input.memories[0].title} — ${input.memories[0].content.slice(0, 100)}`
      : null;
    const suggestedConversation = this.pickStarter(input, dayKey);
    const nextReminder = input.upcomingReminders[0] ?? null;

    return {
      personalGreeting,
      dailyFocus,
      progressUpdate,
      goalReminder,
      relationshipMessage,
      memoryHighlight,
      suggestedConversation,
      nextReminderLabel: nextReminder
        ? `${nextReminder.title} · ${new Date(nextReminder.scheduledAt).toLocaleString()}`
        : null,
      daySignature: `${dayKey}-${timeSlot}-${hashString(dailyFocus)}`,
    };
  }

  private buildDailyFocus(input: HomeIntelligenceInput, dayKey: string) {
    const ip = input.bundle.profile;
    const options: string[] = [];

    if (ip.currentChallenges[0]) options.push(`Hold space for: ${ip.currentChallenges[0]}`);
    if (input.goals[0]) options.push(`Move "${input.goals[0].title}" forward`);
    if (ip.routines[0]) options.push(`Honor your routine: ${ip.routines[0]}`);
    if (ip.favouriteTopics[0]) options.push(`Explore ${ip.favouriteTopics[0]}`);
    if (input.upcomingReminders[0]) options.push(`Prep for ${input.upcomingReminders[0].title}`);

    options.push('Check in with yourself emotionally');
    options.push('Take one clear step on what matters most');

    return options[hashString(dayKey) % options.length];
  }

  private buildProgressUpdate(goals: Goal[], bundle: CompanionIntelligenceBundle) {
    const active = goals.filter((g) => g.status === 'active');
    if (active.length === 0) {
      return bundle.profile.recentAchievements[0]
        ? `Recent win: ${bundle.profile.recentAchievements[0]}`
        : "Tell me a goal and we'll track it together.";
    }
    const top = active[0];
    return `"${top.title}" is at ${top.progress}% — ${top.progress >= 50 ? 'solid momentum' : 'room for a small step'}.`;
  }

  private buildGoalReminder(goals: Goal[]) {
    const active = goals.find((g) => g.status === 'active');
    if (!active) return null;
    return active.progress < 30
      ? `Gentle nudge: "${active.title}" is waiting for your attention.`
      : `Keep going on "${active.title}" — you're ${active.progress}% there.`;
  }

  private pickStarter(input: HomeIntelligenceInput, dayKey: string) {
    const ip = input.bundle.profile;
    const pool = [...CONVERSATION_STARTERS];
    if (ip.favouriteTopics[0]) pool.push(`Want to talk more about ${ip.favouriteTopics[0]}?`);
    if (ip.relationships[0]) pool.push(`How are things with ${ip.relationships[0].name}?`);

    const idx = hashString(`${dayKey}-${input.profile.id}`) % pool.length;
    return conversationQualityEngine.pickVariedOpener(input.bundle.conversationQuality, [
      pool[idx],
      ...pool.filter((_, i) => i !== idx),
    ]);
  }
}

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = (hash + value.charCodeAt(i) * (i + 1)) % 997;
  return Math.abs(hash);
}

export const homeIntelligenceEngine = new HomeIntelligenceEngine();
