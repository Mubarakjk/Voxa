import { CompanionModePreference } from './companion-mode';
import { createDefaultCompanionControls } from './relationship-personality';
import { CompanionIdentity, createDefaultCompanionIdentity } from '../constants/companion-identity';
import { EntityId, ISODateString, Timestamps } from './common';
import { UserSubscription, createDefaultSubscription } from './subscription';

export type VoicePersonality = 'warm_calm' | 'energetic' | 'direct' | 'gentle';

export type CheckInStyle = 'off' | 'gentle' | 'proactive';

export type NotificationPreference = 'off' | 'gentle' | 'proactive';

export type OnboardingData = {
  age?: number;
  mainReason?: string;
  favoriteTopics?: string[];
  sleepSchedule?: { wake: string; sleep: string };
  goalInterests?: string[];
  wantsWorkout?: boolean;
  wantsStudy?: boolean;
  wantsBusiness?: boolean;
  notificationPreference?: NotificationPreference;
  checkInFrequency?: 'daily' | 'weekly' | 'custom';
};

export type UserPreferences = {
  voicePersonality: VoicePersonality;
  memoryEnabled: boolean;
  checkInStyle: CheckInStyle;
  proactiveVoiceCalls: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  hapticsEnabled: boolean;
  ambientGlowEnabled: boolean;
  theme?: 'dark' | 'system';
  morningGreetingEnabled?: boolean;
  eveningReflectionEnabled?: boolean;
  /**
   * When true (default), Voxa speaks new chat replies aloud.
   * Does not enable microphone recording.
   */
  voxaSpeaksReplies?: boolean;
  /** Fine-grained companion behaviour controls. */
  companionControls?: import('./relationship-personality').CompanionControlPreferences;
};

export type UserProfile = Timestamps & {
  id: EntityId;
  displayName: string;
  email?: string;
  age?: number;
  mainReason?: string;
  timezone: string;
  onboardingComplete: boolean;
  preferences: UserPreferences;
  companion: CompanionModePreference;
  companionIdentity?: CompanionIdentity;
  onboarding?: OnboardingData;
  subscription?: UserSubscription;
};

export type CreateUserProfileInput = {
  displayName: string;
  email?: string;
  timezone?: string;
};

export type UpdateUserProfileInput = Partial<
  Pick<
    UserProfile,
    | 'displayName'
    | 'email'
    | 'age'
    | 'mainReason'
    | 'timezone'
    | 'onboardingComplete'
    | 'preferences'
    | 'companion'
    | 'companionIdentity'
    | 'onboarding'
    | 'subscription'
  >
>;

export function createDefaultPreferences(): UserPreferences {
  return {
    voicePersonality: 'warm_calm',
    memoryEnabled: true,
    checkInStyle: 'gentle',
    proactiveVoiceCalls: false,
    hapticsEnabled: true,
    ambientGlowEnabled: true,
    theme: 'dark',
    morningGreetingEnabled: true,
    eveningReflectionEnabled: true,
    voxaSpeaksReplies: true,
    companionControls: createDefaultCompanionControls(),
  };
}

export function createDefaultCompanionPreference(): CompanionModePreference {
  return {
    defaultMode: 'friend',
    lastUsedMode: 'friend',
  };
}

export function createUserProfile(
  input: CreateUserProfileInput,
  id: EntityId,
  createdAt: ISODateString,
): UserProfile {
  return {
    id,
    displayName: input.displayName,
    email: input.email,
    timezone: input.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    onboardingComplete: false,
    preferences: createDefaultPreferences(),
    companion: createDefaultCompanionPreference(),
    companionIdentity: createDefaultCompanionIdentity(),
    subscription: createDefaultSubscription(),
    createdAt,
    updatedAt: createdAt,
  };
}

export function mergePreferences(
  current: UserPreferences,
  patch?: Partial<UserPreferences>,
): UserPreferences {
  return { ...current, ...patch };
}

export function mergeCompanion(
  current: CompanionModePreference,
  patch?: Partial<CompanionModePreference>,
): CompanionModePreference {
  return { ...current, ...patch };
}

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
};
