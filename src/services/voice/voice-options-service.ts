import { AppState, AppStateStatus } from 'react-native';

import {
  getVoiceOption,
  VoiceOption,
  VoiceOptionId,
  listVoiceOptions,
} from '../../constants/voice-options';
import { STORAGE_KEYS } from '../../constants/storage-keys';
import { UserProfile } from '../../types';
import { VoiceSpeechConfig } from '../../types/voice-identity';
import { IStorageService } from '../contracts';
import { trackEvent } from '../analytics/analytics-service';
import {
  getSpeechOwner,
  speakExclusive,
  stopAllSpeech,
  subscribeSpeechOwner,
} from './speech-playback-coordinator';

let previewingId: string | null = null;
let appStateSub: { remove: () => void } | null = null;

function ensureBackgroundStop() {
  if (appStateSub) return;
  appStateSub = AppState.addEventListener('change', (state: AppStateStatus) => {
    if (state !== 'active' && previewingId) {
      void stopVoiceOptionPreview();
    }
  });
}

export function voiceOptionToSpeechConfig(option: VoiceOption): VoiceSpeechConfig {
  return {
    openAiVoiceId: option.openAiVoiceId,
    expoPitch: option.expoPitch,
    expoRate: option.expoRate,
    speedMultiplier: option.expoRate,
    instructions: `${option.shortDescription}. ${option.toneNote}.`,
  };
}

export async function getSelectedVoiceOptionId(
  storage: IStorageService,
  profile: UserProfile | null,
): Promise<VoiceOptionId> {
  const fromProfile = profile?.preferences.selectedVoiceOptionId;
  if (fromProfile) return getVoiceOption(fromProfile).id;
  const stored = await storage.getItem<string>(STORAGE_KEYS.selectedVoiceOptionId);
  return getVoiceOption(stored).id;
}

export async function setSelectedVoiceOptionId(
  storage: IStorageService,
  voiceId: VoiceOptionId,
): Promise<void> {
  await storage.setItem(STORAGE_KEYS.selectedVoiceOptionId, voiceId);
  trackEvent('voice_selected', { voice: voiceId });
}

export function availableVoices(isPro: boolean): VoiceOption[] {
  return listVoiceOptions(isPro);
}

export function getPreviewingVoiceId() {
  return previewingId;
}

export function subscribePreviewState(listener: () => void) {
  return subscribeSpeechOwner(listener);
}

export async function previewVoiceOption(option: VoiceOption): Promise<void> {
  ensureBackgroundStop();

  if (previewingId === option.id && getSpeechOwner() === 'preview') {
    await stopVoiceOptionPreview();
    return;
  }

  previewingId = option.id;
  trackEvent('voice_preview_started', { voice: option.id });
  try {
    await speakExclusive('preview', option.previewText, voiceOptionToSpeechConfig(option));
  } finally {
    if (previewingId === option.id) previewingId = null;
  }
}

export async function stopVoiceOptionPreview(): Promise<void> {
  previewingId = null;
  await stopAllSpeech();
}

export function isVoiceOptionPreviewPlaying(): boolean {
  return Boolean(previewingId) && getSpeechOwner() === 'preview';
}

/** Prefer curated voice option for chat speech when set. */
export function resolveSpeechConfigForProfile(profile: UserProfile): VoiceSpeechConfig {
  const option = getVoiceOption(profile.preferences.selectedVoiceOptionId);
  return voiceOptionToSpeechConfig(option);
}
