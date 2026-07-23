export {
  getVoiceNoteDebugSnapshot,
  patchVoiceNoteDebug,
  recordVoiceNoteError,
  recordVoiceNotePlaybackError,
  recordVoiceNoteTestResult,
  recordVoiceNoteTranscriptionStatus,
  recordVoiceNoteUploadStatus,
} from '../services/voice-notes/voice-note-debug-state';

export type { VoiceNoteDebugSnapshot, VoiceNoteRecorderState } from '../services/voice-notes/voice-note-debug-state';

import { recordVoiceNoteError as recordError } from '../services/voice-notes/voice-note-debug-state';

/** @deprecated */
export function recordVoiceNoteAudioError(error: string | null) {
  if (error) recordError(error);
}

/** @deprecated Legacy expo-av stage logging — no-op. */
export function recordVoiceNoteStage(_stage: string, _detail?: string) {}

/** @deprecated */
export function recordVoiceNoteDuration(_seconds: number) {}

/** @deprecated */
export function recordVoiceNoteUri(_uri: string) {}

/** @deprecated */
export function recordVoiceNoteFileSize(_bytes: number | null) {}
