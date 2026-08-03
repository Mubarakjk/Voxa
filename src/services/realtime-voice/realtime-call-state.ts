/**
 * Pure call state machine for Realtime WebRTC voice.
 * Kept free of React Native imports for unit tests.
 */

export type RealtimeCallState =
  | 'idle'
  | 'requesting_microphone'
  | 'connecting'
  | 'connected'
  | 'user_speaking'
  | 'voxa_thinking'
  | 'voxa_speaking'
  | 'reconnecting'
  | 'ended'
  | 'failed';

export type RealtimeCallEvent =
  | { type: 'START' }
  | { type: 'MIC_GRANTED' }
  | { type: 'MIC_DENIED' }
  | { type: 'TOKEN_OK' }
  | { type: 'TOKEN_FAIL'; reason: string }
  | { type: 'WEBRTC_UNSUPPORTED' }
  | { type: 'SESSION_READY' }
  | { type: 'USER_SPEECH_START' }
  | { type: 'USER_SPEECH_STOP' }
  | { type: 'VOXA_THINKING' }
  | { type: 'VOXA_SPEAKING' }
  | { type: 'VOXA_DONE' }
  | { type: 'NETWORK_LOSS' }
  | { type: 'RECONNECT_START' }
  | { type: 'RECONNECT_FAIL'; reason: string }
  | { type: 'END' }
  | { type: 'FAIL'; reason: string }
  | { type: 'RESET' };

export type RealtimeCallMachine = {
  state: RealtimeCallState;
  errorMessage: string | null;
  reconnectAttempts: number;
  startedAt: number | null;
  /** Prevents overlapping startCall */
  startLocked: boolean;
  /** Prevents duplicate cleanup */
  cleanupDone: boolean;
};

export const MAX_RECONNECT_ATTEMPTS = 1;

export function createInitialRealtimeCallMachine(): RealtimeCallMachine {
  return {
    state: 'idle',
    errorMessage: null,
    reconnectAttempts: 0,
    startedAt: null,
    startLocked: false,
    cleanupDone: false,
  };
}

export function canStartCall(machine: RealtimeCallMachine): boolean {
  return !machine.startLocked && (machine.state === 'idle' || machine.state === 'ended' || machine.state === 'failed');
}

export function reduceRealtimeCall(
  machine: RealtimeCallMachine,
  event: RealtimeCallEvent,
): RealtimeCallMachine {
  switch (event.type) {
    case 'RESET':
      return createInitialRealtimeCallMachine();

    case 'START':
      if (!canStartCall(machine)) return machine;
      return {
        ...machine,
        state: 'requesting_microphone',
        errorMessage: null,
        startLocked: true,
        cleanupDone: false,
        startedAt: null,
        reconnectAttempts: 0,
      };

    case 'MIC_GRANTED':
      if (machine.state !== 'requesting_microphone' && machine.state !== 'reconnecting') return machine;
      return { ...machine, state: 'connecting' };

    case 'MIC_DENIED':
      return {
        ...machine,
        state: 'failed',
        errorMessage: 'Microphone permission is required for voice calls.',
        startLocked: false,
      };

    case 'WEBRTC_UNSUPPORTED':
      return {
        ...machine,
        state: 'failed',
        errorMessage: 'Live voice needs a development build with WebRTC. Expo Go is not supported.',
        startLocked: false,
      };

    case 'TOKEN_OK':
      if (machine.state !== 'connecting' && machine.state !== 'reconnecting') return machine;
      return machine;

    case 'TOKEN_FAIL':
      return {
        ...machine,
        state: 'failed',
        errorMessage: event.reason,
        startLocked: false,
      };

    case 'SESSION_READY':
      if (machine.state !== 'connecting' && machine.state !== 'reconnecting') return machine;
      return {
        ...machine,
        state: 'connected',
        startedAt: machine.startedAt ?? Date.now(),
        errorMessage: null,
      };

    case 'USER_SPEECH_START':
      if (!isLiveState(machine.state)) return machine;
      return { ...machine, state: 'user_speaking' };

    case 'USER_SPEECH_STOP':
      if (machine.state !== 'user_speaking') return machine;
      return { ...machine, state: 'voxa_thinking' };

    case 'VOXA_THINKING':
      if (!isLiveState(machine.state)) return machine;
      return { ...machine, state: 'voxa_thinking' };

    case 'VOXA_SPEAKING':
      if (!isLiveState(machine.state)) return machine;
      return { ...machine, state: 'voxa_speaking' };

    case 'VOXA_DONE':
      if (!isLiveState(machine.state)) return machine;
      return { ...machine, state: 'connected' };

    case 'NETWORK_LOSS':
      if (!isLiveState(machine.state) && machine.state !== 'connecting') return machine;
      if (machine.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        return {
          ...machine,
          state: 'failed',
          errorMessage: 'Connection lost. Tap Retry to try again.',
          startLocked: false,
        };
      }
      return machine;

    case 'RECONNECT_START':
      if (machine.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        return {
          ...machine,
          state: 'failed',
          errorMessage: 'Could not reconnect. Tap Retry to start a new call.',
          startLocked: false,
        };
      }
      return {
        ...machine,
        state: 'reconnecting',
        reconnectAttempts: machine.reconnectAttempts + 1,
        errorMessage: null,
        startLocked: true,
        cleanupDone: false,
      };

    case 'RECONNECT_FAIL':
      return {
        ...machine,
        state: 'failed',
        errorMessage: event.reason,
        startLocked: false,
      };

    case 'END':
      return {
        ...machine,
        state: 'ended',
        startLocked: false,
        errorMessage: null,
      };

    case 'FAIL':
      return {
        ...machine,
        state: 'failed',
        errorMessage: event.reason,
        startLocked: false,
      };

    default:
      return machine;
  }
}

