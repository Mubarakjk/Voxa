import { CompanionModeId, Memory, UserProfile, createUuid, nowIso } from '../../types';
import { VoicePersonality } from '../../types/user-profile';
import { hasOpenAIApiKey } from '../../config/env';
import { buildHumanStyleExtension } from '../personality/human-response-style';
import { MemoryIntelligenceService } from '../memory/memory-intelligence-service';
import { IAIService } from '../contracts';
import { ISpeechToTextService } from './speech-to-text-service';
import { ITextToSpeechService } from './text-to-speech-service';
import { VoiceRecordingService } from './voice-recording-service';
import { VoiceConnectionState, VoiceTranscriptEntry } from './voice-engine';
import { VoiceTranscriptStore } from './voice-transcript-store';
import { resolveVoiceIdentity, resolveVoiceSpeechConfig } from './voice-identity-resolver';
import { VoiceSpeechConfig } from '../../types/voice-identity';
import { recordOpenAiRequest, recordVoiceError, setVoiceDebugState, voiceLog } from './voice-debug-state';

const LISTEN_CHUNK_MS = 4500;
const STT_EMPTY_MESSAGE = "I couldn't hear that. Try speaking a little louder?";
const STT_UNAVAILABLE_MESSAGE = "I need OpenAI configured to hear you on voice calls. I can still read replies on screen.";

export type FallbackVoicePipelineConfig = {
  userId: string;
  conversationId: string;
  sessionId: string;
  mode: CompanionModeId;
  personality: VoicePersonality;
  profile: UserProfile;
  isSafeCall?: boolean;
  buildReplyExtension?: (userText: string) => Promise<string>;
};

export type FallbackVoicePipelineEvents = {
  onStateChange: (state: VoiceConnectionState) => void;
  onTranscript: (entry: VoiceTranscriptEntry) => void;
  onError: (error: Error) => void;
};

export class FallbackVoicePipeline {
  private active = false;
  private muted = false;
  private speakerEnabled = true;
  private listenLoopRunning = false;
  private turnBusy = false;
  private announcing = false;
  private currentState: VoiceConnectionState = 'idle';
  private sttUnavailableNotified = false;
  private conversationHistory: import('../../types').Message[] = [];
  private speechConfig: VoiceSpeechConfig | null = null;

  constructor(
    private readonly ai: IAIService,
    private readonly stt: ISpeechToTextService,
    private readonly tts: ITextToSpeechService,
    private readonly recording: VoiceRecordingService,
    private readonly transcriptStore: VoiceTranscriptStore,
    private readonly memoryEngine: MemoryIntelligenceService,
    private readonly events: FallbackVoicePipelineEvents,
    private readonly persistTurn: (input: {
      sessionId: string;
      conversationId: string;
      userText?: string;
      voxaText: string;
      mode: CompanionModeId;
    }) => Promise<void>,
  ) {}

  private setState(state: VoiceConnectionState) {
    if (this.currentState === state) return;
    this.currentState = state;
    setVoiceDebugState({ callState: state, orbState: state });
    voiceLog(`VOICE ${state.toUpperCase()}`);
    this.events.onStateChange(state);
  }

  private pushTranscript(entry: Omit<VoiceTranscriptEntry, 'id'>) {
    const full: VoiceTranscriptEntry = { ...entry, id: createUuid() };
    this.events.onTranscript(full);
    return full;
  }

  private resolveSpeechConfig(config: FallbackVoicePipelineConfig) {
    const identity = resolveVoiceIdentity(config.profile);
    this.speechConfig = resolveVoiceSpeechConfig(identity, config.personality);
    setVoiceDebugState({
      ttsProvider: hasOpenAIApiKey() ? 'OpenAI TTS' : 'expo-speech',
      sttProvider: this.stt.isAvailable() ? 'OpenAI Whisper' : 'unavailable',
    });
    return this.speechConfig;
  }

