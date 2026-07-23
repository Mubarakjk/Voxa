import { CompanionIntelligenceBundle } from '../../types/companion-intelligence';
import { Goal, Memory } from '../../types';
import { CompanionMoodState, CompanionMoodV8 } from '../../types/phase8-retention';
import { CompanionOrbMood } from '../../components/live-companion/live-companion-orb';
import { TodayRoutineSummary } from '../../types/routine';

export function resolveCompanionMoodV8(input: {
  bundle: CompanionIntelligenceBundle;
  routine: TodayRoutineSummary;
  streakDays: number;
  daysAway: number;
  celebrating?: boolean;
  hour?: number;
  recentConversationTone?: 'warm' | 'heavy' | 'neutral';
}): CompanionMoodState {
  const hour = input.hour ?? new Date().getHours();
  const sources: string[] = [];
  let mood: CompanionMoodV8 = 'relaxed';
  let orbMood: CompanionOrbMood = 'calm';

  if (input.celebrating) {
    mood = 'celebrating';
    orbMood = 'celebrating';
    sources.push('celebration');
  } else if (hour >= 23 || hour < 6) {
    mood = 'sleepy';
    orbMood = 'sleepy';
    sources.push('time');
  } else if (input.recentConversationTone === 'heavy') {
    mood = 'thoughtful';
    orbMood = 'focused';
    sources.push('recent conversation');
  } else if (input.routine.completionPercent >= 70) {
    mood = 'excited';
    orbMood = 'excited';
    sources.push('routine');
  } else if (input.streakDays >= 7) {
    mood = 'playful';
    orbMood = 'happy';
    sources.push(`${input.streakDays}d streak`);
  } else if (input.bundle.relationship.conversationCount >= 50) {
    mood = 'curious';
    orbMood = 'curious';
    sources.push('relationship');
  } else if (input.daysAway >= 2) {
    mood = 'relaxed';
    orbMood = 'happy';
    sources.push('return');
  }

  const greetingTone: Record<CompanionMoodV8, string> = {
    relaxed: 'Easy and unhurried.',
    excited: 'Upbeat and energised.',
    thoughtful: 'Quiet and reflective.',
    curious: 'Interested and open.',
    playful: 'Light and warm.',
    celebrating: 'Genuinely happy for you.',
    sleepy: 'Soft and calm.',
  };

  return { mood, greetingTone: greetingTone[mood], orbMood, dataSources: sources };
}

export function moodWordingHint(mood: CompanionMoodV8): string {
  const hints: Record<CompanionMoodV8, string> = {
    relaxed: 'Keep replies unhurried. No pressure.',
    excited: 'Match their momentum — short, bright reactions.',
    thoughtful: 'Pause before advising. Reflect first.',
    curious: 'Ask one genuine question if natural.',
    playful: 'Light humour okay if kind.',
    celebrating: 'Name the win specifically.',
    sleepy: 'Gentle tone — late or early hours.',
  };
  return hints[mood];
}
