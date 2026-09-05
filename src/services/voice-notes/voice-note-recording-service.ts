import {
  AudioModule,
  RecordingPresets,
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  type AudioRecorder,
  type RecorderState,
  type RecordingStatus,
} from 'expo-audio';
import { Alert, AppState, Linking, type AppStateStatus } from 'react-native';

type EventSubscription = { remove: () => void };

import { patchVoiceNoteDebug, recordVoiceNoteError, type VoiceNoteRecorderState } from './voice-note-debug-state';
import { deleteVoiceNoteFile, validateVoiceNoteFile } from './voice-note-file-service';
import { voiceNoteAudioLock } from './voice-note-audio-lock';
import { voiceNoteLog } from './voice-note-logger';
import { voiceNotePlaybackService } from './voice-note-playback-service';
import {
  formatSafeRecorderStatus,
  patchVoiceNoteRecordingDiagnostics,
  pushVoiceNoteRawStatus,
  recordVoiceNoteNativeError,
  recordVoiceNoteStartStep,
  resetVoiceNoteRecordingDiagnostics,
} from './voice-note-recording-diagnostics';

const RECORDING_OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,
  numberOfChannels: 1,
  isMeteringEnabled: true,
};

const START_TIMEOUT_MS = 4000;
const LOCK_OWNER = 'voice-note-recording' as const;

export type VoiceNoteRecordingSnapshot = {
  state: VoiceNoteRecorderState;
  durationMs: number;
  metering: number;
  uri: string | null;
  sizeBytes: number | null;
  errorMessage: string | null;
  isRecording: boolean;
  canRecord: boolean;
};

type Listener = (snapshot: VoiceNoteRecordingSnapshot) => void;

function normalizeMetering(value: number | undefined): number {
  if (value === undefined) return 0;
  return Math.max(0, Math.min(1, (value + 60) / 60));
}