  async start(config: FallbackVoicePipelineConfig, openingText: string) {
    if (this.active) {
      voiceLog('VOICE START skipped', 'already active');
      return;
    }
    this.active = true;
    this.sttUnavailableNotified = false;
    voiceLog('VOICE START');
    this.setState('connecting');
    this.resolveSpeechConfig(config);

    const permitted = await this.recording.ensurePermission();
    if (!permitted) {
      this.active = false;
      recordVoiceError('Microphone permission denied');
      this.setState('error');
      throw new Error('Microphone permission is required for voice calls.');
    }

    this.setState('connected');

    this.announcing = true;
    this.turnBusy = true;
    try {
      voiceLog('VOICE TURN START', 'opening');
      await this.announce(config, openingText);
      voiceLog('VOICE TURN END', 'opening');
    } finally {
      this.announcing = false;
      this.turnBusy = false;
    }

    if (!this.stt.isAvailable() && !this.sttUnavailableNotified) {
      this.sttUnavailableNotified = true;
      await this.saySystem(config, STT_UNAVAILABLE_MESSAGE);
    }

    void this.runListenLoop(config);
  }

  async stop() {
    voiceLog('VOICE END');
    await this.forceStop();
    this.setState('disconnected');
  }

  async forceStop() {
    this.active = false;
    this.listenLoopRunning = false;
    this.turnBusy = false;
    this.announcing = false;
    await this.recording.cancel();
    await this.tts.stop();
    await this.recording.resetAudioMode();
    this.currentState = 'idle';
  }

  setMicMuted(muted: boolean) {
    this.muted = muted;
    if (muted) void this.recording.cancel();
  }

  setSpeakerEnabled(enabled: boolean) {
    this.speakerEnabled = enabled;
    this.tts.setMuted(!enabled);
  }

  async interrupt() {
    if (!this.active) return;
    voiceLog('VOICE INTERRUPT');
    await this.recording.cancel();
    await this.tts.stop();
    this.turnBusy = false;
    this.setState('interrupted');
    await sleep(250);
    if (this.active && !this.tts.isSpeaking()) {
      this.setState('listening');
    }
  }

  async speakExternal(config: FallbackVoicePipelineConfig, text: string) {
    if (!this.speechConfig) this.resolveSpeechConfig(config);
    await this.playVoxaSpeech(config, text, { persistMessages: true });
  }

  private async runListenLoop(config: FallbackVoicePipelineConfig) {
    if (this.listenLoopRunning) {
      voiceLog('VOICE LISTENING skipped', 'loop already running');
      return;
    }
    this.listenLoopRunning = true;

    try {
      while (this.active) {
        if (this.muted || this.announcing || this.turnBusy || this.tts.isSpeaking()) {
          await sleep(120);
          continue;
        }

        if (this.recording.isRecording()) {
          await sleep(80);
          continue;
        }

        this.setState('listening');

        try {
          voiceLog('VOICE TURN START');
          const uri = await this.captureChunk();
          if (!this.active) break;
          if (!uri) continue;

          this.turnBusy = true;
          voiceLog('VOICE THINKING');
          this.setState('thinking');

          const userText = await this.transcribe(uri);
          if (!this.active) break;

          if (!userText) {
            voiceLog('VOICE STT empty');
            await this.saySystem(config, STT_EMPTY_MESSAGE);
            continue;
          }

          voiceLog('VOICE STT ok', userText.slice(0, 40));

          const userEntry = this.pushTranscript({
            role: 'user',
            text: userText,
            timestamp: nowIso(),
            isFinal: true,
          });
          await this.transcriptStore.appendEntry({
            sessionId: config.sessionId,
            conversationId: config.conversationId,
            userId: config.userId,
            isSafeCall: Boolean(config.isSafeCall),
            entry: userEntry,
          });

          const started = Date.now();
          const voxaText = await this.generateReply(config, userText);
          recordOpenAiRequest(Date.now() - started);
          if (!this.active) break;

          await this.playVoxaSpeech(config, voxaText, { persistMessages: true, userText });
          voiceLog('VOICE TURN END');
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Voice loop failed.';
          recordVoiceError(message);
          await this.recording.cancel();
          this.events.onError(err instanceof Error ? err : new Error(message));
          this.setState('error');
          await sleep(800);
          if (this.active) this.setState('listening');
        } finally {
          this.turnBusy = false;
        }
      }
    } finally {
      this.listenLoopRunning = false;
    }
  }

