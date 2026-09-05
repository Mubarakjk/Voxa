import { setAudioModeAsync } from 'expo-audio';
import { AppState, AppStateStatus, Platform } from 'react-native';

import { mapConnectionError } from './realtime-call-state';
import { realtimeLog } from './realtime-debug';

type WebRTCModule = {
  RTCPeerConnection: new (config?: object) => RTCPeerConnectionLike;
  RTCSessionDescription: new (init: { type: string; sdp: string }) => { type: string; sdp: string };
  mediaDevices: {
    getUserMedia: (constraints: object) => Promise<MediaStreamLike>;
  };
};

type MediaStreamTrackLike = {
  enabled: boolean;
  stop: () => void;
  kind: string;
};

type MediaStreamLike = {
  getTracks: () => MediaStreamTrackLike[];
  getAudioTracks: () => MediaStreamTrackLike[];
};

type RTCDataChannelLike = {
  readyState: string;
  label: string;
  send: (data: string) => void;
  close: () => void;
  addEventListener: (type: string, listener: (ev: { data?: string }) => void) => void;
  removeEventListener?: (type: string, listener: (ev: { data?: string }) => void) => void;
  onopen: ((ev?: unknown) => void) | null;
  onclose: ((ev?: unknown) => void) | null;
  onmessage: ((ev: { data: string }) => void) | null;
  onerror: ((ev?: unknown) => void) | null;
};

type RTCPeerConnectionLike = {
  connectionState: string;
  iceConnectionState: string;
  addTrack: (track: MediaStreamTrackLike, stream: MediaStreamLike) => void;
  createDataChannel: (label: string) => RTCDataChannelLike;
  createOffer: (options?: object) => Promise<{ type: string; sdp: string }>;
  setLocalDescription: (desc: { type: string; sdp: string }) => Promise<void>;
  setRemoteDescription: (desc: { type: string; sdp: string }) => Promise<void>;
  close: () => void;
  getSenders: () => Array<{ track: MediaStreamTrackLike | null }>;
  ontrack: ((ev: { streams: MediaStreamLike[]; track: MediaStreamTrackLike }) => void) | null;
  onconnectionstatechange: (() => void) | null;
  oniceconnectionstatechange: (() => void) | null;
  onicecandidate: ((ev: { candidate: unknown }) => void) | null;
};

export type RealtimeWebRTCCallbacks = {
  onSessionReady: () => void;
  onUserSpeechStart: () => void;
  onUserSpeechStop: () => void;
  onVoxaThinking: () => void;
  onVoxaSpeaking: () => void;
  onVoxaDone: () => void;
  onRemoteTrack: () => void;
  onConnectionLost: () => void;
  onFatalError: (message: string) => void;
  onCaption?: (role: 'user' | 'assistant', text: string) => void;
};

export type RealtimeWebRTCConnectInput = {
  clientSecret: string;
  callsUrl: string;
  callbacks: RealtimeWebRTCCallbacks;
};

function loadWebRTC(): WebRTCModule | null {
  try {
    // Native-only; unavailable in Expo Go / Node tests.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-webrtc') as WebRTCModule;
  } catch {
    return null;
  }
}

export function isWebRTCAvailable(): boolean {
  return loadWebRTC() != null;
}

export class RealtimeWebRTCSession {
  private pc: RTCPeerConnectionLike | null = null;
  private dc: RTCDataChannelLike | null = null;
  private localStream: MediaStreamLike | null = null;
  private remoteStream: MediaStreamLike | null = null;
  private callbacks: RealtimeWebRTCCallbacks | null = null;
  private clientSecret: string | null = null;
  private cleaned = false;
  private voxaSpeaking = false;
  private sessionReadySent = false;
  private appStateSub: { remove: () => void } | null = null;
  private messageHandler: ((ev: { data: string }) => void) | null = null;

