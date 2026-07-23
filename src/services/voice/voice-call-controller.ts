import { CompanionModeId, Message, VoiceSession } from '../../types';
import { IAIService, VoxaRepositories } from '../contracts';
import { MemoryIntelligenceService } from '../memory/memory-intelligence-service';
import { SessionStartResult, VoxaCompanionService } from '../voxa-companion-service';
import { FallbackVoicePipeline, FallbackVoicePipelineConfig } from './fallback-voice-pipeline';
import { createRealtimeVoiceService, IRealtimeVoiceService } from './realtime-voice-service';
import { createSpeechToTextService, ISpeechToTextService } from './speech-to-text-service';
import {
  getSharedTextToSpeechService,
  ITextToSpeechService,
  forceStopAllTts,
} from './text-to-speech-service';
import { VoiceRecordingService } from './voice-recording-service';
import { VoiceConnectionState, VoiceTranscriptEntry } from './voice-engine';
import { VoiceTranscriptStore, StoredVoiceTranscript } from './voice-transcript-store';
import { audioSessionManager } from '../audio/audio-session-manager';
import { recordVoiceError, setVoiceDebugState, voiceLog } from './voice-debug-state';
import { resolveVoiceIdentity, resolveVoiceSpeechConfig } from './voice-identity-resolver';
import { VoiceWatchdog, VOICE_STUCK_MESSAGE } from './voice-watchdog';

export type VoiceCallControllerEvents = {
  onStateChange: (state: VoiceConnectionState) => void;
  onTranscript: (entry: VoiceTranscriptEntry) => void;
  onTimerTick: (seconds: number) => void;
  onError: (error: Error) => void;
};

export type ActiveVoiceCall = {
  session: VoiceSession;
  conversationId: string;
  openingMessage: Message;
  mode: CompanionModeId;
  isSafeCall: boolean;
};

const noopEvents: VoiceCallControllerEvents = {
  onStateChange: () => undefined,
  onTranscript: () => undefined,
  onTimerTick: () => undefined,
  onError: () => undefined,
};

export class VoiceCallController {
  private pipeline: FallbackVoicePipeline | null = null;
  private timerHandle: ReturnType<typeof setInterval> | null = null;
  private seconds = 0;
  private activeCall: ActiveVoiceCall | null = null;
  private events: VoiceCallControllerEvents = noopEvents;
  private watchdog = new VoiceWatchdog({
    onTimeout: () => {
      void this.forceResetVoice(VOICE_STUCK_MESSAGE);
    },
  });

  readonly stt: ISpeechToTextService;
  readonly tts: ITextToSpeechService;
  readonly realtime: IRealtimeVoiceService;
  readonly recording: VoiceRecordingService;
  readonly transcriptStore: VoiceTranscriptStore;

  constructor(
    private readonly companion: VoxaCompanionService,
    private readonly ai: IAIService,
    private readonly repositories: VoxaRepositories,
    private readonly memoryEngine: MemoryIntelligenceService,
    private readonly transcriptStoreInstance: VoiceTranscriptStore,
  ) {
    this.stt = createSpeechToTextService(ai);
    this.tts = getSharedTextToSpeechService();
    this.realtime = createRealtimeVoiceService();
    this.recording = new VoiceRecordingService();
    this.transcriptStore = transcriptStoreInstance;
  }

  bindEvents(events: VoiceCallControllerEvents) {
    this.events = events;
  }

  get activeSession() {
    return this.activeCall?.session ?? null;
  }

  get callDurationSeconds() {
    return this.seconds;
  }

  async listCallHistory(userId: string, limit = 8): Promise<VoiceSession[]> {
    const sessions = await this.repositories.voiceSessions.listSessions(userId);
    return sessions.filter((item) => item.state === 'ended').slice(0, limit);
  }

  async getStoredTranscript(sessionId: string) {
    return this.transcriptStore.getTranscript(sessionId);
  }