class VoiceNoteRecordingService {
  private state: VoiceNoteRecorderState = 'idle';
  private recorder: AudioRecorder | null = null;
  private statusSubscription: EventSubscription | null = null;
  private appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;
  private startGuard: Promise<void> | null = null;
  private resetting = false;
  private listeners = new Set<Listener>();
  private durationMs = 0;
  private metering = 0;
  private uri: string | null = null;
  private sizeBytes: number | null = null;
  private errorMessage: string | null = null;
  private permissionGranted: boolean | null = null;
  private recorderPrepared = false;
  private isRecording = false;
  private canRecord = false;
  private durationWatchdogTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.appStateSubscription = AppState.addEventListener('change', (next: AppStateStatus) => {
      patchVoiceNoteRecordingDiagnostics({ appState: next });
      if (next === 'background' && this.state === 'recording') {
        recordVoiceNoteStartStep('wait_native_duration', 'app_background');
        this.pause();
      }
    });
  }

  getRawRecorderStatus(): RecorderState | null {
    if (!this.recorder) return null;
    try {
      const status = this.recorder.getStatus();
      pushVoiceNoteRawStatus(status);
      return status;
    } catch (err) {
      recordVoiceNoteNativeError(err instanceof Error ? err.message : 'getStatus_failed');
      return null;
    }
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  getSnapshot(): VoiceNoteRecordingSnapshot {
    return {
      state: this.state,
      durationMs: this.durationMs,
      metering: this.metering,
      uri: this.uri,
      sizeBytes: this.sizeBytes,
      errorMessage: this.errorMessage,
      isRecording: this.isRecording,
      canRecord: this.canRecord,
    };
  }

  async requestPermission(): Promise<boolean> {
    voiceNoteLog('PERMISSION_REQUEST');
    recordVoiceNoteStartStep('permission_request');
    this.setState('requesting_permission');
    const existing = await getRecordingPermissionsAsync();
    patchVoiceNoteRecordingDiagnostics({ permissionStatus: existing.status });
    const { granted, status } = await requestRecordingPermissionsAsync();
    this.permissionGranted = granted;
    patchVoiceNoteDebug({ permissionGranted: granted });
    patchVoiceNoteRecordingDiagnostics({ permissionStatus: status, permissionGranted: granted });
    recordVoiceNoteStartStep('permission_result', granted ? 'granted' : 'denied');
    if (granted) {
      voiceNoteLog('PERMISSION_GRANTED');
      this.setState('idle');
    } else {
      voiceNoteLog('ERROR', 'permission_denied');
      Alert.alert(
        'Microphone access needed',
        'Allow microphone access in Settings to record voice notes.',
        [
          { text: 'Not now', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => {
              void Linking.openSettings();
            },
          },
        ],
      );
      this.setState('idle');
    }
    return granted;
  }

  async start(): Promise<void> {
    if (this.startGuard) return this.startGuard;
    if (this.state === 'recording' || this.state === 'preparing' || this.state === 'paused') {
      voiceNoteLog('ERROR', 'duplicate_start');
      return;
    }

    this.startGuard = this.runStart().finally(() => {
      this.startGuard = null;
    });
    return this.startGuard;
  }

  private async runStart() {
    resetVoiceNoteRecordingDiagnostics();
    patchVoiceNoteRecordingDiagnostics({ startStatus: 'pending', audioOwner: voiceNoteAudioLock.getOwner() });
    voiceNoteLog('RECORD_TAP');
    this.errorMessage = null;
    this.uri = null;
    this.sizeBytes = null;

    await voiceNotePlaybackService.stop();

    if (!this.permissionGranted) {
      const granted = await this.requestPermission();
      if (!granted) {
        patchVoiceNoteRecordingDiagnostics({ startStatus: 'rejected', startError: 'permission_denied', flowStoppedAt: 'permission_result' });
        return;
      }
    }

    if (!voiceNoteAudioLock.acquire(LOCK_OWNER)) {
      patchVoiceNoteRecordingDiagnostics({ startStatus: 'rejected', startError: 'audio_lock_denied', flowStoppedAt: 'audio_lock_acquire' });
      await this.fail('Audio is busy. Stop playback and try again.');
      return;
    }
    recordVoiceNoteStartStep('audio_lock_acquire', LOCK_OWNER);
    patchVoiceNoteRecordingDiagnostics({ audioOwner: voiceNoteAudioLock.getOwner() });

    try {
      this.setState('preparing');
      voiceNoteLog('PREPARE_START');
      recordVoiceNoteStartStep('set_audio_mode');
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      patchVoiceNoteRecordingDiagnostics({ audioModeConfigured: true });

      recordVoiceNoteStartStep('recorder_create');
      this.recorder = new AudioModule.AudioRecorder(RECORDING_OPTIONS);
      patchVoiceNoteRecordingDiagnostics({ recorderCreated: true });
      this.attachStatusListener(this.recorder);

      recordVoiceNoteStartStep('prepare_to_record_start');
      patchVoiceNoteRecordingDiagnostics({ prepareStatus: 'pending' });
      await this.recorder.prepareToRecordAsync(RECORDING_OPTIONS);
      patchVoiceNoteRecordingDiagnostics({ prepareStatus: 'resolved' });
      recordVoiceNoteStartStep('prepare_to_record_success');
      this.recorderPrepared = true;
      patchVoiceNoteDebug({ recorderPrepared: true, lockOwner: LOCK_OWNER });
      voiceNoteLog('PREPARE_SUCCESS');

      recordVoiceNoteStartStep('record_call');
      this.recorder.record();
      patchVoiceNoteRecordingDiagnostics({ recordCalled: true });
      voiceNoteLog('RECORDING_START');

      recordVoiceNoteStartStep('wait_native_is_recording');
      const nativeReady = await this.waitForNativeRecording();
      if (!nativeReady.ok) {
        patchVoiceNoteRecordingDiagnostics({
          startStatus: 'rejected',
          startError: nativeReady.error ?? 'native_start_timeout',
        });
        await this.fail(nativeReady.error ?? 'Microphone could not start.');
        return;
      }

      patchVoiceNoteRecordingDiagnostics({ startStatus: 'resolved' });
      recordVoiceNoteStartStep('start_complete');
      this.setState('recording');
      this.startDurationWatchdog();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'prepare_failed';
      patchVoiceNoteRecordingDiagnostics({
        prepareStatus: 'rejected',
        startStatus: 'rejected',
        startError: message.slice(0, 120),
      });
      recordVoiceNoteStartStep('prepare_to_record_failure', message);
      await this.fail(message);
    }
  }

  private attachStatusListener(recorder: AudioRecorder) {
    this.detachStatusListener();
    this.statusSubscription = recorder.addListener('recordingStatusUpdate', (status: RecordingStatus) => {
      if (status.hasError && status.error) {
        recordVoiceNoteNativeError(status.error);
      }
      this.syncFromRecorder();
    });
  }

  private detachStatusListener() {
    this.statusSubscription?.remove();
    this.statusSubscription = null;
  }

  private syncFromRecorder() {
    const status = this.getRawRecorderStatus();
    if (!status) return;
    this.applyRecorderStatus(status);
  }

  private applyRecorderStatus(status: RecorderState) {
    patchVoiceNoteRecordingDiagnostics({ audioOwner: voiceNoteAudioLock.getOwner() });
    this.durationMs = status.durationMillis ?? 0;
    this.metering = normalizeMetering(status.metering);
    this.isRecording = Boolean(status.isRecording);
    this.canRecord = Boolean(status.canRecord);
    patchVoiceNoteDebug({
      durationMs: this.durationMs,
      isRecording: this.isRecording,
      lockOwner: voiceNoteAudioLock.getOwner(),
    });
    if (this.state === 'recording' || this.state === 'paused') {
      voiceNoteLog('STATUS', `duration=${this.durationMs} recording=${this.isRecording}`);
    }
    this.emit();
  }

  private waitForNativeRecording(): Promise<{ ok: boolean; error?: string }> {
    return new Promise((resolve) => {
      const startedAt = Date.now();
      let sawRecording = false;
      const tick = () => {
        const status = this.getRawRecorderStatus();
        if (status?.isRecording) {
          sawRecording = true;
          recordVoiceNoteStartStep('wait_native_duration');
        }
        if (status && status.durationMillis > 0) {
          resolve({ ok: true });
          return;
        }
        if (Date.now() - startedAt >= START_TIMEOUT_MS) {
          const safe = formatSafeRecorderStatus(status);
          const step = sawRecording ? 'wait_native_duration' : 'wait_native_is_recording';
          patchVoiceNoteRecordingDiagnostics({ flowStoppedAt: step });
          if (!sawRecording) {
            resolve({
              ok: false,
              error: `step=wait_native_is_recording · ${safe} · owner=${voiceNoteAudioLock.getOwner() ?? 'idle'}`,
            });
          } else {
            resolve({
              ok: false,
              error: `step=wait_native_duration · isRecording=true · durationMillis=0 · ${safe} · owner=${voiceNoteAudioLock.getOwner() ?? 'idle'}`,
            });
          }
          return;
        }
        setTimeout(tick, 100);
      };
      tick();
    });
  }

  private startDurationWatchdog() {
    this.clearDurationWatchdog();
    this.durationWatchdogTimer = setTimeout(() => {
      void (async () => {
        if (this.state !== 'recording' && this.state !== 'paused') return;
        const status = this.getRawRecorderStatus();
        if (!status || status.durationMillis <= 0) {
          recordVoiceNoteStartStep('duration_watchdog_failed', formatSafeRecorderStatus(status));
          patchVoiceNoteRecordingDiagnostics({ flowStoppedAt: 'duration_watchdog_failed' });
          await this.fail(
            `step=duration_watchdog · native duration remained 0 after 4s · ${formatSafeRecorderStatus(status)}`,
          );
        }
      })();
    }, START_TIMEOUT_MS);
  }

  private clearDurationWatchdog() {
    if (this.durationWatchdogTimer) {
      clearTimeout(this.durationWatchdogTimer);
      this.durationWatchdogTimer = null;
    }
  }

  pause() {
    if (this.state !== 'recording' || !this.recorder) return;
    this.recorder.pause();
    this.syncFromRecorder();
    this.setState('paused');
    voiceNoteLog('PAUSE');
  }

  resume() {
    if (this.state !== 'paused' || !this.recorder) return;
    this.recorder.record();
    this.syncFromRecorder();
    this.setState('recording');
    voiceNoteLog('RESUME');
  }

  async stop(): Promise<VoiceNoteRecordingSnapshot> {
    this.clearDurationWatchdog();
    if (this.state !== 'recording' && this.state !== 'paused') {
      voiceNoteLog('ERROR', 'stop_invalid_state');
      return this.getSnapshot();
    }

    voiceNoteLog('STOP_START');
    this.setState('stopping');
    try {
      if (this.recorder) {
        await this.recorder.stop();
        this.syncFromRecorder();
      }
      const uri = this.recorder?.uri ?? this.recorder?.getStatus().url ?? null;
      const validation = await validateVoiceNoteFile({ uri, durationMs: this.durationMs });
      if (!validation.ok) {
        if (validation.uri) await deleteVoiceNoteFile(validation.uri);
        await this.fail(this.errorLabel(validation.errorCode ?? 'invalid_file'));
        return this.getSnapshot();
      }

      this.uri = validation.uri ?? null;
      this.sizeBytes = validation.sizeBytes;
      this.durationMs = validation.durationMs;
      patchVoiceNoteDebug({
        uriExists: true,
        fileSizeBytes: validation.sizeBytes,
        durationMs: validation.durationMs,
      });
      voiceNoteLog('STOP_SUCCESS');
      voiceNoteLog('PREVIEW_READY');
      this.setState('ready');
      return this.getSnapshot();
    } catch (err) {
      await this.fail(err instanceof Error ? err.message : 'stop_failed');
      return this.getSnapshot();
    } finally {
      await this.cleanupRecorder();
      voiceNoteAudioLock.release(LOCK_OWNER);
    }
  }

  async cancel() {
    if (this.resetting) return;
    voiceNoteLog('CANCEL');
    await this.reset();
    this.setState('idle');
  }

  async reset() {
    if (this.resetting) return;
    this.resetting = true;
    this.clearDurationWatchdog();
    voiceNoteLog('RESET');
    try {
      await this.cleanupRecorder();
      this.durationMs = 0;
      this.metering = 0;
      this.uri = null;
      this.sizeBytes = null;
      this.errorMessage = null;
      voiceNoteAudioLock.release(LOCK_OWNER);
      patchVoiceNoteDebug({
        state: 'idle',
        recorderPrepared: false,
        isRecording: false,
        durationMs: 0,
        uriExists: false,
        fileSizeBytes: null,
        lockOwner: voiceNoteAudioLock.getOwner(),
      });
      this.state = 'idle';
      this.emit();
    } finally {
      this.resetting = false;
    }
  }

  private errorLabel(code: string): string {
    switch (code) {
      case 'too_short':
        return 'Recording was too short. Hold Record and speak for at least one second.';
      case 'file_too_small':
        return 'Recording was empty. Speak closer to the microphone and try again.';
      case 'file_missing':
        return 'Recording file was not saved.';
      default:
        return 'Could not save a valid recording.';
    }
  }

  private async fail(message: string) {
    recordVoiceNoteError(message);
    this.errorMessage = message;
    voiceNoteLog('ERROR', message.slice(0, 40));
    await this.cleanupRecorder();
    voiceNoteAudioLock.release(LOCK_OWNER);
    this.state = 'failed';
    patchVoiceNoteDebug({
      state: 'failed',
      lastError: message,
      lockOwner: voiceNoteAudioLock.getOwner(),
      recorderPrepared: false,
      isRecording: false,
    });
    this.emit();
  }

  private async cleanupRecorder() {
    this.detachStatusListener();
    if (!this.recorder) return;
    try {
      const status = this.recorder.getStatus();
      if (status.isRecording || status.canRecord) {
        await this.recorder.stop();
      }
    } catch (err) {
      voiceNoteLog('ERROR', err instanceof Error ? err.message : 'cleanup_stop_failed');
    }
    this.recorder = null;
    this.recorderPrepared = false;
    this.isRecording = false;
    this.canRecord = false;
  }

  private setState(next: VoiceNoteRecorderState) {
    this.state = next;
    patchVoiceNoteDebug({
      state: next,
      lockOwner: voiceNoteAudioLock.getOwner(),
      lastError: next === 'failed' ? this.errorMessage : null,
    });
    this.emit();
  }

  private emit() {
    const snap = this.getSnapshot();
    for (const listener of this.listeners) listener(snap);
  }
}

