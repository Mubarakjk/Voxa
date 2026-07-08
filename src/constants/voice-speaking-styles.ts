import { SpeakingStyleId } from '../types/voice-identity';

export type SpeakingStyleOption = {
  id: SpeakingStyleId;
  label: string;
  description: string;
  futureOnly?: boolean;
};

export const SPEAKING_STYLES: SpeakingStyleOption[] = [
  { id: 'calm', label: 'Calm', description: 'Steady, unhurried, grounding.' },
  { id: 'friendly', label: 'Friendly', description: 'Warm and approachable.' },
  { id: 'soft', label: 'Soft', description: 'Gentle and reassuring.' },
  { id: 'energetic', label: 'Energetic', description: 'Upbeat and motivating.' },
  { id: 'confident', label: 'Confident', description: 'Assured and clear.' },
  { id: 'professional', label: 'Professional', description: 'Polished and composed.' },
  { id: 'funny', label: 'Funny', description: 'Light humour when it fits.' },
  { id: 'playful', label: 'Playful', description: 'Fun and spontaneous.' },
  { id: 'relaxed', label: 'Relaxed', description: 'Easy-going and casual.' },
  { id: 'motivational', label: 'Motivational', description: 'Encouraging and forward-looking.' },
  { id: 'caring', label: 'Caring', description: 'Emotionally attentive and supportive.' },
  { id: 'romantic', label: 'Romantic', description: 'Affectionate tone.', futureOnly: true },
  { id: 'story_teller', label: 'Story Teller', description: 'Narrative and immersive.' },
  { id: 'teacher', label: 'Teacher', description: 'Patient and explanatory.' },
  { id: 'coach', label: 'Coach', description: 'Direct accountability with care.' },
  { id: 'assistant', label: 'Assistant', description: 'Efficient and task-focused.' },
];

export const VOICE_GENDER_OPTIONS = [
  { id: 'female' as const, label: 'Female' },
  { id: 'male' as const, label: 'Male' },
  { id: 'neutral' as const, label: 'Neutral' },
];

export const VOICE_AGE_OPTIONS = [
  { id: 'teen' as const, label: 'Teen' },
  { id: 'young_adult' as const, label: 'Young Adult' },
  { id: 'adult' as const, label: 'Adult' },
  { id: 'mature' as const, label: 'Mature' },
];

export const SPEECH_SPEED_OPTIONS = [
  { id: 'slow' as const, label: 'Slow' },
  { id: 'normal' as const, label: 'Normal' },
  { id: 'fast' as const, label: 'Fast' },
];

export const WARMTH_OPTIONS = [
  { id: 'cool' as const, label: 'Cool' },
  { id: 'balanced' as const, label: 'Balanced' },
  { id: 'warm' as const, label: 'Warm' },
  { id: 'very_warm' as const, label: 'Very Warm' },
];

export function getSpeakingStyleById(id: SpeakingStyleId): SpeakingStyleOption | undefined {
  return SPEAKING_STYLES.find((s) => s.id === id);
}
