import { getDefaultAccent } from '../../constants/voice-accents';
import { getAllAccentById } from '../../constants/voice-accents-extended';
import { getSpeakingStyleById } from '../../constants/voice-speaking-styles';
import { CompanionIdentity } from '../../constants/companion-identity';
import { UserProfile } from '../../types';
import { VoicePersonality } from '../../types/user-profile';
import {
  SpeechSpeed,
  VoiceIdentity,
  VoiceSpeechConfig,
  WarmthLevel,
} from '../../types/voice-identity';
import { VOICE_PERSONALITY_PROFILES } from '../../types/voice-call';
import {
  CompanionControlPreferences,
  PERSONALITY_SLIDER_KEYS,
} from '../../types/relationship-personality';

const GENDER_VOICE_MAP: Record<VoiceIdentity['gender'], string[]> = {
  female: ['nova', 'shimmer', 'coral', 'sage'],
  male: ['onyx', 'echo', 'fable', 'ash'],
  neutral: ['alloy', 'nova', 'echo', 'sage'],
};

const SPEED_RATE: Record<SpeechSpeed, number> = {
  slow: 0.82,
  normal: 0.95,
  fast: 1.1,
};

const WARMTH_PITCH: Record<WarmthLevel, number> = {
  cool: 0.92,
  balanced: 1.0,
  warm: 1.04,
  very_warm: 1.08,
};

const STYLE_RATE: Record<string, number> = {
  calm: 0.88,
  soft: 0.85,
  relaxed: 0.9,
  friendly: 0.96,
  caring: 0.9,
  energetic: 1.1,
  motivational: 1.08,
  confident: 1.05,
  professional: 1.0,
  funny: 1.06,
  playful: 1.08,
  story_teller: 0.92,
  teacher: 0.94,
  coach: 1.04,
  assistant: 1.02,
};

const AGE_PITCH: Record<VoiceIdentity['ageStyle'], number> = {
  teen: 1.1,
  young_adult: 1.04,
  adult: 1.0,
  mature: 0.94,
};

export function resolveVoiceIdentity(profile: UserProfile): VoiceIdentity {
  const identity = profile.companionIdentity;
  if (identity?.voiceIdentity) return identity.voiceIdentity;
  return legacyVoicePersonalityToIdentity(profile.preferences.voicePersonality);
}

export function legacyVoicePersonalityToIdentity(personality: VoicePersonality): VoiceIdentity {
  const map: Record<VoicePersonality, Partial<VoiceIdentity>> = {
    warm_calm: { gender: 'female', speakingStyle: 'calm', warmth: 'warm', accentId: 'international_english' },
    gentle: { gender: 'female', speakingStyle: 'soft', warmth: 'very_warm', accentId: 'british_rp' },
    energetic: { gender: 'female', speakingStyle: 'energetic', warmth: 'balanced', accentId: 'american_general' },
    direct: { gender: 'male', speakingStyle: 'confident', warmth: 'cool', accentId: 'american_general' },
  };
  return {
    gender: 'female',
    ageStyle: 'young_adult',
    speakingStyle: 'calm',
    speechSpeed: 'normal',
    warmth: 'warm',
    accentId: 'international_english',
    ...map[personality],
  };
}

export function resolveVoiceSpeechConfig(
  identity: VoiceIdentity,
  legacyPersonality?: VoicePersonality,
): VoiceSpeechConfig {
  const accent = getAllAccentById(identity.accentId) ?? getDefaultAccent();
  const style = getSpeakingStyleById(identity.speakingStyle);
  const genderVoices = GENDER_VOICE_MAP[identity.gender];
  const accentHint = accent.openAiVoiceHint ?? 'nova';
  const openAiVoiceId = genderVoices.includes(accentHint)
    ? accentHint
    : genderVoices[0] ?? accentHint;

  const legacy = legacyPersonality
    ? VOICE_PERSONALITY_PROFILES.find((p) => p.id === legacyPersonality)
    : undefined;

  const baseRate = SPEED_RATE[identity.speechSpeed];
  const styleRate = STYLE_RATE[identity.speakingStyle] ?? 1.0;
  // Prefer Studio identity rate/pitch; only fall back to legacy when no identity-driven values apply.
  const expoRate = baseRate * styleRate;
  const expoPitch = WARMTH_PITCH[identity.warmth] * AGE_PITCH[identity.ageStyle];

  const instructions = [
    `Speak with a ${accent.label} accent influence.`,
    style ? `${style.label} speaking style.` : '',
    `${identity.gender} voice, ${identity.ageStyle.replace('_', ' ')} age style.`,
  ]
    .filter(Boolean)
    .join(' ');

  return {
    // OpenAI voice id: accent hint filtered by gender. Legacy personality only fills gaps.
    openAiVoiceId: openAiVoiceId || legacy?.ttsVoiceId || 'nova',
    expoPitch: Number.isFinite(expoPitch) ? expoPitch : legacy?.expoPitch ?? 1,
    expoRate: Number.isFinite(expoRate) ? expoRate : legacy?.expoRate ?? 0.95,
    speedMultiplier: Number.isFinite(expoRate) ? expoRate : legacy?.expoRate ?? 0.95,
    instructions,
  };
}

export function voiceIdentityToPromptBlock(identity: VoiceIdentity, companionIdentity?: CompanionIdentity): string {
  const accent = getAllAccentById(identity.accentId);
  const style = getSpeakingStyleById(identity.speakingStyle);

  return [
    '## Voice identity (match in written replies)',
    `Gender presentation: ${identity.gender}`,
    `Age style: ${identity.ageStyle.replace('_', ' ')}`,
    `Speaking style: ${style?.label ?? identity.speakingStyle}`,
    `Accent: ${accent?.label ?? identity.accentId}`,
    `Speech pace: ${identity.speechSpeed}`,
    `Warmth: ${identity.warmth.replace('_', ' ')}`,
    companionIdentity?.personalityStyle
      ? `Personality style: ${companionIdentity.personalityStyle}`
      : '',
    companionIdentity?.replyLength ? `Preferred reply length: ${companionIdentity.replyLength}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function companionControlsToPromptBlock(controls: CompanionControlPreferences): string {
  const lines = [
    '## Personality sliders (honour these in every reply)',
    ...PERSONALITY_SLIDER_KEYS.map(
      (item) => `${item.label}: ${Math.round((controls[item.key] as number) * 100)}%`,
    ),
    `Memory level: ${controls.memoryLevel}`,
  ];
  return lines.join('\n');
}
