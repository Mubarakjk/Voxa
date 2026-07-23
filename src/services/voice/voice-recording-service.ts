import { requestMicrophonePermission } from '../attachments/attachment-permissions';
import { audioSessionManager } from '../audio/audio-session-manager';
import { recordVoiceError, setVoiceDebugState, voiceLog } from './voice-debug-state';

export class VoiceRecordingService {
  private readonly owner = 'voice' as const;

  async ensurePermission(): Promise<boolean> {
    return requestMicrophonePermission();
  }

  isRecording() {
    return audioSessionManager.isRecording() && audioSessionManager.isLockedBy(this.owner);
  }

  async start(): Promise<void> {
    if (audioSessionManager.isMicBusy() && !audioSessionManager.isLockedBy(this.owner)) {
      voiceLog('VOICE RECORDING START skipped', 'audio lock held');
      await audioSessionManager.forceReset();
    }

    try {
      await audioSessionManager.startRecording(this.owner);
      setVoiceDebugState({ recorderActive: true });
      voiceLog('VOICE RECORDING START');
    } catch (error) {
      setVoiceDebugState({ recorderActive: false });
      const message = error instanceof Error ? error.message : 'Recording failed';
      recordVoiceError(message);
      await audioSessionManager.releaseLock(this.owner);
      throw error;
    }
  }

  async stop(): Promise<string | null> {
    try {
      const uri = await audioSessionManager.stopRecording();
      voiceLog('VOICE RECORDING STOP', uri ? 'ok' : 'empty');
      return uri;
    } finally {
      setVoiceDebugState({ recorderActive: false });
      await audioSessionManager.releaseLock(this.owner);
    }
  }

  async cancel() {
    await audioSessionManager.cancelRecording();
    await audioSessionManager.releaseLock(this.owner);
    setVoiceDebugState({ recorderActive: false });
    voiceLog('VOICE RECORDING CANCEL');
  }

  async resetAudioMode() {
    await audioSessionManager.setPlaybackMode();
  }
}
