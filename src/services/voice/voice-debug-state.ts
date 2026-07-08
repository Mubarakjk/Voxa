import { VoiceConnectionState } from './voice-engine';

let lastVoiceError: string | null = null;
let recorderActive = false;
let voiceCallState: VoiceConnectionState = 'idle';
let orbState = 'idle';
let orbMood = 'calm';
let sttProvider = 'unknown';
let ttsProvider = 'unknown';
let lastOpenAiRequestAt: string | null = null;
let lastOpenAiLatencyMs: number | null = null;
let lastAudDRequestAt: string | null = null;
let lastAudDStatus: string | null = null;
let relationshipScore = 0;
let aiResponseTimeMs: number | null = null;

export function setVoiceDebugState(input: {
  recorderActive?: boolean;
  callState?: VoiceConnectionState;
  error?: string | null;
  orbState?: string;
  orbMood?: string;
  sttProvider?: string;
  ttsProvider?: string;
  relationshipScore?: number;
}) {
  if (input.recorderActive !== undefined) recorderActive = input.recorderActive;
  if (input.callState !== undefined) voiceCallState = input.callState;
  if (input.error !== undefined) lastVoiceError = input.error;
  if (input.orbState !== undefined) orbState = input.orbState;
  if (input.orbMood !== undefined) orbMood = input.orbMood;
  if (input.sttProvider !== undefined) sttProvider = input.sttProvider;
  if (input.ttsProvider !== undefined) ttsProvider = input.ttsProvider;
  if (input.relationshipScore !== undefined) relationshipScore = input.relationshipScore;
}

export function recordVoiceError(message: string) {
  lastVoiceError = message;
  console.warn('[Voxa] VOICE ERROR', message);
}

export function recordOpenAiRequest(latencyMs: number) {
  lastOpenAiRequestAt = new Date().toISOString();
  lastOpenAiLatencyMs = latencyMs;
  aiResponseTimeMs = latencyMs;
}

export function recordAudDRequest(status: string) {
  lastAudDRequestAt = new Date().toISOString();
  lastAudDStatus = status;
}

export function getVoiceDebugSnapshot() {
  return {
    lastVoiceError: lastVoiceError ?? 'None',
    recorderActive,
    voiceCallState,
    orbState,
    orbMood,
    sttProvider,
    ttsProvider,
    lastOpenAiRequestAt: lastOpenAiRequestAt ?? 'Never',
    lastOpenAiLatencyMs: lastOpenAiLatencyMs != null ? `${lastOpenAiLatencyMs}ms` : '—',
    lastAudDRequestAt: lastAudDRequestAt ?? 'Never',
    lastAudDStatus: lastAudDStatus ?? '—',
    relationshipScore: String(relationshipScore),
    aiResponseTimeMs: aiResponseTimeMs != null ? `${aiResponseTimeMs}ms` : '—',
  };
}

export function voiceLog(event: string, detail?: string) {
  const line = detail ? `${event} · ${detail}` : event;
  console.log(`[Voxa] ${line}`);
}
