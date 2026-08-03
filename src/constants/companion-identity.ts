import { CompanionModeId } from '../types';
import { VoicePersonality } from '../types/user-profile';
import { AvatarAppearanceState, createDefaultAvatarAppearance } from '../types/avatar-appearance';
import { VoiceIdentity, createDefaultVoiceIdentity } from '../types/voice-identity';

export type VoxaAvatarId = 'orb_purple' | 'orb_blue' | 'orb_emerald' | 'orb_rose' | 'orb_gold';

/** Legacy ids kept for saved profiles; labels map to the product personality set. */
export type PersonalityStyleId =
  | 'warm'
  | 'balanced'
  | 'direct'
  | 'playful'
  | 'reflective'
  | 'motivational'
  | 'curious'
  | 'teacher';

export type ReplyLengthPreference = 'short' | 'balanced' | 'detailed';

export type CompanionIdentity = {
  voxaName: string;
  avatarId: VoxaAvatarId;
  personalityStyle: PersonalityStyleId;
  defaultMode: CompanionModeId;
  voiceStyle: VoicePersonality;
  replyLength: ReplyLengthPreference;
  /** Full voice identity from Companion Studio. */
  voiceIdentity?: VoiceIdentity;
  /** Avatar appearance with future customization slots. */
  appearance?: AvatarAppearanceState;
};

export const VOXA_AVATARS: Array<{ id: VoxaAvatarId; label: string; accent: string }> = [
  { id: 'orb_purple', label: 'Amethyst', accent: '#A78BFA' },
  { id: 'orb_blue', label: 'Sapphire', accent: '#38BDF8' },
  { id: 'orb_emerald', label: 'Emerald', accent: '#34D399' },
  { id: 'orb_rose', label: 'Rose', accent: '#F472B6' },
  { id: 'orb_gold', label: 'Gold', accent: '#FBBF24' },
];

export const PERSONALITY_STYLES: Array<{ id: PersonalityStyleId; label: string; description: string }> = [
  { id: 'warm', label: 'Supportive', description: 'Gentle, caring, emotionally attuned' },
  { id: 'playful', label: 'Funny', description: 'Light humour without losing care' },
  { id: 'reflective', label: 'Calm', description: 'Steady, grounded, low-pressure' },
  { id: 'motivational', label: 'Motivational', description: 'Energising and encouraging' },
  { id: 'direct', label: 'Professional', description: 'Clear, honest, no fluff' },
  { id: 'curious', label: 'Curious', description: 'Asks thoughtful questions' },
  { id: 'teacher', label: 'Teacher', description: 'Explains clearly, scaffolds learning' },
  { id: 'balanced', label: 'Balanced', description: 'Natural mix — styles can blend' },
];

export function personalityStylePromptBlock(style: PersonalityStyleId | undefined): string {
  const id = style ?? 'warm';
  const guidance: Record<PersonalityStyleId, string> = {
    warm: 'Be supportive and emotionally attuned. Soften hard truths with care.',
    playful: 'Use light humour when it fits. Stay kind — never mock.',
    reflective: 'Stay calm and grounded. Prefer short, steady replies.',
    motivational: 'Encourage action with warmth. Celebrate effort, not just outcomes.',
    direct: 'Be professional and clear. Lead with the point, then context.',
    curious: 'Ask one sharp follow-up when it helps. Show genuine interest.',
    teacher: 'Explain step-by-step. Check understanding. Avoid jargon dumps.',
    balanced: 'Blend support and clarity. Match their energy.',
  };
  const label = PERSONALITY_STYLES.find((s) => s.id === id)?.label ?? id;
  return [`## Personality style: ${label}`, guidance[id]].join('\n');
}

export const REPLY_LENGTH_OPTIONS: Array<{ id: ReplyLengthPreference; label: string }> = [
  { id: 'short', label: 'Short' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'detailed', label: 'Detailed' },
];

export function createDefaultCompanionIdentity(defaultMode: CompanionModeId = 'friend'): CompanionIdentity {
  return {
    voxaName: 'Voxa',
    avatarId: 'orb_purple',
    personalityStyle: 'warm',
    defaultMode,
    voiceStyle: 'warm_calm',
    replyLength: 'balanced',
    voiceIdentity: createDefaultVoiceIdentity(),
    appearance: createDefaultAvatarAppearance('orb_purple'),
  };
}

export function getAvatarAccent(avatarId: VoxaAvatarId): string {
  return VOXA_AVATARS.find((a) => a.id === avatarId)?.accent ?? '#2DD4BF';
}
