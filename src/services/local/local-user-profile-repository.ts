import { STORAGE_KEYS } from '../../constants/storage-keys';
import {
  CreateUserProfileInput,
  createId,
  createUserProfile,
  nowIso,
  UpdateUserProfileInput,
  UserProfile,
  createDefaultSubscription,
} from '../../types';
import { createDefaultCompanionControls } from '../../types/relationship-personality';
import { createDefaultVoiceIdentity } from '../../types/voice-identity';
import { createDefaultAvatarAppearance } from '../../types/avatar-appearance';
import { IStorageService, IUserProfileRepository } from '../contracts';

export class LocalUserProfileRepository implements IUserProfileRepository {
  constructor(private readonly storage: IStorageService) {}

  async getProfile(): Promise<UserProfile | null> {
    return this.storage.getItem<UserProfile>(STORAGE_KEYS.userProfile);
  }

  async saveProfile(profile: UserProfile): Promise<UserProfile> {
    const saved = { ...profile, updatedAt: nowIso() };
    await this.storage.setItem(STORAGE_KEYS.userProfile, saved);
    return saved;
  }

  async createProfile(input: CreateUserProfileInput): Promise<UserProfile> {
    const existing = await this.getProfile();
    if (existing) return existing;

    const timestamp = nowIso();
    const profile = createUserProfile(input, createId('user'), timestamp);
    await this.storage.setItem(STORAGE_KEYS.userProfile, profile);
    return profile;
  }

  async updateProfile(input: UpdateUserProfileInput): Promise<UserProfile> {
    const current = await this.getProfile();
    if (!current) throw new Error('User profile not found');

    const updated: UserProfile = {
      ...current,
      ...input,
      preferences: {
        ...current.preferences,
        ...input.preferences,
        companionControls: {
          ...(current.preferences.companionControls ?? createDefaultCompanionControls()),
          ...input.preferences?.companionControls,
        },
      },
      companion: {
        ...current.companion,
        ...input.companion,
      },
      companionIdentity: input.companionIdentity
        ? {
            ...current.companionIdentity,
            ...input.companionIdentity,
            voiceIdentity: input.companionIdentity.voiceIdentity
              ? {
                  ...createDefaultVoiceIdentity(),
                  ...(current.companionIdentity?.voiceIdentity ?? {}),
                  ...input.companionIdentity.voiceIdentity,
                }
              : current.companionIdentity?.voiceIdentity,
            appearance: input.companionIdentity.appearance
              ? {
                  ...createDefaultAvatarAppearance(current.companionIdentity?.avatarId),
                  ...(current.companionIdentity?.appearance ?? {}),
                  ...input.companionIdentity.appearance,
                }
              : current.companionIdentity?.appearance,
          }
        : current.companionIdentity,
      subscription: input.subscription
        ? { ...(current.subscription ?? createDefaultSubscription()), ...input.subscription }
        : current.subscription,
      updatedAt: nowIso(),
    };

    await this.storage.setItem(STORAGE_KEYS.userProfile, updated);
    return updated;
  }

  async clearProfile(): Promise<void> {
    await this.storage.removeItem(STORAGE_KEYS.userProfile);
  }
}
