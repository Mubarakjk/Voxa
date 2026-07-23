export type VoiceNoteRecorderState =
  | 'idle'
  | 'requesting_permission'
  | 'preparing'
  | 'recording'
  | 'paused'
  | 'stopping'
  | 'ready'
  | 'failed';

export type VoiceNoteDebugSnapshot = {
  state: VoiceNoteRecorderState;
  permissionGranted: boolean | null;
  lockOwner: string | null;
  recorderPrepared: boolean;
  isRecording: boolean;
  durationMs: number;
  fileSizeBytes: number | null;
  uriExists: boolean;
  lastError: string | null;
  lastPlaybackError: string | null;
  lastTranscriptionStatus: string;
  lastUploadStatus: string;
  lastTestResult: string | null;
  featureStatus?: string;
  gateAllowed?: boolean | null;
  dailyUsageCount?: number | null;
};

let snapshot: VoiceNoteDebugSnapshot = {
  state: 'idle',
  permissionGranted: null,
  lockOwner: null,
  recorderPrepared: false,
  isRecording: false,
  durationMs: 0,
  fileSizeBytes: null,
  uriExists: false,
  lastError: null,
  lastPlaybackError: null,
  lastTranscriptionStatus: '—',
  lastUploadStatus: '—',
  lastTestResult: null,
  gateAllowed: null,
  dailyUsageCount: null,
};

export function patchVoiceNoteDebug(patch: Partial<VoiceNoteDebugSnapshot>) {
  snapshot = { ...snapshot, ...patch };
}

export function recordVoiceNoteTranscriptionStatus(status: string) {
  patchVoiceNoteDebug({ lastTranscriptionStatus: status });
}

export function recordVoiceNoteUploadStatus(status: string) {
  patchVoiceNoteDebug({ lastUploadStatus: status });
}

export function recordVoiceNoteError(code: string) {
  patchVoiceNoteDebug({ lastError: code });
}

export function recordVoiceNotePlaybackError(code: string | null) {
  patchVoiceNoteDebug({ lastPlaybackError: code });
}

export function recordVoiceNoteTestResult(result: string) {
  patchVoiceNoteDebug({ lastTestResult: result });
}

export function getVoiceNoteDebugSnapshot(): VoiceNoteDebugSnapshot {
  return { ...snapshot };
}