export function isLiveState(state: RealtimeCallState): boolean {
  return (
    state === 'connected' ||
    state === 'user_speaking' ||
    state === 'voxa_thinking' ||
    state === 'voxa_speaking'
  );
}

export function statusLabel(state: RealtimeCallState): string {
  switch (state) {
    case 'idle':
      return 'Ready to call';
    case 'requesting_microphone':
      return 'Requesting microphone…';
    case 'connecting':
      return 'Connecting…';
    case 'connected':
      return 'Connected — say something';
    case 'user_speaking':
      return 'Listening…';
    case 'voxa_thinking':
      return 'Thinking…';
    case 'voxa_speaking':
      return 'Speaking…';
    case 'reconnecting':
      return 'Reconnecting…';
    case 'ended':
      return 'Call ended';
    case 'failed':
      return 'Call failed';
    default:
      return '';
  }
}

export function mapConnectionError(code: string | undefined, fallback: string): string {
  switch (code) {
    case 'unauthorized':
    case 'invalid_session':
      return 'Sign in to start a voice call.';
    case 'daily_limit':
    case 'fair_use_exceeded':
    case 'monthly_limit':
      return 'Voice call limit reached for today.';
    case 'not_configured':
      return 'Voice calling is not configured on the server.';
    case 'provider_error':
      return fallback || 'Could not start a voice session.';
    case 'duplicate':
      return 'This call request expired. Start a new call.';
    case 'permission':
      return 'Microphone permission is required for voice calls.';
    case 'webrtc':
      return 'Live voice needs a development build with WebRTC.';
    case 'sdp':
      return 'Could not establish the voice connection.';
    case 'ice':
      return 'Network could not complete the voice connection.';
    case 'rate_limit':
      return 'Too many requests. Wait a moment and retry.';
    default:
      return fallback || 'Something went wrong with the voice call.';
  }
}

/** Validate backend session payload without logging secrets. */
export function validateRealtimeSessionResponse(payload: unknown): {
  ok: true;
  clientSecret: string;
  callsUrl: string;
  model?: string;
  voice?: string;
  expiresAt?: number | null;
} | { ok: false; message: string } {
  if (!payload || typeof payload !== 'object') {
    return { ok: false, message: 'Invalid session response.' };
  }
  const data = payload as Record<string, unknown>;
  if (data.ok === false) {
    return {
      ok: false,
      message: typeof data.message === 'string' ? data.message : 'Could not create a voice session.',
    };
  }
  const clientSecret = data.clientSecret;
  if (typeof clientSecret !== 'string' || !clientSecret.startsWith('ek_')) {
    return { ok: false, message: 'Temporary voice credential was missing.' };
  }
  const callsUrl =
    typeof data.callsUrl === 'string' && data.callsUrl.startsWith('https://')
      ? data.callsUrl
      : 'https://api.openai.com/v1/realtime/calls';
  return {
    ok: true,
    clientSecret,
    callsUrl,
    model: typeof data.model === 'string' ? data.model : undefined,
    voice: typeof data.voice === 'string' ? data.voice : undefined,
    expiresAt: typeof data.expiresAt === 'number' ? data.expiresAt : null,
  };
}
