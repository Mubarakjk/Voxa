import { CompanionOrbMood } from '../../components/live-companion/live-companion-orb';
import { RelationshipStage } from '../../types/phase7-signature';

export function resolveLivingMood(input: {
  hour: number;
  streakDays: number;
  daysAway: number;
  moodLabel?: string | null;
  celebrating?: boolean;
  userDistressed?: boolean;
  stage: RelationshipStage;
}): { mood: CompanionOrbMood; reason: string } {
  if (input.celebrating) return { mood: 'celebrating', reason: 'Something worth celebrating' };
  if (input.userDistressed) return { mood: 'concerned', reason: 'Here with you' };
  if (input.daysAway >= 3) return { mood: 'concerned', reason: 'Missed you' };
  if (input.hour >= 22 || input.hour < 6) return { mood: 'sleepy', reason: 'Winding down' };
  if (input.hour >= 6 && input.hour < 10) return { mood: 'calm', reason: 'Good morning energy' };
  if (input.streakDays >= 7) return { mood: 'happy', reason: `${input.streakDays} day streak` };
  if (/excited|happy|great|good/i.test(input.moodLabel ?? '')) return { mood: 'excited', reason: 'Matching your energy' };
  if (/focus|busy|work/i.test(input.moodLabel ?? '')) return { mood: 'focused', reason: 'Focus mode' };
  if (input.stage === 'best_friend' || input.stage === 'life_companion') {
    return { mood: 'happy', reason: 'Comfortable together' };
  }
  if (input.hour >= 17 && input.hour < 22) return { mood: 'relaxed', reason: 'Evening calm' };
  return { mood: 'thinking', reason: 'Listening' };
}
