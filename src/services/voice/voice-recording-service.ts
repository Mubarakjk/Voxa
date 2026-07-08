import { Audio } from 'expo-av';

import { requestMicrophonePermission } from '../attachments/attachment-permissions';
import { recordVoiceError, setVoiceDebugState, voiceLog } from './voice-debug-state';

export class VoiceRecordingService {
  private recording: Audio.Recording | null = null;
  private operationLock: Promise<void> = Promise.resolve();
  private isStarting = false;

  async ensurePermission(): Promise<boolean> {
    return requestMicrophonePermission();
  }

  isRecording() {
    return Boolean(this.recording);
  }

  private runExclusive<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const task = this.operationLock.then(async () => {
      try {
        return await fn();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        recordVoiceError(`${label}: ${message}`);
        throw error;
      }
    });
    this.operationLock = task.then(
      () => undefined,
      () => undefined,
    );
    return task;
  }

  private async forceRelease() {
    const active = this.recording;
    if (!active) {
      setVoiceDebugState({ recorderActive: false });
      return;
    }

    try {
      const status = await active.getStatusAsync();
      if (status.isRecording) {
        await active.stopAndUnloadAsync();
      } else if (status.canRecord) {
        await active.stopAndUnloadAsync();
      } else {
        await active.stopAndUnloadAsync();
      }
    } catch {
      try {
        await active.stopAndUnloadAsync();
      } catch {
        // ignore secondary unload errors
      }
    } finally {
      this.recording = null;
      this.isStarting = false;
      setVoiceDebugState({ recorderActive: false });
    }
  }

  async start(): Promise<void> {
    if (this.isStarting || this.recording) {
      voiceLog('VOICE RECORDING START skipped', 'recorder busy');
      return;
    }

    return this.runExclusive('VOICE RECORDING START', async () => {
      this.isStarting = true;
      await this.forceRelease();

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      this.recording = recording;
      this.isStarting = false;
      setVoiceDebugState({ recorderActive: true });
      voiceLog('VOICE RECORDING START');
    });
  }

  async stop(): Promise<string | null> {
    return this.runExclusive('VOICE RECORDING STOP', async () => {
      const active = this.recording;
      if (!active) {
        voiceLog('VOICE RECORDING STOP skipped', 'no recorder');
        return null;
      }

      try {
        await active.stopAndUnloadAsync();
        const uri = active.getURI();
        voiceLog('VOICE RECORDING STOP', uri ? 'ok' : 'empty');
        return uri;
      } finally {
        this.recording = null;
        this.isStarting = false;
        setVoiceDebugState({ recorderActive: false });
      }
    });
  }

  async cancel() {
    await this.runExclusive('VOICE RECORDING CANCEL', async () => {
      await this.forceRelease();
      voiceLog('VOICE RECORDING CANCEL');
    });
  }

  async resetAudioMode() {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch {
      // ignore
    }
  }
}
