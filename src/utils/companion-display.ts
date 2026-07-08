import { UserProfile } from '../types';
import { createDefaultCompanionIdentity, getAvatarAccent } from '../constants/companion-identity';

export function getVoxaDisplayName(profile: UserProfile | null): string {
  return profile?.companionIdentity?.voxaName?.trim() || 'Voxa';
}

export function getVoxaAvatarTint(profile: UserProfile | null): string {
  const avatarId = profile?.companionIdentity?.avatarId ?? createDefaultCompanionIdentity().avatarId;
  return getAvatarAccent(avatarId);
}

export function getCompanionIdentity(profile: UserProfile) {
  return profile.companionIdentity ?? createDefaultCompanionIdentity(profile.companion.defaultMode);
}