  async connect(input: RealtimeWebRTCConnectInput): Promise<void> {
    this.cleaned = false;
    this.sessionReadySent = false;
    this.callbacks = input.callbacks;
    this.clientSecret = input.clientSecret;

    const webrtc = loadWebRTC();
    if (!webrtc) {
      throw Object.assign(new Error(mapConnectionError('webrtc', '')), { code: 'webrtc' });
    }

    realtimeLog('webrtc_connect_start');

    await this.configureAudioSession();

    const { RTCPeerConnection, mediaDevices } = webrtc;
    const pc = new RTCPeerConnection({});
    this.pc = pc;

    pc.ontrack = (event) => {
      realtimeLog('remote_track_received', { kind: event.track?.kind });
      this.remoteStream = event.streams?.[0] ?? null;
      this.callbacks?.onRemoteTrack();
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      realtimeLog('peer_connection_state', { state });
      if (state === 'failed' || state === 'disconnected') {
        this.callbacks?.onConnectionLost();
      }
      if (state === 'connected') {
        this.markSessionReady();
      }
    };

    pc.oniceconnectionstatechange = () => {
      realtimeLog('ice_connection_state', { state: pc.iceConnectionState });
      if (pc.iceConnectionState === 'failed') {
        this.callbacks?.onFatalError(mapConnectionError('ice', ''));
      }
    };

    let mic: MediaStreamLike;
    try {
      mic = await mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
    } catch {
      throw Object.assign(new Error(mapConnectionError('permission', '')), { code: 'permission' });
    }

    this.localStream = mic;
    mic.getTracks().forEach((track) => pc.addTrack(track, mic));
    realtimeLog('local_track_status', {
      tracks: mic.getTracks().length,
      audio: mic.getAudioTracks().length,
    });

    const dc = pc.createDataChannel('oai-events');
    this.dc = dc;
    this.bindDataChannel(dc);

    const offer = await pc.createOffer({});
    await pc.setLocalDescription(offer);
    realtimeLog('sdp_offer_created');

    let sdpResponse: Response;
    try {
      sdpResponse = await fetch(input.callsUrl, {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${input.clientSecret}`,
          'Content-Type': 'application/sdp',
        },
      });
    } catch {
      throw Object.assign(new Error(mapConnectionError('sdp', 'Network error during SDP exchange.')), {
        code: 'sdp',
      });
    }

    if (!sdpResponse.ok) {
      const status = sdpResponse.status;
      throw Object.assign(
        new Error(
          status === 401 || status === 403
            ? mapConnectionError('unauthorized', 'Temporary voice credential was rejected.')
            : mapConnectionError('sdp', `SDP exchange failed (${status}).`),
        ),
        { code: 'sdp' },
      );
    }

    const answerSdp = await sdpResponse.text();
    if (!answerSdp.trim()) {
      throw Object.assign(new Error(mapConnectionError('sdp', 'Empty SDP answer.')), { code: 'sdp' });
    }

    await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
    realtimeLog('sdp_answer_applied');

    this.appStateSub = AppState.addEventListener('change', this.onAppStateChange);

    // Connected once peer reaches connected OR data channel opens + session.created.
    // We wait for session.created via data channel before calling onSessionReady.
  }

  private bindDataChannel(dc: RTCDataChannelLike) {
    dc.onopen = () => {
      realtimeLog('data_channel_state', { state: 'open' });
    };
    dc.onclose = () => {
      realtimeLog('data_channel_state', { state: 'closed' });
    };
    dc.onerror = () => {
      realtimeLog('data_channel_state', { state: 'error' });
    };

    this.messageHandler = (ev) => {
      this.handleServerEvent(ev.data);
    };
    dc.onmessage = this.messageHandler;
  }

  private handleServerEvent(raw: string) {
    let event: { type?: string; transcript?: string; delta?: string; item?: { role?: string } };
    try {
      event = JSON.parse(raw);
    } catch {
      return;
    }

    const type = event.type ?? '';

    if (type === 'session.created' || type === 'session.updated') {
      realtimeLog('session_created');
      this.markSessionReady();
      return;
    }

    if (type === 'input_audio_buffer.speech_started') {
      realtimeLog('interruption_event', { type });
      if (this.voxaSpeaking) {
        this.sendEvent({ type: 'response.cancel' });
        this.voxaSpeaking = false;
      }
      this.callbacks?.onUserSpeechStart();
      return;
    }

    if (type === 'input_audio_buffer.speech_stopped') {
      this.callbacks?.onUserSpeechStop();
      return;
    }

    if (
      type === 'response.created' ||
      type === 'response.output_item.added' ||
      type === 'response.content_part.added'
    ) {
      this.callbacks?.onVoxaThinking();
      return;
    }

    if (
      type === 'output_audio_buffer.started' ||
      type === 'response.output_audio.delta' ||
      type === 'response.audio.delta' ||
      type === 'response.output_audio_transcript.delta'
    ) {
      this.voxaSpeaking = true;
      this.callbacks?.onVoxaSpeaking();
      if (type.includes('transcript') && typeof event.delta === 'string' && event.delta) {
        this.callbacks?.onCaption?.('assistant', event.delta);
      }
      return;
    }

    if (
      type === 'output_audio_buffer.stopped' ||
      type === 'output_audio_buffer.cleared' ||
      type === 'response.done' ||
      type === 'response.cancelled'
    ) {
      if (type === 'output_audio_buffer.cleared' || type === 'response.cancelled') {
        realtimeLog('interruption_event', { type });
      }
      this.voxaSpeaking = false;
      this.callbacks?.onVoxaDone();
      return;
    }

    if (type === 'conversation.item.input_audio_transcription.completed' && typeof event.transcript === 'string') {
      this.callbacks?.onCaption?.('user', event.transcript);
      return;
    }

    if (type === 'error') {
      realtimeLog('server_error');
      this.callbacks?.onFatalError('The voice session reported an error.');
    }
  }

  private markSessionReady() {
    if (this.sessionReadySent || this.cleaned) return;
    this.sessionReadySent = true;
    this.callbacks?.onSessionReady();
  }

  sendEvent(event: Record<string, unknown>) {
    if (!this.dc || this.dc.readyState !== 'open') return;
    try {
      this.dc.send(JSON.stringify(event));
    } catch {
      // ignore send after teardown
    }
  }

  setMuted(muted: boolean) {
    this.localStream?.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
    realtimeLog('mute_changed', { muted });
  }

  private async configureAudioSession() {
    try {
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        interruptionMode: 'duckOthers',
        shouldRouteThroughEarpiece: false,
      });
      realtimeLog('audio_session_configured', { platform: Platform.OS });
    } catch (err) {
      realtimeLog('audio_session_failed', {
        message: err instanceof Error ? err.message : 'unknown',
      });
    }
  }

  private async releaseAudioSession() {
    try {
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        interruptionMode: 'duckOthers',
        shouldRouteThroughEarpiece: false,
      });
    } catch {
      // ignore
    }
  }

  private onAppStateChange = (next: AppStateStatus) => {
    if (next === 'background' || next === 'inactive') {
      realtimeLog('app_background');
      // Keep call alive briefly; controller may end on prolonged background if desired.
    }
  };

  /** Idempotent teardown. */
  async cleanup(): Promise<void> {
    if (this.cleaned) {
      realtimeLog('cleanup_skipped_duplicate');
      return;
    }
    this.cleaned = true;
    realtimeLog('cleanup_started');

    this.appStateSub?.remove();
    this.appStateSub = null;

    try {
      this.localStream?.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {
          // ignore
        }
      });
    } catch {
      // ignore
    }
    this.localStream = null;
    this.remoteStream = null;

    try {
      this.dc?.close();
    } catch {
      // ignore
    }
    this.dc = null;

    try {
      this.pc?.close();
    } catch {
      // ignore
    }
    this.pc = null;

    this.clientSecret = null;
    this.callbacks = null;
    this.voxaSpeaking = false;

    await this.releaseAudioSession();
    realtimeLog('cleanup_completed');
  }
}
