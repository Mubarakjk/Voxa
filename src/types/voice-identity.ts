export type VoiceGender = 'female' | 'male' | 'neutral';

export type VoiceAgeStyle = 'teen' | 'young_adult' | 'adult' | 'mature';

export type SpeechSpeed = 'slow' | 'normal' | 'fast';

export type WarmthLevel = 'cool' | 'balanced' | 'warm' | 'very_warm';

export type SpeakingStyleId =
  | 'calm'
  | 'friendly'
  | 'soft'
  | 'energetic'
  | 'confident'
  | 'professional'
  | 'funny'
  | 'playful'
  | 'relaxed'
  | 'motivational'
  | 'caring'
  | 'romantic'
  | 'story_teller'
  | 'teacher'
  | 'coach'
  | 'assistant';

export type VoiceIdentity = {
  gender: VoiceGender;
  ageStyle: VoiceAgeStyle;
  speakingStyle: SpeakingStyleId;
  speechSpeed: SpeechSpeed;
  warmth: WarmthLevel;
  accentId: string;
};

export type VoiceSpeechConfig = {
  openAiVoiceId: string;
  expoPitch: number;
  expoRate: number;
  speedMultiplier: number;
  instructions?: string;
};

export const VOICE_PREVIEW_SCRIPT = `Hi, I'm Voxa.

It's really nice to meet you.

I'm excited to help you every day.`;

export function createDefaultVoiceIdentity(): VoiceIdentity {
  return {
    gender: 'female',
    ageStyle: 'young_adult',
    speakingStyle: 'calm',
    speechSpeed: 'normal',
    warmth: 'warm',
    accentId: 'international_english',
  };
}