export const voiceNoteRecordingService = new VoiceNoteRecordingService();

export async function runVoiceNoteRecordingTest(): Promise<{
  pass: boolean;
  lines: string[];
}> {
  const lines: string[] = [];
  const push = (line: string) => {
    lines.push(line);
    voiceNoteLog('TEST', line);
  };

  await voiceNoteRecordingService.reset();
  const granted = await voiceNoteRecordingService.requestPermission();
  push(`permission=${granted}`);
  if (!granted) return { pass: false, lines };

  await voiceNoteRecordingService.start();
  await new Promise((r) => setTimeout(r, 3000));
  const snap = await voiceNoteRecordingService.stop();
  push(`durationMs=${snap.durationMs}`);
  push(`sizeBytes=${snap.sizeBytes ?? 0}`);
  push(`uriExists=${Boolean(snap.uri)}`);

  if (!snap.uri || !snap.sizeBytes) {
    push('result=fail');
    return { pass: false, lines };
  }

  try {
    await voiceNotePlaybackService.playPreview(snap.uri);
    push('playbackStarted=true');
    await new Promise((r) => setTimeout(r, 400));
    await voiceNotePlaybackService.stop();
    push('playbackStopped=true');
  } catch (err) {
    push(`playbackStarted=false:${err instanceof Error ? err.message : 'playback_failed'}`);
    return { pass: false, lines };
  }

  await voiceNoteRecordingService.reset();
  push('result=pass');
  return { pass: true, lines };
}
