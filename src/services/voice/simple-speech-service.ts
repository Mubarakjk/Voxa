import * as Speech from 'expo-speech';

import { UserProfile } from '../../types';
import { VOICE_PERSONALITY_PROFILES } from '../../types/voice-call';
import { audioSessionManager } from '../audio/audio-session-manager';
import { voiceNotePlayerService } from '../audio/voice-note-player-service';
import { resolveVoiceIdentity } from './voice-identity-resolver';

export type SimpleSpeechOptions = {
  pitch?: number;
  rate?: number;
};

let speaking = false;

export function isSimpleSpeechActive() {
  return speaking;
}

export async function speakSimple(text: string, profile: UserProfile | null, options?: SimpleSpeechOptions) {
  const trimmed = text.trim();
  if (!trimmed) return;

  await voiceNotePlayerService.stop();
  await audioSessionManager.prepareForPlayback('tts');
  Speech.stop();
  speaking = true;

  const identity = profile ? resolveVoiceIdentity(profile) : null;
  const personality = profile?.preferences.voicePersonality ?? 'warm_calm';
  const profileDef = VOICE_PERSONALITY_PROFILES.find((p) => p.id === personality);

  const pitch = options?.pitch ?? profileDef?.expoPitch ?? identity?.speechSpeed ? 1 : 0.95;
  const rate = options?.rate ?? profileDef?.expoRate ?? 0.92;

  try {
    await new Promise<void>((resolve, reject) => {
      Speech.speak(trimmed, {
        pitch,
        rate,
        onDone: () => {
          speaking = false;
          void audioSessionManager.releaseLock('tts');
          resolve();
        },
        onStopped: () => {
          speaking = false;
          void audioSessionManager.releaseLock('tts');
          resolve();
        },
        onError: () => {
          speaking = false;
          void audioSessionManager.releaseLock('tts');
          reject(new Error('Playback failed'));
        },
      });
    });
  } catch (error) {
    speaking = false;
    await audioSessionManager.releaseLock('tts');
    throw error;
  }
}

export function stopSimpleSpeech() {
  Speech.stop();
  speaking = false;
  void audioSessionManager.releaseLock('tts');
}
