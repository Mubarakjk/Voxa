import { CompanionIdentity } from '../../constants/companion-identity';
import { getAccentById } from '../../constants/voice-accents';
import { getSpeakingStyleById } from '../../constants/voice-speaking-styles';
import { UserProfile, UpdateUserProfileInput } from '../../types';
import { CompanionControlPreferences } from '../../types/relationship-personality';
import { VoiceIdentity, createDefaultVoiceIdentity } from '../../types/voice-identity';
import { AvatarAppearanceState } from '../../types/avatar-appearance';
import { getCompanionIdentity } from '../../utils/companion-display';

export type CompanionStudioSnapshot = {
  voxaName: string;
  voiceLabel: string;
  accentLabel: string;
  personalityLabel: string;
  speakingStyleLabel: string;
  avatarAccent: string;
};

export function buildCompanionStudioSnapshot(profile: UserProfile): CompanionStudioSnapshot {
  const identity = getCompanionIdentity(profile);
  const voice = identity.voiceIdentity;
  const accent = voice ? getAccentById(voice.accentId) : undefined;
  const style = voice ? getSpeakingStyleById(voice.speakingStyle) : undefined;

  return {
    voxaName: identity.voxaName,
    voiceLabel: voice ? `${voice.gender} · ${voice.ageStyle.replace('_', ' ')}` : identity.voiceStyle,
    accentLabel: accent?.label ?? 'International English',
    personalityLabel: identity.personalityStyle,
    speakingStyleLabel: style?.label ?? 'Calm',
    avatarAccent: identity.avatarId,
  };
}

export function buildStudioSavePayload(input: {
  profile: UserProfile;
  voxaName?: string;
  avatarId?: CompanionIdentity['avatarId'];
  personalityStyle?: CompanionIdentity['personalityStyle'];
  defaultMode?: CompanionIdentity['defaultMode'];
  replyLength?: CompanionIdentity['replyLength'];
  voiceStyle?: CompanionIdentity['voiceStyle'];
  voiceIdentity?: Partial<VoiceIdentity>;
  appearance?: Partial<AvatarAppearanceState>;
  companionControls?: Partial<CompanionControlPreferences>;
}): UpdateUserProfileInput {
  const current = getCompanionIdentity(input.profile);
  const mergedVoice: VoiceIdentity = {
    ...createDefaultVoiceIdentity(),
    ...current.voiceIdentity,
    ...input.voiceIdentity,
  };

  return {
    preferences: {
      ...input.profile.preferences,
      voicePersonality: input.voiceStyle ?? current.voiceStyle,
      companionControls: {
        ...(input.profile.preferences.companionControls ?? {}),
        ...input.companionControls,
      } as CompanionControlPreferences,
    },
    companion: input.defaultMode
      ? { ...input.profile.companion, defaultMode: input.defaultMode }
      : input.profile.companion,
    companionIdentity: {
      ...current,
      voxaName: input.voxaName?.trim() || current.voxaName,
      avatarId: input.avatarId ?? current.avatarId,
      personalityStyle: input.personalityStyle ?? current.personalityStyle,
      defaultMode: input.defaultMode ?? current.defaultMode,
      replyLength: input.replyLength ?? current.replyLength,
      voiceStyle: input.voiceStyle ?? current.voiceStyle,
      voiceIdentity: mergedVoice,
      appearance: {
        ...current.appearance,
        avatarId: input.avatarId ?? current.appearance?.avatarId ?? current.avatarId,
        ...input.appearance,
      },
    },
  };
}
