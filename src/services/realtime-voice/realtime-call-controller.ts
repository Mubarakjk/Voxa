import { AppState, AppStateStatus } from 'react-native';

import { UserProfile, Goal, Memory } from '../../types';
import { getVoxaDisplayName } from '../../utils/companion-display';
import { requestRealtimeClientSession } from './create-realtime-session-client';
import { buildRealtimeCallInstructions } from './realtime-call-context';
import { realtimeLog } from './realtime-debug';
import {
  canStartCall,
  createInitialRealtimeCallMachine,
  mapConnectionError,
  RealtimeCallMachine,
  RealtimeCallState,
  reduceRealtimeCall,
  statusLabel,
} from './realtime-call-state';
import { mapCompanionVoiceToRealtime } from './realtime-voice-map';
import { isWebRTCAvailable, RealtimeWebRTCSession } from './realtime-webrtc-session';
import { requestRecordingPermissionsAsync } from 'expo-audio';

export type RealtimeCallListener = (snapshot: RealtimeCallSnapshot) => void;

export type RealtimeCallSnapshot = {
  state: RealtimeCallState;
  statusText: string;
  errorMessage: string | null;
  startedAt: number | null;
  muted: boolean;
  captionsEnabled: boolean;
  caption: string;
  isActive: boolean;
};

export type StartRealtimeCallInput = {
  profile: UserProfile;
  topGoal?: Goal | null;
  memories?: Memory[];
  /** Optional scheduled-call system context (concise; replaces default memory block when set). */
  scheduledInstructions?: string;
};

export class RealtimeCallController {
  private machine = createInitialRealtimeCallMachine();
  private session: RealtimeWebRTCSession | null = null;
  private listeners = new Set<RealtimeCallListener>();
  private muted = false;
  private captionsEnabled = true;
  private caption = '';
  private appStateSub: { remove: () => void } | null = null;
  private reconnecting = false;
  private lastStartInput: StartRealtimeCallInput | null = null;

