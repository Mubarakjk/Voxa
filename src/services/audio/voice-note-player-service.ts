import { voiceNotePlaybackService } from '../voice-notes/voice-note-playback-service';

export type VoiceNotePlaybackState = {
  attachmentId: string;
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  rate: number;
};

type LegacyListener = (state: VoiceNotePlaybackState | null) => void;

/** Legacy alias — wraps expo-audio playback service. */
class VoiceNotePlayerServiceCompat {
  subscribe(listener: LegacyListener) {
    return voiceNotePlaybackService.subscribe((state) => {
      if (!state) {
        listener(null);
        return;
      }
      listener({
        attachmentId: state.attachmentId ?? 'unknown',
        isPlaying: state.isPlaying,
        positionMs: state.positionMs,
        durationMs: state.durationMs,
        rate: 1,
      });
    });
  }

  getSpeeds() {
    return [1] as const;
  }

  getActiveId() {
    return null;
  }

  play(attachmentId: string, uri: string) {
    return voiceNotePlaybackService.play(attachmentId, uri);
  }

  async setRate(_rate: number) {}

  cycleRate() {
    return 1 as const;
  }

  stop() {
    return voiceNotePlaybackService.stop();
  }
}

export const voiceNotePlayerService = new VoiceNotePlayerServiceCompat();

export type VoiceNoteSpeed = 1;
