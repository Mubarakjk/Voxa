import { UserProfile } from '../../types';
import { HybridTextToSpeechService } from './text-to-speech-service';
import { resolveVoiceIdentity, resolveVoiceSpeechConfig } from './voice-identity-resolver';
import { speakSimple, stopSimpleSpeech, isSimpleSpeechActive } from './simple-speech-service';
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

const hybridTts = new HybridTextToSpeechService();
let speakingMessageId: string | null = null;

export function getSpeakingMessageId() {
  return speakingMessageId;
}

export function isCompanionSpeaking() {
  return hybridTts.isSpeaking() || isSimpleSpeechActive();
}

export async function stopCompanionSpeech() {
  speakingMessageId = null;
  await hybridTts.stop();
  stopSimpleSpeech();
  await voiceNotePlayerService.stop();
}

/**
 * Speak a companion reply aloud.
 * Prefers OpenAI TTS when configured; falls back to on-device expo-speech.
 */
export async function speakCompanionReply(
  text: string,
  profile: UserProfile | null,
  options?: { messageId?: string },
): Promise<void> {
  const cleaned = textForSpeech(text);
  if (!cleaned || !profile) return;

  await stopCompanionSpeech();
  speakingMessageId = options?.messageId ?? null;

  const identity = resolveVoiceIdentity(profile);
  const speech = resolveVoiceSpeechConfig(identity, profile.preferences.voicePersonality);
  try {
    await hybridTts.speak(cleaned, speech);
  } catch {
    await speakSimple(cleaned, profile);
  } finally {
    speakingMessageId = null;
  }
}

export function shouldAutoSpeakReplies(profile: UserProfile | null): boolean {
  if (!profile) return false;
  return profile.preferences.voxaSpeaksReplies !== false;
}
