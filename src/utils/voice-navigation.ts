import { isFeatureVisible } from '../config/feature-status';
import { RootStackParamList } from '../navigation/types';

type VoiceNavigator = {
  navigate: (
    screen: 'VoiceConversation',
    params?: RootStackParamList['VoiceConversation'],
  ) => void;
};

export type VoiceNavigationResult =
  | { ok: true }
  | { ok: false; reason: 'voice_unavailable' | 'safe_unavailable'; message: string; hint: string };

export const VOICE_UNAVAILABLE_COPY = {
  voice: {
    message: 'Live voice calls are not available in this build yet.',
    hint: 'You can still record voice notes from the mic button in chat — I will listen and reply in text.',
  },
  safe: {
    message: 'Safe Call is not available in this build yet.',
    hint: 'You can still talk to me in chat anytime. If you are in immediate danger, contact local emergency services.',
  },
} as const;

export function canStartLiveVoice(): boolean {
  return isFeatureVisible('voiceCall');
}

export function canStartSafeCall(): boolean {
  return isFeatureVisible('safeCall');
}

export function openVoiceConversation(
  navigation: VoiceNavigator,
  options?: { safe?: boolean; autoStart?: boolean },
): VoiceNavigationResult {
  const safe = options?.safe ?? false;
  if (safe && !canStartSafeCall()) {
    return { ok: false, reason: 'safe_unavailable', ...VOICE_UNAVAILABLE_COPY.safe };
  }
  if (!safe && !canStartLiveVoice()) {
    return { ok: false, reason: 'voice_unavailable', ...VOICE_UNAVAILABLE_COPY.voice };
  }

  navigation.navigate('VoiceConversation', {
    autoStart: options?.autoStart ?? true,
    safe,
  });
  return { ok: true };
}

export function liveVoiceUnavailableMessage(safe = false): string {
  const copy = safe ? VOICE_UNAVAILABLE_COPY.safe : VOICE_UNAVAILABLE_COPY.voice;
  return `${copy.message} ${copy.hint}`;
}
