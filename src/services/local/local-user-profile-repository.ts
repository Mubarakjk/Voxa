import { STORAGE_KEYS } from '../../constants/storage-keys';
import {
  CreateUserProfileInput,
  createId,
  createUserProfile,
  nowIso,
  UpdateUserProfileInput,
  UserProfile,
} from '../../types';
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
      },
      companion: {
        ...current.companion,
        ...input.companion,
      },
      updatedAt: nowIso(),
    };

    await this.storage.setItem(STORAGE_KEYS.userProfile, updated);
    return updated;
  }

  async clearProfile(): Promise<void> {
    await this.storage.removeItem(STORAGE_KEYS.userProfile);
  }
}
