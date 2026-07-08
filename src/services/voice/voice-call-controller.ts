import { CompanionModeId, Message, UserProfile, VoiceSession } from '../../types';
import { VoicePersonality } from '../../types/user-profile';
import { IAIService, VoxaRepositories } from '../contracts';
import { MemoryIntelligenceService } from '../memory/memory-intelligence-service';
import { SessionStartResult, VoxaCompanionService } from '../voxa-companion-service';
import { FallbackVoicePipeline, FallbackVoicePipelineConfig } from './fallback-voice-pipeline';
import { createRealtimeVoiceService, IRealtimeVoiceService } from './realtime-voice-service';
import { createSpeechToTextService, ISpeechToTextService } from './speech-to-text-service';
import { createTextToSpeechService, ITextToSpeechService } from './text-to-speech-service';
import { VoiceRecordingService } from './voice-recording-service';
import { VoiceConnectionState, VoiceTranscriptEntry } from './voice-engine';
import { VoiceTranscriptStore, StoredVoiceTranscript } from './voice-transcript-store';
import { recordVoiceError, setVoiceDebugState, voiceLog } from './voice-debug-state';

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

export class VoiceCallController {
  private pipeline: FallbackVoicePipeline | null = null;
  private timerHandle: ReturnType<typeof setInterval> | null = null;
  private seconds = 0;
  private activeCall: ActiveVoiceCall | null = null;

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
    private readonly events: VoiceCallControllerEvents,
  ) {
    this.stt = createSpeechToTextService(ai);
    this.tts = createTextToSpeechService();
    this.realtime = createRealtimeVoiceService();
    this.recording = new VoiceRecordingService();
    this.transcriptStore = transcriptStoreInstance;
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

  async startCall(userId: string, mode: CompanionModeId = 'friend'): Promise<ActiveVoiceCall> {
    if (this.activeCall) {
      throw new Error('A voice call is already active.');
    }
    voiceLog('VOICE START', 'standard call');
    const result = await this.companion.startVoiceSession(userId, mode);
    await this.bootPipeline(result, false);
    return this.activeCall!;
  }

  async startSafeCall(userId: string): Promise<ActiveVoiceCall> {
    if (this.activeCall) {
      throw new Error('A voice call is already active.');
    }
    voiceLog('VOICE START', 'safe call');
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
    await this.pipeline.start(config, result.openingMessage.content);
  }

  async endCall() {
    const call = this.activeCall;
    if (!call) return;

    voiceLog('VOICE END');
    const duration = this.seconds;
    this.activeCall = null;
    this.stopTimer();

    try {
      await this.pipeline?.stop();
    } catch (error) {
      recordVoiceError(error instanceof Error ? error.message : 'End call cleanup failed');
    } finally {
      this.pipeline = null;
      setVoiceDebugState({ recorderActive: false, callState: 'disconnected' });
    }

    try {
      await this.companion.endVoiceSession(call.session.id, duration);
    } catch (error) {
      recordVoiceError(error instanceof Error ? error.message : 'Failed to end voice session');
    }
    this.seconds = 0;
    this.events.onStateChange('disconnected');
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

export function createVoiceCallController(input: {
  companion: VoxaCompanionService;
  ai: IAIService;
  repositories: VoxaRepositories;
  memoryEngine: MemoryIntelligenceService;
  storage: import('../contracts').IStorageService;
  events: VoiceCallControllerEvents;
}) {
  const transcriptStore = new VoiceTranscriptStore(input.storage);
  return new VoiceCallController(
    input.companion,
    input.ai,
    input.repositories,
    input.memoryEngine,
    transcriptStore,
    input.events,
  );
}

export type { StoredVoiceTranscript };
