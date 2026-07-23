import { Goal, Memory } from '../../types';
import { CompanionOrbMood, CompanionOrbState } from '../../components/live-companion/live-companion-orb';
import { LivingCompanionV2State } from '../../types/phase7-signature';
import { TodayRoutineSummary } from '../../types/routine';

export function resolveLivingCompanionV2(input: {
  hour: number;
  streakDays: number;
  routine: TodayRoutineSummary;
  goals: Goal[];
  memories: Memory[];
  relationshipScore?: number;
  isTyping?: boolean;
  isListening?: boolean;
  daysAway?: number;
  celebrating?: boolean;
}): LivingCompanionV2State {
  const sources: string[] = [];
  let mood: CompanionOrbMood = 'calm';
  let state: CompanionOrbState = 'idle';
  let intensity = 0.45;
  let tintShift = '0%';

  if (input.isListening) {
    state = 'listening';
    mood = 'focused';
    intensity = 0.65;
    sources.push('listening');
  } else if (input.isTyping) {
    state = 'thinking';
    mood = 'focused';
    intensity = 0.55;
    sources.push('thinking');
  } else if (input.celebrating) {
    state = 'celebrating';
    mood = 'celebrating';
    intensity = 0.9;
    sources.push('milestone');
  } else if (input.hour >= 23 || input.hour < 6) {
    state = 'sleeping';
    mood = 'sleepy';
    intensity = 0.25;
    sources.push('time');
  } else if (input.streakDays >= 7) {
    mood = 'happy';
    intensity = 0.6;
    sources.push(`${input.streakDays}d streak`);
  } else if (input.routine.completionPercent >= 70) {
    mood = 'excited';
    intensity = 0.7;
    sources.push('routine progress');
  } else if (input.goals.some((g) => g.status === 'completed')) {
    mood = 'celebrating';
    intensity = 0.75;
    sources.push('goal completed');
  } else if (input.memories.length >= 3 && input.goals.some((g) => g.status === 'active')) {
    mood = 'curious';
    intensity = 0.55;
    sources.push('active goals');
  } else if (input.memories.length >= 5 && input.hour < 12) {
    mood = 'happy';
    sources.push('shared memories');
  } else if (input.daysAway && input.daysAway >= 3) {
    mood = 'happy';
    sources.push('return visit');
  }

  if (input.relationshipScore && input.relationshipScore >= 70) {
    tintShift = '8%';
    sources.push('relationship');
  }

  const recentGoal = input.goals.find((g) => g.status === 'active');
  const presenceLine = recentGoal
    ? `Still thinking about your ${recentGoal.title.toLowerCase()} goal.`
    : input.memories[0]
      ? `I remembered something from "${input.memories[0].title}".`
      : null;

  return { mood, state, tintShift, intensity, presenceLine, dataSources: sources };
}

export function mapPresenceMoodToOrb(mood: import('../companion/companion-presence-service').CompanionMood): CompanionOrbMood {
  switch (mood) {
    case 'celebrating': return 'celebrating';
    case 'sleepy': return 'sleepy';
    case 'energetic': return 'excited';
    case 'warm': return 'happy';
    default: return 'calm';
  }
}
