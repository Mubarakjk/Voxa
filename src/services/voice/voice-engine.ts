/**
 * Voice engine architecture — prepared for realtime API integration.
 * No realtime provider wired yet; interfaces define the contract.
 */

import { requestMicrophonePermission } from '../attachments/attachment-permissions';

export type VoiceConnectionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'interrupted'
  | 'disconnected'
  | 'error';

export type VoiceTranscriptEntry = {
  id: string;
  role: 'user' | 'voxa';
  text: string;
  timestamp: string;
  isFinal: boolean;
};

export type VoiceEngineConfig = {
  userId: string;
  conversationId: string;
  mode: import('../../types').CompanionModeId;
  enableInterruptions?: boolean;
  speakerEnabled?: boolean;
  micEnabled?: boolean;
};

export type VoiceEngineEvents = {
  onConnectionStateChange: (state: VoiceConnectionState) => void;
  onTranscript: (entry: VoiceTranscriptEntry) => void;
  onError: (error: Error) => void;
  onTimerTick: (seconds: number) => void;
};

export interface ISpeechRecognitionAdapter {
  start(): Promise<void>;
  stop(): Promise<void>;
  isListening(): boolean;
}

export interface ITextToSpeechAdapter {
  speak(text: string): Promise<void>;
  stop(): Promise<void>;
  setMuted(muted: boolean): void;
}

export interface IRealtimeConversationAdapter {
  connect(config: VoiceEngineConfig): Promise<void>;
  disconnect(): Promise<void>;
  sendAudioChunk?(chunk: ArrayBuffer): void;
  sendText?(text: string): void;
}

export class VoiceEngine {
  private state: VoiceConnectionState = 'idle';
  private timerSeconds = 0;
  private timerHandle: ReturnType<typeof setInterval> | null = null;
  private transcripts: VoiceTranscriptEntry[] = [];
  private micEnabled = true;
  private speakerEnabled = true;

  constructor(
    private readonly events: VoiceEngineEvents,
    private readonly speech?: ISpeechRecognitionAdapter,
    private readonly tts?: ITextToSpeechAdapter,
    private readonly realtime?: IRealtimeConversationAdapter,
  ) {}

  get connectionState() {
    return this.state;
  }

  get callDurationSeconds() {
    return this.timerSeconds;
  }

  get conversationTranscript() {
    return [...this.transcripts];
  }

  private setState(next: VoiceConnectionState) {
    this.state = next;
    this.events.onConnectionStateChange(next);
  }

  async requestMicPermission(): Promise<boolean> {
    return requestMicrophonePermission();
  }

  async startSession(config: VoiceEngineConfig) {
    this.setState('connecting');
    const permitted = await this.requestMicPermission();
    if (!permitted) {
      this.setState('error');
      throw new Error('Microphone permission denied.');
    }

    if (this.realtime) {
      await this.realtime.connect(config);
    }

    this.setState('connected');
    this.startTimer();
    this.setState('listening');
    await this.speech?.start();
  }

  async endSession() {
    await this.speech?.stop();
    await this.tts?.stop();
    await this.realtime?.disconnect();
    this.stopTimer();
    this.setState('disconnected');
  }

  setMicEnabled(enabled: boolean) {
    this.micEnabled = enabled;
    if (!enabled) {
      void this.speech?.stop();
    } else if (this.state === 'connected' || this.state === 'listening') {
      void this.speech?.start();
    }
  }

  setSpeakerEnabled(enabled: boolean) {
    this.speakerEnabled = enabled;
    this.tts?.setMuted(!enabled);
  }

  handleInterruption() {
    if (!this.micEnabled) return;
    void this.tts?.stop();
    this.setState('interrupted');
    setTimeout(() => {
      if (this.state === 'interrupted') this.setState('listening');
    }, 300);
  }

  appendTranscript(entry: Omit<VoiceTranscriptEntry, 'id'>) {
    const full: VoiceTranscriptEntry = { ...entry, id: `vt-${Date.now()}` };
    this.transcripts.push(full);
    this.events.onTranscript(full);
  }

  private startTimer() {
    this.timerSeconds = 0;
    this.timerHandle = setInterval(() => {
      this.timerSeconds += 1;
      this.events.onTimerTick(this.timerSeconds);
    }, 1000);
  }

  private stopTimer() {
    if (this.timerHandle) clearInterval(this.timerHandle);
    this.timerHandle = null;
  }
}

/** Stub adapters until OpenAI Realtime / native STT-TTS are connected. */
export class StubSpeechRecognitionAdapter implements ISpeechRecognitionAdapter {
  private listening = false;
  async start() {
    this.listening = true;
  }
  async stop() {
    this.listening = false;
  }
  isListening() {
    return this.listening;
  }
}

export class StubTextToSpeechAdapter implements ITextToSpeechAdapter {
  private muted = false;
  async speak(_text: string) {
    if (this.muted) return;
  }
  async stop() {}
  setMuted(muted: boolean) {
    this.muted = muted;
  }
}

export function createVoiceEngine(events: VoiceEngineEvents): VoiceEngine {
  return new VoiceEngine(
    events,
    new StubSpeechRecognitionAdapter(),
    new StubTextToSpeechAdapter(),
  );
}
