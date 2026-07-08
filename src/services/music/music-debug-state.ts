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

let currentStep: MusicDebugStep = 'idle';
let lastError: string | null = null;
let lastResponseStatus: string | null = null;

export function setMusicDebugStep(step: MusicDebugStep, error?: string | null) {
  currentStep = step;
  if (error !== undefined) lastError = error;
  console.log(`[Voxa] Music step: ${step}${error ? ` · ${error}` : ''}`);
}

export function setMusicResponseStatus(status: string) {
  lastResponseStatus = status;
}

export function resetMusicDebug() {
  currentStep = 'idle';
  lastError = null;
  lastResponseStatus = null;
}

export function getMusicDebugSnapshot() {
  return {
    step: currentStep,
    lastError: lastError ?? 'None',
    lastResponseStatus: lastResponseStatus ?? '—',
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
