/**
 * Central release gates for voice / calling surfaces.
 * Code for these features stays in the repo; UI and startup stay off when flags are false.
 *
 * Release defaults (App Store / TestFlight):
 *   EXPO_PUBLIC_REALTIME_VOICE_ENABLED=false
 *   EXPO_PUBLIC_SCHEDULED_CALLS_ENABLED=false
 *   EXPO_PUBLIC_VOICE_NOTES_ENABLED=false
 *   EXPO_PUBLIC_MICROPHONE_CHAT_ENABLED=false
 */

function envTrue(key: string): boolean {
  return process.env[key] === 'true';
}

/** Realtime WebRTC “Call Voxa” — requires native build. */
export function isRealtimeVoiceEnabled(): boolean {
  return envTrue('EXPO_PUBLIC_REALTIME_VOICE_ENABLED');
}

/** Scheduled companion call notifications + scheduling UI. */
export function isScheduledCallsEnabled(): boolean {
  return envTrue('EXPO_PUBLIC_SCHEDULED_CALLS_ENABLED');
}

/** Voice-note recording attached to chat messages. */
export function isVoiceNotesEnabled(): boolean {
  return envTrue('EXPO_PUBLIC_VOICE_NOTES_ENABLED');
}

/**
 * In-chat microphone / live mic chat.
 * Separate from TTS “Voxa speaks replies”.
 */
export function isMicrophoneChatEnabled(): boolean {
  return envTrue('EXPO_PUBLIC_MICROPHONE_CHAT_ENABLED');
}

/** Any live calling surface (realtime or legacy experimental call). */
export function isLiveCallingUiEnabled(): boolean {
  return isRealtimeVoiceEnabled();
}

/** True when any mic-requesting chat surface should appear. */
export function isMicrophoneUiEnabled(): boolean {
  return isVoiceNotesEnabled() || isMicrophoneChatEnabled() || isRealtimeVoiceEnabled();
}

export type ReleaseVoiceGateSnapshot = {
  realtimeVoice: boolean;
  scheduledCalls: boolean;
  voiceNotes: boolean;
  microphoneChat: boolean;
};

export function getReleaseVoiceGateSnapshot(): ReleaseVoiceGateSnapshot {
  return {
    realtimeVoice: isRealtimeVoiceEnabled(),
    scheduledCalls: isScheduledCallsEnabled(),
    voiceNotes: isVoiceNotesEnabled(),
    microphoneChat: isMicrophoneChatEnabled(),
  };
}
