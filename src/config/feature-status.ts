/**
 * Central feature visibility for beta launch.
 * hidden = not shown unless EXPO_PUBLIC_EXPERIMENTAL_FEATURES=true
 * coming_soon = roadmap only, never clickable
 */

export type FeatureStatus = 'stable' | 'beta' | 'hidden' | 'coming_soon';

export type FeatureKey =
  | 'chat'
  | 'cameraPhoto'
  | 'voiceNote'
  | 'memories'
  | 'pinnedMemories'
  | 'goals'
  | 'routineCoach'
  | 'dailyCheckIn'
  | 'journey'
  | 'companionStudio'
  | 'playAloud'
  | 'voiceCall'
  | 'safeCall'
  | 'musicRecognition'
  | 'galleryPicker'
  | 'videoPicker'
  | 'documents'
  | 'calendarAssistant'
  | 'emailAssistant'
  | 'weather'
  | 'newsDigest';

export const FEATURE_STATUS: Record<FeatureKey, FeatureStatus> = {
  chat: 'stable',
  cameraPhoto: 'stable',
  voiceNote: 'stable',
  memories: 'stable',
  pinnedMemories: 'stable',
  goals: 'stable',
  routineCoach: 'stable',
  dailyCheckIn: 'stable',
  journey: 'stable',
  companionStudio: 'stable',
  playAloud: 'stable',
  voiceCall: 'hidden',
  safeCall: 'hidden',
  musicRecognition: 'hidden',
  galleryPicker: 'hidden',
  videoPicker: 'hidden',
  documents: 'coming_soon',
  calendarAssistant: 'coming_soon',
  emailAssistant: 'coming_soon',
  weather: 'beta',
  newsDigest: 'stable',
};

export function isExperimentalFeaturesEnabled(): boolean {
  return process.env.EXPO_PUBLIC_EXPERIMENTAL_FEATURES === 'true';
}

export function getFeatureStatus(key: FeatureKey): FeatureStatus {
  return FEATURE_STATUS[key];
}

/** User-facing: show in UI and allow navigation */
export function isFeatureVisible(key: FeatureKey): boolean {
  const status = FEATURE_STATUS[key];
  if (status === 'coming_soon') return false;
  if (status === 'hidden') return isExperimentalFeaturesEnabled();
  return true;
}

/** Show in roadmap section only */
export function isFeatureRoadmap(key: FeatureKey): boolean {
  return FEATURE_STATUS[key] === 'coming_soon';
}

/** Smart assistants and prompt flows — single gate for assistant availability */
export function isAssistantFeatureAvailable(key?: FeatureKey): boolean {
  if (!key) return true;
  return isFeatureVisible(key);
}

const ROADMAP_ITEMS: Array<{ key: FeatureKey; label: string }> = [
  { key: 'voiceCall', label: 'Live voice calls' },
  { key: 'musicRecognition', label: 'Music recognition' },
  { key: 'galleryPicker', label: 'Photo library' },
  { key: 'videoPicker', label: 'Video messages' },
  { key: 'documents', label: 'Document chat' },
  { key: 'calendarAssistant', label: 'Calendar assistant' },
  { key: 'emailAssistant', label: 'Email assistant' },
];

export function getRoadmapFeatures(): Array<{ key: FeatureKey; label: string }> {
  return ROADMAP_ITEMS.filter(
    (item) =>
      isFeatureRoadmap(item.key) ||
      (FEATURE_STATUS[item.key] === 'hidden' && !isExperimentalFeaturesEnabled()),
  );
}
