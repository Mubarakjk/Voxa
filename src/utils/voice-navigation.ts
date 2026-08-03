import { isFeatureVisible } from '../config/feature-status';
import { isRealtimeVoiceEnabled } from '../config/release-voice';
import { RootStackParamList } from '../navigation/types';

type VoiceNavigator = {
  navigate: (
    screen: 'VoiceConversation' | 'RealtimeCall',
    params?: RootStackParamList['VoiceConversation'] | RootStackParamList['RealtimeCall'],
  ) => void;
};

export type VoiceNavigationResult =
  | { ok: true }
  | { ok: false; reason: 'voice_unavailable' | 'safe_unavailable'; message: string; hint: string };

export const VOICE_UNAVAILABLE_COPY = {
  voice: {
    message: 'Live voice calls are not available in this build yet.',
    hint: 'Text chat still works — enable realtime voice in a development build when ready.',
  },
  safe: {
    message: 'Safe Call is not available in this build yet.',
    hint: 'You can still talk to me in chat anytime. If you are in immediate danger, contact local emergency services.',
  },
} as const;

/** True when the WebRTC Realtime Call Voxa path is enabled. */
export function canStartLiveVoice(): boolean {
  return isRealtimeVoiceEnabled();
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
  if (safe) {
    navigation.navigate('VoiceConversation', {
      autoStart: options?.autoStart ?? true,
      safe: true,
    });
    return { ok: true };
  }

  if (!canStartLiveVoice()) {
    return { ok: false, reason: 'voice_unavailable', ...VOICE_UNAVAILABLE_COPY.voice };
  }

  navigation.navigate('RealtimeCall', {
    autoStart: options?.autoStart ?? true,
  });
  return { ok: true };
}

/** Safe fallback when a deep link targets a disabled call screen. */
export function redirectDisabledVoiceDeepLink(navigation: {
  navigate: (...args: any[]) => void;
  canGoBack?: () => boolean;
  goBack?: () => void;
}) {
  navigation.navigate('MainTabs', { screen: 'Talk' });
}

export function liveVoiceUnavailableMessage(safe = false): string {
  const copy = safe ? VOICE_UNAVAILABLE_COPY.safe : VOICE_UNAVAILABLE_COPY.voice;
  return `${copy.message} ${copy.hint}`;
}
