import { CompanionModeId } from '../types';
import { VoicePersonality } from '../types/user-profile';
import { AvatarAppearanceState, createDefaultAvatarAppearance } from '../types/avatar-appearance';
import { VoiceIdentity, createDefaultVoiceIdentity } from '../types/voice-identity';

export type VoxaAvatarId = 'orb_purple' | 'orb_blue' | 'orb_emerald' | 'orb_rose' | 'orb_gold';

export type PersonalityStyleId = 'warm' | 'balanced' | 'direct' | 'playful' | 'reflective';

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
  { id: 'orb_purple', label: 'Amethyst', accent: '#8B7CF6' },
  { id: 'orb_blue', label: 'Sapphire', accent: '#6366F1' },
  { id: 'orb_emerald', label: 'Emerald', accent: '#34D399' },
  { id: 'orb_rose', label: 'Rose', accent: '#F472B6' },
  { id: 'orb_gold', label: 'Gold', accent: '#FBBF24' },
];

export const PERSONALITY_STYLES: Array<{ id: PersonalityStyleId; label: string; description: string }> = [
  { id: 'warm', label: 'Warm', description: 'Gentle, caring, emotionally attuned' },
  { id: 'balanced', label: 'Balanced', description: 'Natural mix of support and clarity' },
  { id: 'direct', label: 'Direct', description: 'Clear, honest, no fluff' },
  { id: 'playful', label: 'Playful', description: 'Light humour and energy' },
  { id: 'reflective', label: 'Reflective', description: 'Thoughtful and introspective' },
];

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
  return VOXA_AVATARS.find((a) => a.id === avatarId)?.accent ?? '#8B7CF6';
}
