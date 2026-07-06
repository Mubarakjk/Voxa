import { CompanionModeId, CompanionModePreference } from './companion-mode';
import { EntityId, ISODateString, Timestamps } from './common';

export type VoicePersonality = 'warm_calm' | 'energetic' | 'direct' | 'gentle';

export type CheckInStyle = 'off' | 'gentle' | 'proactive';

export type UserPreferences = {
  voicePersonality: VoicePersonality;
  memoryEnabled: boolean;
  checkInStyle: CheckInStyle;
  proactiveVoiceCalls: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  hapticsEnabled: boolean;
  ambientGlowEnabled: boolean;
};

export type UserProfile = Timestamps & {
  id: EntityId;
  displayName: string;
  timezone: string;
  onboardingComplete: boolean;
  preferences: UserPreferences;
  companion: CompanionModePreference;
};

export type CreateUserProfileInput = {
  displayName: string;
  timezone?: string;
};

export type UpdateUserProfileInput = Partial<
  Pick<UserProfile, 'displayName' | 'timezone' | 'onboardingComplete' | 'preferences' | 'companion'>
>;

export function createDefaultPreferences(): UserPreferences {
  return {
    voicePersonality: 'warm_calm',
    memoryEnabled: true,
    checkInStyle: 'gentle',
    proactiveVoiceCalls: false,
    hapticsEnabled: true,
    ambientGlowEnabled: true,
  };
}

export function createDefaultCompanionPreference(): CompanionModePreference {
  return {
    defaultMode: 'friend',
    lastUsedMode: 'friend',
  };
}

export function createUserProfile(input: CreateUserProfileInput, id: EntityId, createdAt: ISODateString): UserProfile {
  return {
    id,
    displayName: input.displayName,
    timezone: input.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    onboardingComplete: false,
    preferences: createDefaultPreferences(),
    companion: createDefaultCompanionPreference(),
    createdAt,
    updatedAt: createdAt,
  };
}
