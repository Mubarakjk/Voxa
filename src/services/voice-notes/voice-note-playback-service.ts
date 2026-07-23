import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

import { patchVoiceNoteDebug, recordVoiceNotePlaybackError } from './voice-note-debug-state';
import { voiceNoteAudioLock } from './voice-note-audio-lock';
import { voiceNoteLog } from './voice-note-logger';

const LOCK_OWNER = 'voice-note-playback' as const;

export type VoiceNotePlaybackSnapshot = {
  attachmentId: string | null;
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
};

type Listener = (state: VoiceNotePlaybackSnapshot | null) => void;

class VoiceNotePlaybackService {
  private player: AudioPlayer | null = null;
  private activeId: string | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<Listener>();

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(state: VoiceNotePlaybackSnapshot | null) {
    for (const listener of this.listeners) listener(state);
  }

  private startPolling() {
    this.stopPolling();
    this.pollTimer = setInterval(() => {
      if (!this.player || !this.activeId) return;
      const status = this.player.currentStatus;
      if (!status.isLoaded) return;
      this.emit({
        attachmentId: this.activeId,
        isPlaying: status.playing,
        positionMs: Math.round((status.currentTime ?? 0) * 1000),
        durationMs: Math.round((status.duration ?? 0) * 1000),
      });
      if (status.didJustFinish) {
        void this.stop();
      }
    }, 200);
  }

  private stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  async play(attachmentId: string, uri: string) {
    if (voiceNoteAudioLock.getOwner() === 'voice-note-recording') {
      throw new Error('Stop recording before playing a voice note.');
    }

    if (this.activeId === attachmentId && this.player) {
      const status = this.player.currentStatus;
      if (status.isLoaded && status.playing) {
        this.player.pause();
        voiceNoteLog('PLAY_PAUSE');
        this.emit({
          attachmentId,
          isPlaying: false,
          positionMs: Math.round((status.currentTime ?? 0) * 1000),
          durationMs: Math.round((status.duration ?? 0) * 1000),
        });
        return;
      }
      if (status.isLoaded) {
        this.player.play();
        voiceNoteLog('PLAY_START');
        this.startPolling();
        return;
      }
    }

    await this.stop();
    if (!voiceNoteAudioLock.acquire(LOCK_OWNER)) {
      throw new Error('Audio is busy.');
    }

    try {
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      this.player = createAudioPlayer({ uri }, { updateInterval: 200 });
      this.activeId = attachmentId;
      this.player.play();
      voiceNoteLog('PLAY_START');
      recordVoiceNotePlaybackError(null);
      this.startPolling();
    } catch (err) {
      recordVoiceNotePlaybackError(err instanceof Error ? err.message : 'playback_failed');
      await this.stop();
      throw err;
    }
  }

  async playPreview(uri: string) {
    return this.play('preview', uri);
  }

  async stop() {
    this.stopPolling();
    const player = this.player;
    this.player = null;
    this.activeId = null;
    if (player) {
      try {
        player.pause();
        player.remove();
      } catch (err) {
        voiceNoteLog('ERROR', err instanceof Error ? err.message : 'player_remove_failed');
      }
    }
    voiceNoteAudioLock.release(LOCK_OWNER);
    voiceNoteLog('PLAY_END');
    this.emit(null);
  }
}

export const voiceNotePlaybackService = new VoiceNotePlaybackService();