  async forceResetVoice(errorMessage?: string): Promise<void> {
    voiceLog('VOICE FORCE RESET');
    audioSessionManager.voiceCallActive = false;
    this.watchdog.stop();
    this.stopTimer();

    const call = this.activeCall;
    const duration = this.seconds;
    this.activeCall = null;
    this.seconds = 0;

    try {
      await this.pipeline?.forceStop();
    } catch {
      // ignore
    }
    this.pipeline = null;

    try {
      await this.recording.cancel();
    } catch {
      // ignore
    }
    try {
      await forceStopAllTts();
    } catch {
      // ignore
    }
    try {
      await audioSessionManager.forceReset();
    } catch {
      // ignore
    }

    setVoiceDebugState({ recorderActive: false, callState: 'disconnected' });
    this.events.onStateChange('disconnected');

    if (call) {
      try {
        await this.companion.endVoiceSession(call.session.id, duration);
      } catch {
        // ignore cleanup errors
      }
    }

    if (errorMessage) {
      recordVoiceError(errorMessage);
      this.events.onError(new Error(errorMessage));
    }
  }

  async startCall(userId: string, mode: CompanionModeId = 'friend'): Promise<ActiveVoiceCall> {
    await this.forceResetVoice();
    voiceLog('VOICE SESSION CLEAN START', 'standard call');
    const result = await this.companion.startVoiceSession(userId, mode);
    await this.bootPipeline(result, false);
    return this.activeCall!;
  }

  async startSafeCall(userId: string): Promise<ActiveVoiceCall> {
    await this.forceResetVoice();
    voiceLog('VOICE SESSION CLEAN START', 'safe call');
    const result = await this.companion.startSafeCallSession(userId);
    await this.bootPipeline(result, true);
    return this.activeCall!;
  }

  private async bootPipeline(result: SessionStartResult, isSafeCall: boolean) {
    const profile = await this.repositories.userProfile.getProfile();
    if (!profile) throw new Error('Profile not found.');

    this.activeCall = {
      session: result.voiceSession,
      conversationId: result.conversation.id,
      openingMessage: result.openingMessage,
      mode: result.voiceSession.mode,
      isSafeCall,
    };
    audioSessionManager.voiceCallActive = true;

    const history = await this.repositories.messages.listMessages(result.conversation.id);
    const personality = profile.preferences.voicePersonality;

    const config: FallbackVoicePipelineConfig = {
      userId: profile.id,
      conversationId: result.conversation.id,
      sessionId: result.voiceSession.id,
      mode: result.voiceSession.mode,
      personality,
      profile,
      isSafeCall,
      buildReplyExtension: (userText) =>
        this.companion.buildVoiceIntelligenceExtension({
          userId: profile.id,
          conversationId: result.conversation.id,
          userMessage: userText,
          mode: result.voiceSession.mode,
        }),
    };

    this.pipeline = new FallbackVoicePipeline(
      this.ai,
      this.stt,
      this.tts,
      this.recording,
      this.transcriptStore,
      this.memoryEngine,
      {
        onStateChange: (state) => {
          this.watchdog.setState(state);
          setVoiceDebugState({ callState: state });
          this.events.onStateChange(state);
        },
        onTranscript: (entry) => this.events.onTranscript(entry),
        onError: (error) => {
          recordVoiceError(error.message);
          this.events.onError(error);
        },
      },
      (turn) => this.persistVoiceTurn(turn),
    );
    this.pipeline.setConversationHistory(history);

    this.startTimer();
    this.watchdog.start();
    this.watchdog.setState('connecting');
    await this.pipeline.start(config, result.openingMessage.content);
  }

  async endCall() {
    await this.forceResetVoice();
  }

  setMicMuted(muted: boolean) {
    this.pipeline?.setMicMuted(muted);
  }

  setSpeakerEnabled(enabled: boolean) {
    this.pipeline?.setSpeakerEnabled(enabled);
  }

  async interrupt() {
    await this.pipeline?.interrupt();
  }

  async speakPrompt(text: string) {
    const call = this.activeCall;
    const profile = await this.repositories.userProfile.getProfile();
    if (!call || !profile || !this.pipeline) return;

    await this.pipeline.speakExternal(
      {
        userId: profile.id,
        conversationId: call.conversationId,
        sessionId: call.session.id,
        mode: call.mode,
        personality: profile.preferences.voicePersonality,
        profile,
        isSafeCall: call.isSafeCall,
      },
      text,
    );
  }

