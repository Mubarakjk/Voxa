import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';

export type AudioLockOwner = 'voice' | 'music' | 'tts' | 'idle';

const VOICE_RECORDING_OPTIONS = {
  isMeteringEnabled: true,
  android: {
    extension: '.m4a',
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
  },
  ios: {
    extension: '.m4a',
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: { mimeType: 'audio/webm', bitsPerSecond: 128000 },
};

function audioLog(event: string, detail?: string) {
  console.log(`[Voxa] ${detail ? `${event} · ${detail}` : event}`);
}

class AudioSessionManager {
  private lockOwner: AudioLockOwner = 'idle';
  private queue: Promise<void> = Promise.resolve();
  private recording: Audio.Recording | null = null;
  private playbackSound: Audio.Sound | null = null;
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
      if (
        this.voiceCallActive &&
        owner === 'music'
      ) {
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
      this.lockOwner = 'idle';
      audioLog('RECORDER FORCE RELEASED');
      audioLog('AUDIO LOCK RELEASED', 'force');
    });
  }

  async setPlaybackMode() {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    audioLog('AUDIO MODE PLAYBACK');
  }

  async setRecordingMode() {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    audioLog('AUDIO MODE RECORDING');
  }

  async prepareForPlayback(owner: AudioLockOwner) {
    const ok = await this.acquireLock(owner);
    if (!ok) throw new Error('Audio session busy');
    Speech.stop();
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

  registerPlaybackSound(sound: Audio.Sound) {
    this.playbackSound = sound;
  }

  async unloadPlaybackSound() {
    if (!this.playbackSound) return;
    try {
      await this.playbackSound.stopAsync();
      await this.playbackSound.unloadAsync();
    } catch {
      // ignore
    }
    this.playbackSound = null;
  }

  async forceReleaseRecorder() {
    const active = this.recording;
    if (!active) return;
    try {
      const status = await active.getStatusAsync();
      if (status.isRecording || status.canRecord) {
        await active.stopAndUnloadAsync();
      } else {
        await active.stopAndUnloadAsync();
      }
    } catch {
      try {
        await active.stopAndUnloadAsync();
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
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(recordingOptions);
      await recording.startAsync();
      this.recording = recording;
    });
  }

  async stopRecording(): Promise<string | null> {
    return this.runExclusive('REC STOP', async () => {
      const active = this.recording;
      if (!active) return null;
      try {
        const status = await active.getStatusAsync();
        await active.stopAndUnloadAsync();
        const uri = active.getURI();
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
      const status = await this.recording.getStatusAsync();
      if (status.metering === undefined) return 0;
      return Math.max(0, Math.min(1, (status.metering + 60) / 60));
    } catch {
      return 0;
    }
  }

  async setSpeakerOutput(enabled: boolean): Promise<void> {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: !enabled,
    });
  }

  async pauseRecording() {
    return this.runExclusive('REC PAUSE', async () => {
      if (!this.recording) return;
      const status = await this.recording.getStatusAsync();
      if (status.isRecording) {
        await this.recording.pauseAsync();
      }
    });
  }

  async resumeRecording() {
    return this.runExclusive('REC RESUME', async () => {
      if (!this.recording) return;
      const status = await this.recording.getStatusAsync();
      if (status.canRecord && !status.isRecording) {
        await this.recording.startAsync();
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

export { VOICE_RECORDING_OPTIONS };
