import { CompanionModeId } from '../../types';
import { VoicePersonality } from '../../types/user-profile';
import { LiveTranscriptSegment } from '../../types/voice-call';
import { VoiceConnectionState } from './voice-engine';

export type RealtimeVoiceConfig = {
  userId: string;
  conversationId: string;
  mode: CompanionModeId;
  personality: VoicePersonality;
  isSafeCall?: boolean;
};

export type RealtimeVoiceEvents = {
  onStateChange?: (state: VoiceConnectionState) => void;
  onTranscript?: (segment: LiveTranscriptSegment) => void;
  onError?: (error: Error) => void;
};

/**
 * OpenAI Realtime API contract — stub until dev build / WebRTC wiring.
 * FallbackVoicePipeline is used in production today.
 */
export interface IRealtimeVoiceService {
  connect(config: RealtimeVoiceConfig): Promise<void>;
  disconnect(): Promise<void>;
  interrupt(): Promise<void>;
  isSupported(): boolean;
  getProviderName(): string;
}

export class StubRealtimeVoiceService implements IRealtimeVoiceService {
  isSupported() {
    return false;
  }

  getProviderName() {
    return 'openai-realtime-stub';
  }

  async connect(): Promise<void> {
    throw new Error('OpenAI Realtime is not wired yet. Using fallback voice pipeline.');
  }

  async disconnect(): Promise<void> {
    // no-op
  }

  async interrupt(): Promise<void> {
    // no-op
  }
}

export function createRealtimeVoiceService(): IRealtimeVoiceService {
  return new StubRealtimeVoiceService();
}