  subscribe(listener: RealtimeCallListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  snapshot(): RealtimeCallSnapshot {
    return {
      state: this.machine.state,
      statusText: this.machine.errorMessage ?? statusLabel(this.machine.state),
      errorMessage: this.machine.errorMessage,
      startedAt: this.machine.startedAt,
      muted: this.muted,
      captionsEnabled: this.captionsEnabled,
      caption: this.caption,
      isActive:
        this.machine.state !== 'idle' &&
        this.machine.state !== 'ended' &&
        this.machine.state !== 'failed',
    };
  }

  private dispatch(event: Parameters<typeof reduceRealtimeCall>[1]) {
    const prev = this.machine.state;
    this.machine = reduceRealtimeCall(this.machine, event);
    if (prev !== this.machine.state) {
      realtimeLog('state_transition', { from: prev, to: this.machine.state, event: event.type });
    }
    this.emit();
  }

  private emit() {
    const snap = this.snapshot();
    this.listeners.forEach((l) => l(snap));
  }

  async startCall(input: StartRealtimeCallInput): Promise<void> {
    if (!canStartCall(this.machine)) {
      realtimeLog('start_blocked_duplicate');
      return;
    }

    this.lastStartInput = input;
    this.dispatch({ type: 'START' });
    this.caption = '';
    this.muted = false;

    await this.connectPipeline(input, false);
  }

  private async connectPipeline(input: StartRealtimeCallInput, isReconnect: boolean): Promise<void> {
    if (!isWebRTCAvailable()) {
      this.dispatch({ type: 'WEBRTC_UNSUPPORTED' });
      await this.endCall();
      return;
    }

    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      this.dispatch({ type: 'MIC_DENIED' });
      await this.endCall();
      return;
    }
    this.dispatch({ type: 'MIC_GRANTED' });

    realtimeLog('token_request_started', { isReconnect });
    const instructions = buildRealtimeCallInstructions({
      profile: input.profile,
      topGoal: input.topGoal,
      memories: input.memories,
      scheduledInstructions: input.scheduledInstructions,
    });
    const voice = mapCompanionVoiceToRealtime(input.profile.preferences?.selectedVoiceOptionId);
    const companionName = getVoxaDisplayName(input.profile);

    const token = await requestRealtimeClientSession({
      voice,
      instructions,
      companionName,
    });

    if (!token.ok) {
      realtimeLog('token_request_failed', { code: token.code });
      this.dispatch({
        type: isReconnect ? 'RECONNECT_FAIL' : 'TOKEN_FAIL',
        reason: token.message || mapConnectionError(token.code, ''),
      });
      await this.endCall();
      return;
    }

    realtimeLog('token_request_succeeded', {
      model: token.model,
      voice: token.voice,
      expiresAt: token.expiresAt ?? null,
    });
    this.dispatch({ type: 'TOKEN_OK' });

    const session = new RealtimeWebRTCSession();
    this.session = session;

    try {
      await session.connect({
        clientSecret: token.clientSecret,
        callsUrl: token.callsUrl,
        callbacks: {
          onSessionReady: () => {
            this.reconnecting = false;
            this.dispatch({ type: 'SESSION_READY' });
          },
          onUserSpeechStart: () => this.dispatch({ type: 'USER_SPEECH_START' }),
          onUserSpeechStop: () => this.dispatch({ type: 'USER_SPEECH_STOP' }),
          onVoxaThinking: () => this.dispatch({ type: 'VOXA_THINKING' }),
          onVoxaSpeaking: () => this.dispatch({ type: 'VOXA_SPEAKING' }),
          onVoxaDone: () => this.dispatch({ type: 'VOXA_DONE' }),
          onRemoteTrack: () => realtimeLog('remote_audio_ready'),
          onConnectionLost: () => {
            void this.handleConnectionLost();
          },
          onFatalError: (message) => {
            this.dispatch({ type: 'FAIL', reason: message });
            void this.endCall();
          },
          onCaption: (_role, text) => {
            if (!this.captionsEnabled) return;
            this.caption = text;
            this.emit();
          },
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not connect the voice call.';
      this.dispatch({
        type: isReconnect ? 'RECONNECT_FAIL' : 'FAIL',
        reason: message,
      });
      await this.endCall();
      return;
    }

    this.appStateSub?.remove();
    this.appStateSub = AppState.addEventListener('change', this.onAppState);
  }

  private async handleConnectionLost() {
    if (this.machine.cleanupDone || this.reconnecting) return;
    this.dispatch({ type: 'NETWORK_LOSS' });
    if (this.machine.state === 'failed') {
      await this.endCall();
      return;
    }

    this.reconnecting = true;
    this.dispatch({ type: 'RECONNECT_START' });
    if (this.machine.state !== 'reconnecting' || !this.lastStartInput) {
      this.dispatch({
        type: 'RECONNECT_FAIL',
        reason: 'Connection lost. Tap Retry to start a new call.',
      });
      await this.endCall();
      return;
    }

    await this.session?.cleanup();
    this.session = null;
    this.machine = { ...this.machine, cleanupDone: false };

    await this.connectPipeline(this.lastStartInput, true);
  }

  private onAppState = (next: AppStateStatus) => {
    if (next === 'active') return;
    // Do not kill immediately on brief interruptions; end only if call already failed.
    realtimeLog('app_state', { next });
  };

  setMuted(muted: boolean) {
    this.muted = muted;
    this.session?.setMuted(muted);
    this.emit();
  }

  setCaptionsEnabled(enabled: boolean) {
    this.captionsEnabled = enabled;
    if (!enabled) this.caption = '';
    this.emit();
  }

  /** Idempotent end + cleanup. */
  async endCall(): Promise<void> {
    if (this.machine.cleanupDone) {
      realtimeLog('cleanup_skipped_duplicate');
      return;
    }
    this.machine = { ...this.machine, cleanupDone: true };

    this.appStateSub?.remove();
    this.appStateSub = null;

    await this.session?.cleanup();
    this.session = null;
    this.reconnecting = false;

    if (this.machine.state !== 'failed' && this.machine.state !== 'ended') {
      this.dispatch({ type: 'END' });
    } else {
      this.machine = { ...this.machine, startLocked: false };
      this.emit();
    }
  }

  async resetForRetry(): Promise<void> {
    await this.endCall();
    this.machine = createInitialRealtimeCallMachine();
    this.muted = false;
    this.caption = '';
    this.emit();
  }
}

let sharedController: RealtimeCallController | null = null;

export function getRealtimeCallController(): RealtimeCallController {
  if (!sharedController) sharedController = new RealtimeCallController();
  return sharedController;
}
