import * as Speech from 'expo-speech';

import { voiceNoteLog } from './voice-note-logger';

export type VoiceNoteLockOwner = null | 'voice-note-recording' | 'voice-note-playback' | 'tts';

class VoiceNoteAudioLock {
  private owner: VoiceNoteLockOwner = null;

  getOwner() {
    return this.owner;
  }

  acquire(next: Exclude<VoiceNoteLockOwner, null>): boolean {
    if (this.owner === next) return true;
    if (this.owner !== null && this.owner !== next) {
      voiceNoteLog('ERROR', 'lock_busy');
      return false;
    }
    if (next === 'voice-note-recording') {
      Speech.stop();
    }
    this.owner = next;
    voiceNoteLog('LOCK_ACQUIRED', next);
    return true;
  }

  release(expected: Exclude<VoiceNoteLockOwner, null>) {
    if (this.owner !== expected) return;
    this.owner = null;
    voiceNoteLog('LOCK_RELEASED', expected);
  }

  forceRelease() {
    if (!this.owner) return;
    const prev = this.owner;
    this.owner = null;
    voiceNoteLog('LOCK_RELEASED', `${prev}:force`);
  }
}

export const voiceNoteAudioLock = new VoiceNoteAudioLock();
