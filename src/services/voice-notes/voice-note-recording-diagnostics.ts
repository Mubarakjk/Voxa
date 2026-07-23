import type { PermissionStatus, RecorderState } from 'expo-audio';

export type VoiceNoteStartStep =
  | 'idle'
  | 'permission_request'
  | 'permission_result'
  | 'audio_lock_acquire'
  | 'set_audio_mode'
  | 'recorder_create'
  | 'prepare_to_record_start'
  | 'prepare_to_record_success'
  | 'prepare_to_record_failure'
  | 'record_call'
  | 'wait_native_is_recording'
  | 'wait_native_duration'
  | 'recording_active'
  | 'duration_watchdog_failed'
  | 'start_complete';

export type VoiceNoteRawStatusSample = {
  at: string;
  canRecord: boolean;
  isRecording: boolean;
  durationMillis: number;
  mediaServicesDidReset: boolean;
  metering?: number;
  urlPresent: boolean;
};

export type VoiceNoteStartSequenceDiagnostic = {
  lastStep: VoiceNoteStartStep;
  lastStepDetail?: string;
  permissionStatus: PermissionStatus | 'unknown';
  permissionGranted: boolean | null;
  audioModeConfigured: boolean;
  recorderCreated: boolean;
  prepareStatus: 'pending' | 'resolved' | 'rejected';
  recordCalled: boolean;
  startStatus: 'pending' | 'resolved' | 'rejected';
  startError: string | null;
  lastNativeError: string | null;
  appState: string;
  audioOwner: string | null;
  flowStoppedAt: VoiceNoteStartStep | null;
};

let lastStep: VoiceNoteStartStep = 'idle';
let lastStepDetail: string | undefined;
let permissionStatus: PermissionStatus | 'unknown' = 'unknown';
let permissionGranted: boolean | null = null;
let audioModeConfigured = false;
let recorderCreated = false;
let prepareStatus: 'pending' | 'resolved' | 'rejected' = 'pending';
let recordCalled = false;
let startStatus: 'pending' | 'resolved' | 'rejected' = 'pending';
let startError: string | null = null;
let lastNativeError: string | null = null;
let appState = 'active';
let audioOwner: string | null = null;
let flowStoppedAt: VoiceNoteStartStep | null = null;
const samples: VoiceNoteRawStatusSample[] = [];

export function resetVoiceNoteRecordingDiagnostics() {
  lastStep = 'idle';
  lastStepDetail = undefined;
  permissionStatus = 'unknown';
  permissionGranted = null;
  audioModeConfigured = false;
  recorderCreated = false;
  prepareStatus = 'pending';
  recordCalled = false;
  startStatus = 'pending';
  startError = null;
  lastNativeError = null;
  flowStoppedAt = null;
  samples.length = 0;
}

export function recordVoiceNoteStartStep(step: VoiceNoteStartStep, detail?: string) {
  lastStep = step;
  lastStepDetail = detail?.slice(0, 120);
  if (step.includes('failure') || step === 'duration_watchdog_failed') {
    flowStoppedAt = step;
  }
}

export function patchVoiceNoteRecordingDiagnostics(patch: Partial<VoiceNoteStartSequenceDiagnostic>) {
  if (patch.permissionStatus !== undefined) permissionStatus = patch.permissionStatus;
  if (patch.permissionGranted !== undefined) permissionGranted = patch.permissionGranted;
  if (patch.audioModeConfigured !== undefined) audioModeConfigured = patch.audioModeConfigured;
  if (patch.recorderCreated !== undefined) recorderCreated = patch.recorderCreated;
  if (patch.prepareStatus !== undefined) prepareStatus = patch.prepareStatus;
  if (patch.recordCalled !== undefined) recordCalled = patch.recordCalled;
  if (patch.startStatus !== undefined) startStatus = patch.startStatus;
  if (patch.startError !== undefined) startError = patch.startError;
  if (patch.lastNativeError !== undefined) lastNativeError = patch.lastNativeError;
  if (patch.appState !== undefined) appState = patch.appState;
  if (patch.audioOwner !== undefined) audioOwner = patch.audioOwner;
  if (patch.flowStoppedAt !== undefined) flowStoppedAt = patch.flowStoppedAt;
}

export function recordVoiceNoteNativeError(error: string | null) {
  if (!error) return;
  lastNativeError = error.slice(0, 120);
  flowStoppedAt = flowStoppedAt ?? 'wait_native_duration';
}

export function pushVoiceNoteRawStatus(status: RecorderState | null) {
  if (!status) return;
  samples.unshift({
    at: new Date().toISOString(),
    canRecord: status.canRecord,
    isRecording: status.isRecording,
    durationMillis: status.durationMillis,
    mediaServicesDidReset: status.mediaServicesDidReset,
    metering: status.metering,
    urlPresent: Boolean(status.url),
  });
  if (samples.length > 40) samples.length = 40;
}

export function formatSafeRecorderStatus(status: RecorderState | null): string {
  if (!status) return 'recorder=null';
  return [
    `canRecord=${status.canRecord}`,
    `isRecording=${status.isRecording}`,
    `durationMillis=${status.durationMillis}`,
    `mediaServicesDidReset=${status.mediaServicesDidReset}`,
    `metering=${status.metering ?? 'na'}`,
    `urlPresent=${Boolean(status.url)}`,
  ].join(' · ');
}

export function getVoiceNoteRecordingDiagnostics(): VoiceNoteStartSequenceDiagnostic & {
  samples: VoiceNoteRawStatusSample[];
} {
  return {
    lastStep,
    lastStepDetail,
    permissionStatus,
    permissionGranted,
    audioModeConfigured,
    recorderCreated,
    prepareStatus,
    recordCalled,
    startStatus,
    startError,
    lastNativeError,
    appState,
    audioOwner,
    flowStoppedAt,
    samples: [...samples],
  };
}