  async testVoiceOutput(): Promise<void> {
    const profile = await this.repositories.userProfile.getProfile();
    if (!profile) throw new Error('Profile not found.');

    await this.recording.cancel();
    await audioSessionManager.forceReset();

    const identity = resolveVoiceIdentity(profile);
    const config = resolveVoiceSpeechConfig(identity, profile.preferences.voicePersonality);

    try {
      await this.tts.speak("Hi, I'm Voxa. I can hear you.", config);
    } catch {
      await forceStopAllTts();
      throw new Error('Voice test failed. Try Reset audio, then test again.');
    } finally {
      await forceStopAllTts();
      setVoiceDebugState({ callState: 'idle' });
    }
  }

  async testMicrophone(): Promise<void> {
    if (audioSessionManager.voiceCallActive) {
      throw new Error('End the voice call before testing the microphone.');
    }
    const locked = await audioSessionManager.acquireLock('voice');
    if (!locked) throw new Error('Audio is busy. Try Reset audio first.');
    try {
      await audioSessionManager.startRecording('voice');
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const uri = await audioSessionManager.stopRecording();
      if (!uri) throw new Error('No audio captured. Check microphone permission.');
      voiceLog('VOICE MIC TEST OK');
    } finally {
      await audioSessionManager.releaseLock('voice');
    }
  }

  async testSpeaker(): Promise<void> {
    await this.testVoiceOutput();
  }

  async resetAudio(): Promise<void> {
    await this.forceResetVoice();
    await audioSessionManager.forceReset();
    voiceLog('AUDIO RESET COMPLETE');
  }

  private async persistVoiceTurn(input: {
    sessionId: string;
    conversationId: string;
    userText?: string;
    voxaText: string;
    mode: CompanionModeId;
  }) {
    const session = await this.repositories.voiceSessions.getSession(input.sessionId);
    const ids = [...(session?.transcriptMessageIds ?? [])];

    if (input.userText) {
      const userMessage = await this.repositories.messages.createMessage({
        conversationId: input.conversationId,
        role: 'user',
        content: input.userText,
        mode: input.mode,
        metadata: { channel: 'voice' },
      });
      ids.push(userMessage.id);
    }

    const voxaMessage = await this.repositories.messages.createMessage({
      conversationId: input.conversationId,
      role: 'voxa',
      content: input.voxaText,
      mode: input.mode,
      metadata: { channel: 'voice' },
    });
    ids.push(voxaMessage.id);

    await this.repositories.voiceSessions.updateSession(input.sessionId, {
      transcriptMessageIds: ids,
    });

    if (this.pipeline && this.activeCall) {
      const history = await this.repositories.messages.listMessages(input.conversationId);
      this.pipeline.setConversationHistory(history);
    }

    if (input.userText && this.activeCall) {
      const profile = await this.repositories.userProfile.getProfile();
      if (profile) {
        void this.companion.afterVoiceTurn({
          userId: profile.id,
          userMessage: input.userText,
          voxaReply: input.voxaText,
          mode: input.mode,
        });
      }
    }
  }

  private startTimer() {
    this.seconds = 0;
    this.timerHandle = setInterval(() => {
      this.seconds += 1;
      this.events.onTimerTick(this.seconds);
    }, 1000);
  }

  private stopTimer() {
    if (this.timerHandle) clearInterval(this.timerHandle);
    this.timerHandle = null;
  }
}

let globalVoiceController: VoiceCallController | null = null;

export function getOrCreateVoiceCallController(input: {
  companion: VoxaCompanionService;
  ai: IAIService;
  repositories: VoxaRepositories;
  memoryEngine: MemoryIntelligenceService;
  storage: import('../contracts').IStorageService;
}): VoiceCallController {
  if (!globalVoiceController) {
    const transcriptStore = new VoiceTranscriptStore(input.storage);
    globalVoiceController = new VoiceCallController(
      input.companion,
      input.ai,
      input.repositories,
      input.memoryEngine,
      transcriptStore,
    );
  }
  return globalVoiceController;
}

export function createVoiceCallController(input: {
  companion: VoxaCompanionService;
  ai: IAIService;
  repositories: VoxaRepositories;
  memoryEngine: MemoryIntelligenceService;
  storage: import('../contracts').IStorageService;
  events: VoiceCallControllerEvents;
}) {
  const controller = getOrCreateVoiceCallController(input);
  controller.bindEvents(input.events);
  return controller;
}

export type { StoredVoiceTranscript };