  private async captureChunk(): Promise<string | null> {
    if (this.tts.isSpeaking()) return null;
    await this.recording.cancel();
    await sleep(150);
    voiceLog('VOICE RECORDING START');
    await this.recording.start();
    await sleep(LISTEN_CHUNK_MS);
    if (!this.active) {
      await this.recording.cancel();
      return null;
    }
    return this.recording.stop();
  }

  private async transcribe(uri: string) {
    if (!this.stt.isAvailable()) return null;
    try {
      const result = await this.stt.transcribe(uri);
      return result?.text?.trim() ?? null;
    } catch (err) {
      recordVoiceError(err instanceof Error ? err.message : 'STT failed');
      return null;
    }
  }

  private async generateReply(config: FallbackVoicePipelineConfig, userText: string) {
    const history = this.conversationHistory;
    const recentMessageTexts = history
      .filter((item) => item.role !== 'system')
      .slice(-6)
      .map((item) => item.content);

    let memories: Memory[] = [];
    if (config.profile.preferences.memoryEnabled) {
      memories = await this.memoryEngine.retrieveForPrompt(config.userId, {
        userMessage: userText,
        mode: config.mode,
        recentMessageTexts,
      });
    }

    const extension = config.buildReplyExtension
      ? await config.buildReplyExtension(userText)
      : buildHumanStyleExtension(true);

    const aiResult = await this.ai.generateReply({
      mode: config.mode,
      userMessage: userText,
      conversationHistory: history,
      userProfile: config.profile,
      memories,
      companionContextExtension: extension,
    });
    return aiResult.content;
  }

  private async announce(config: FallbackVoicePipelineConfig, text: string) {
    await this.playVoxaSpeech(config, text, { persistMessages: false });
  }

  private async saySystem(config: FallbackVoicePipelineConfig, text: string) {
    await this.playVoxaSpeech(config, text, { persistMessages: false, system: true });
  }

  private async playVoxaSpeech(
    config: FallbackVoicePipelineConfig,
    text: string,
    options: { persistMessages: boolean; userText?: string; system?: boolean },
  ) {
    await this.recording.cancel();
    await sleep(100);

    const entry = this.pushTranscript({
      role: 'voxa',
      text,
      timestamp: nowIso(),
      isFinal: true,
    });
    await this.transcriptStore.appendEntry({
      sessionId: config.sessionId,
      conversationId: config.conversationId,
      userId: config.userId,
      isSafeCall: Boolean(config.isSafeCall),
      entry,
    });

    if (options.persistMessages && !options.system) {
      await this.persistTurn({
        sessionId: config.sessionId,
        conversationId: config.conversationId,
        userText: options.userText,
        voxaText: text,
        mode: config.mode,
      });
    }

    if (this.speakerEnabled && this.speechConfig) {
      this.setState('speaking');
      const pauseMs = options.system ? 200 : 350 + Math.min(text.length * 6, 900);
      await sleep(pauseMs);
      await this.recording.resetAudioMode();
      await this.speakWithRetry(text, this.speechConfig);
      await this.waitForSpeechEnd(18_000);
    }

    if (this.active) {
      await sleep(150);
    }
  }

  /** Hard cap so speaking state cannot block the listen loop forever. */
  private async waitForSpeechEnd(maxMs: number) {
    const deadline = Date.now() + maxMs;
    while (this.active && this.tts.isSpeaking() && Date.now() < deadline) {
      await sleep(50);
    }
    if (this.tts.isSpeaking()) {
      voiceLog('VOICE SPEECH CAP', 'forcing TTS stop');
      await this.tts.stop();
    }
  }

  private async speakWithRetry(text: string, config: VoiceSpeechConfig) {
    try {
      await this.tts.speak(text, config);
    } catch (err) {
      recordVoiceError(err instanceof Error ? err.message : 'TTS failed');
    }
  }

  setConversationHistory(messages: import('../../types').Message[]) {
    this.conversationHistory = messages;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
