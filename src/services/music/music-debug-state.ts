export type MusicDebugStep =
  | 'idle'
  | 'permission_check'
  | 'recording_started'
  | 'recording_saved'
  | 'file_exists'
  | 'uploading'
  | 'response_received'
  | 'parsed'
  | 'saved_history'
  | 'failed';

export interface FailedMusicAttempt {
  at: string;
  fileSizeBytes: number;
  durationMs: number;
  auddStatus: string;
  auddCode: string;
  message: string;
}

let currentStep: MusicDebugStep = 'idle';
let lastError: string | null = null;
let lastResponseStatus: string | null = null;
let lastFileSizeBytes: number | null = null;
let lastDurationMs: number | null = null;
let lastAuddCode: string | null = null;
let lastAuddResult: string | null = null;
const failedAttempts: FailedMusicAttempt[] = [];

export function setMusicDebugStep(step: MusicDebugStep, error?: string | null) {
  currentStep = step;
  if (error !== undefined) lastError = error;
  console.log(`[Voxa] Music step: ${step}${error ? ` · ${error}` : ''}`);
}

export function setMusicResponseStatus(status: string) {
  lastResponseStatus = status;
}

export function setMusicRecordingMeta(fileSizeBytes: number, durationMs: number) {
  lastFileSizeBytes = fileSizeBytes;
  lastDurationMs = durationMs;
}

export function setMusicAuddDetail(code: string, result: string) {
  lastAuddCode = code;
  lastAuddResult = result;
}

export function recordFailedMusicAttempt(attempt: Omit<FailedMusicAttempt, 'at'>) {
  failedAttempts.unshift({ ...attempt, at: new Date().toISOString() });
  if (failedAttempts.length > 8) failedAttempts.pop();
}

export function resetMusicDebug() {
  currentStep = 'idle';
  lastError = null;
  lastResponseStatus = null;
  lastFileSizeBytes = null;
  lastDurationMs = null;
  lastAuddCode = null;
  lastAuddResult = null;
}

export function getMusicDebugSnapshot() {
  return {
    step: currentStep,
    lastError: lastError ?? 'None',
    lastResponseStatus: lastResponseStatus ?? '—',
    fileSizeBytes: lastFileSizeBytes,
    durationMs: lastDurationMs,
    auddCode: lastAuddCode ?? '—',
    auddResult: lastAuddResult ?? '—',
    failedAttempts: [...failedAttempts],
  };
}

export function musicStepLabel(step: MusicDebugStep): string {
  const labels: Record<MusicDebugStep, string> = {
    idle: 'Ready',
    permission_check: '1. Checking microphone permission',
    recording_started: '2. Recording started',
    recording_saved: '3. Recording saved',
    file_exists: '4. Audio file verified',
    uploading: '5. Uploading to AudD',
    response_received: '6. AudD response received',
    parsed: '7. Result parsed',
    saved_history: '8. Saved to history',
    failed: 'Failed',
  };
  return labels[step];
}
