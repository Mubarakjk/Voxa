/**
 * Single speech playback coordinator.
 * Ensures only one speech source is active across companion replies, previews, and bubble replay.
 */

import * as Speech from 'expo-speech';

import { voiceNotePlayerService } from '../audio/voice-note-player-service';
import { HybridTextToSpeechService } from './text-to-speech-service';
import { VoiceSpeechConfig } from '../../types/voice-identity';

export type SpeechOwner = 'idle' | 'companion' | 'preview' | 'bubble';

const sharedTts = new HybridTextToSpeechService();

let owner: SpeechOwner = 'idle';
let generation = 0;
let listeners = new Set<() => void>();

export function getSpeechOwner(): SpeechOwner {
  return owner;
}

export function isAnySpeechActive(): boolean {
  return owner !== 'idle' && (sharedTts.isSpeaking() || owner === 'preview' || owner === 'companion' || owner === 'bubble');
}

export function subscribeSpeechOwner(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  listeners.forEach((l) => l());
}

export async function stopAllSpeech(): Promise<void> {
  generation += 1;
  const changed = owner !== 'idle';
  owner = 'idle';
  if (changed) notify();
  try {
    Speech.stop();
  } catch {
    // ignore
  }
  await sharedTts.stop();
  await voiceNotePlayerService.stop();
}

/**
 * Speak with exclusive ownership. Stops every other speech path first.
 */
export async function speakExclusive(
  nextOwner: Exclude<SpeechOwner, 'idle'>,
  text: string,
  config: VoiceSpeechConfig,
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;

  await stopAllSpeech();
  const gen = generation;
  owner = nextOwner;
  notify();

  try {
    await sharedTts.speak(trimmed, config);
  } finally {
    if (generation === gen) {
      owner = 'idle';
      notify();
    }
  }
}

export function getSharedTts() {
  return sharedTts;
}
