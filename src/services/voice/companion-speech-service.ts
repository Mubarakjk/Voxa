import { UserProfile } from '../../types';
import { resolveSpeechConfigForProfile } from './voice-options-service';
import { speakExclusive, stopAllSpeech, getSpeechOwner } from './speech-playback-coordinator';
import { voiceNotePlayerService } from '../audio/voice-note-player-service';

/** Strip markdown / UI noise so spoken replies sound natural. */
export function textForSpeech(raw: string): string {
  return raw
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#>*_~]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

let speakingMessageId: string | null = null;
let speakInFlight: Promise<void> | null = null;
let speakInFlightMessageId: string | null = null;

export function getSpeakingMessageId() {
  return speakingMessageId;
}

export function isCompanionSpeaking() {
  return getSpeechOwner() === 'companion' || getSpeechOwner() === 'bubble';
}

export async function stopCompanionSpeech() {
  speakingMessageId = null;
  speakInFlight = null;
  speakInFlightMessageId = null;
  await stopAllSpeech();
  await voiceNotePlayerService.stop();
}

/**
 * Speak a companion reply aloud using the curated selected VoiceOption.
 * OpenAI TTS is preferred when configured; Hybrid TTS falls back to on-device speech
 * with the same pitch/rate mapping (not a different personality).
 */
export async function speakCompanionReply(
  text: string,
  profile: UserProfile | null,
  options?: { messageId?: string; owner?: 'companion' | 'bubble' },
): Promise<void> {
  const cleaned = textForSpeech(text);
  if (!cleaned || !profile) return;

  const messageId = options?.messageId ?? null;
  if (
    speakInFlight &&
    speakInFlightMessageId === messageId &&
    messageId !== null
  ) {
    return speakInFlight;
  }

  speakingMessageId = messageId;
  const speech = resolveSpeechConfigForProfile(profile);
  const owner = options?.owner ?? 'companion';

  const task = (async () => {
    try {
      await speakExclusive(owner, cleaned, speech);
    } finally {
      speakingMessageId = null;
    }
  })();

  speakInFlight = task;
  speakInFlightMessageId = messageId;
  try {
    await task;
  } finally {
    if (speakInFlight === task) {
      speakInFlight = null;
      speakInFlightMessageId = null;
    }
  }
}

export function shouldAutoSpeakReplies(profile: UserProfile | null): boolean {
  if (!profile) return false;
  return profile.preferences.voxaSpeaksReplies !== false;
}
