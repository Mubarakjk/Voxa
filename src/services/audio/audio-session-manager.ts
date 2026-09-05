import {
  AudioModule,
  RecordingPresets,
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
  type AudioRecorder,
} from 'expo-audio';
import * as Speech from 'expo-speech';

export type AudioLockOwner = 'voice' | 'music' | 'tts' | 'idle';

const VOICE_RECORDING_OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,
  numberOfChannels: 1,
  isMeteringEnabled: true,
};

function audioLog(event: string, detail?: string) {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return;
  console.log(`[Voxa] ${detail ? `${event} · ${detail}` : event}`);
}

class AudioSessionManager {
  private lockOwner: AudioLockOwner = 'idle';
  private queue: Promise<void> = Promise.resolve();
  private recording: AudioRecorder | null = null;
  private playbackPlayer: AudioPlayer | null = null;
  voiceCallActive = false;

  getLockOwner() {
    return this.lockOwner;
  }

  isLockedBy(owner: AudioLockOwner) {
    return this.lockOwner === owner;
  }

  isMicBusy() {
    return this.lockOwner !== 'idle';
  }

  private runExclusive<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const task = this.queue.then(fn, fn);
    this.queue = task.then(
      () => undefined,
      () => undefined,
    );
    return task;
  }

  async acquireLock(owner: AudioLockOwner): Promise<boolean> {
    return this.runExclusive(`AUDIO LOCK ${owner}`, async () => {
      if (this.voiceCallActive && owner === 'music') {
        audioLog('AUDIO LOCK DENIED', `${owner} · voice call active`);
        return false;
      }
      if (
        (owner === 'voice' && this.lockOwner === 'music') ||
        (owner === 'music' && (this.lockOwner === 'voice' || this.voiceCallActive))
      ) {
        audioLog('AUDIO LOCK DENIED', `${owner} · held by ${this.lockOwner}`);
        return false;
      }
      if (this.lockOwner !== 'idle' && this.lockOwner !== owner) {
        audioLog('AUDIO LOCK DENIED', `${owner} · held by ${this.lockOwner}`);
        return false;
      }
      await this.forceReleaseRecorder();
      Speech.stop();
      await this.unloadPlaybackSound();
      this.lockOwner = owner;
      audioLog('AUDIO LOCK ACQUIRED', owner);
      return true;
    });
  }

  async releaseLock(owner: AudioLockOwner) {
    return this.runExclusive(`AUDIO RELEASE ${owner}`, async () => {
      if (this.lockOwner !== owner) return;
      await this.forceReleaseRecorder();
      await this.unloadPlaybackSound();
      this.lockOwner = 'idle';
      audioLog('AUDIO LOCK RELEASED', owner);
    });
  }

  async forceReset() {
    return this.runExclusive('AUDIO FORCE RESET', async () => {
      Speech.stop();
      await this.forceReleaseRecorder();
      await this.unloadPlaybackSound();
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
      this.lockOwner = 'idle';
      audioLog('RECORDER FORCE RELEASED');
      audioLog('AUDIO LOCK RELEASED', 'force');
    });
  }

  async setPlaybackMode() {
    await setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'duckOthers',
      shouldRouteThroughEarpiece: false,
    });
    audioLog('AUDIO MODE PLAYBACK');
  }

  async setRecordingMode() {
    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'duckOthers',
      shouldRouteThroughEarpiece: false,
    });
    audioLog('AUDIO MODE RECORDING');
  }

  async prepareForPlayback(owner: AudioLockOwner) {
    const ok = await this.acquireLock(owner);
    if (!ok) throw new Error('Audio session busy');
    // Avoid a second Speech.stop() here — acquireLock already stopped speech.
    // Immediate stop + setAudioMode + speak races iOS and can suppress onStart.
    await this.forceReleaseRecorder();
    await this.setPlaybackMode();
  }

  async prepareForRecording(owner: AudioLockOwner, options = VOICE_RECORDING_OPTIONS) {
    const ok = await this.acquireLock(owner);
    if (!ok) throw new Error('Audio session busy');
    Speech.stop();
    await this.unloadPlaybackSound();
    await this.forceReleaseRecorder();
    await this.setRecordingMode();
    return options;
  }

  registerPlaybackSound(player: AudioPlayer) {
    this.playbackPlayer = player;
  }

  async unloadPlaybackSound() {
    if (!this.playbackPlayer) return;
    try {
      this.playbackPlayer.pause();
      this.playbackPlayer.remove();
    } catch {
      // ignore
    }
    this.playbackPlayer = null;
  }

  async forceReleaseRecorder() {
    const active = this.recording;
    if (!active) return;
    try {
      const status = active.getStatus();
      if (status.isRecording || status.canRecord) {
        await active.stop();
      }
    } catch {
      try {
        await active.stop();
      } catch {
        // ignore
      }
    } finally {
      this.recording = null;
      audioLog('RECORDER FORCE RELEASED');
    }
  }

  async startRecording(owner: AudioLockOwner, options = VOICE_RECORDING_OPTIONS): Promise<void> {
    return this.runExclusive('REC START', async () => {
      const recordingOptions = await this.prepareForRecording(owner, options);
      const recording = new AudioModule.AudioRecorder(recordingOptions);
      await recording.prepareToRecordAsync(recordingOptions);
      recording.record();
      this.recording = recording;
    });
  }

  async stopRecording(): Promise<string | null> {
    return this.runExclusive('REC STOP', async () => {
      const active = this.recording;
      if (!active) return null;
      try {
        const status = active.getStatus();
        await active.stop();
        const uri = active.uri;
        if (!uri) return null;
        if (status.durationMillis != null && status.durationMillis < 500) {
          audioLog('REC STOP EMPTY', `${status.durationMillis}ms`);
        }
        return uri;
      } finally {
        this.recording = null;
      }
    });
  }

  async cancelRecording() {
    return this.runExclusive('REC CANCEL', async () => {
      await this.forceReleaseRecorder();
    });
  }

  isRecording() {
    return Boolean(this.recording);
  }

  async getRecordingMetering(): Promise<number> {
    if (!this.recording) return 0;
    try {
      const status = this.recording.getStatus();
      if (status.metering === undefined) return 0;
      return Math.max(0, Math.min(1, (status.metering + 60) / 60));
    } catch {
      return 0;
    }
  }

  async setSpeakerOutput(enabled: boolean): Promise<void> {
    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'duckOthers',
      shouldRouteThroughEarpiece: !enabled,
    });
  }

  async pauseRecording() {
    return this.runExclusive('REC PAUSE', async () => {
      if (!this.recording) return;
      const status = this.recording.getStatus();
      if (status.isRecording) {
        this.recording.pause();
      }
    });
  }

  async resumeRecording() {
    return this.runExclusive('REC RESUME', async () => {
      if (!this.recording) return;
      const status = this.recording.getStatus();
      if (status.canRecord && !status.isRecording) {
        this.recording.record();
      }
    });
  }

  async recordSample(owner: AudioLockOwner, durationMs: number): Promise<string> {
    await this.startRecording(owner);
    await new Promise((resolve) => setTimeout(resolve, durationMs));
    const uri = await this.stopRecording();
    if (!uri) throw new Error('Recording failed — no audio captured.');
    return uri;
  }
}

export const audioSessionManager = new AudioSessionManager();

export { VOICE_RECORDING_OPTIONS, createAudioPlayer };
