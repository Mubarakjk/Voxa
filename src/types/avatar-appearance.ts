import { VoxaAvatarId } from '../constants/companion-identity';

/** Current simple avatar selection. */
export type AvatarAppearanceConfig = {
  avatarId: VoxaAvatarId;
};

/** Future 3D / animated avatar architecture — not wired to rendering yet. */
export type FutureAvatarCustomization = {
  hair?: string;
  skinTone?: string;
  eyes?: string;
  clothes?: string;
  accessories?: string[];
  animations?: string[];
  expressions?: string[];
  idleBehaviour?: string;
};

export type AvatarAppearanceState = AvatarAppearanceConfig & {
  future?: FutureAvatarCustomization;
};

export const FUTURE_AVATAR_CATEGORIES = [
  { id: 'hair', label: 'Hair', status: 'coming_soon' as const },
  { id: 'skin_tone', label: 'Skin tone', status: 'coming_soon' as const },
  { id: 'eyes', label: 'Eyes', status: 'coming_soon' as const },
  { id: 'clothes', label: 'Clothes', status: 'coming_soon' as const },
  { id: 'accessories', label: 'Accessories', status: 'coming_soon' as const },
  { id: 'animations', label: 'Animations', status: 'coming_soon' as const },
  { id: 'expressions', label: 'Expressions', status: 'coming_soon' as const },
  { id: 'idle_behaviour', label: 'Idle behaviour', status: 'coming_soon' as const },
];

export function createDefaultAvatarAppearance(avatarId: VoxaAvatarId = 'orb_purple'): AvatarAppearanceState {
  return { avatarId, future: {} };
}
