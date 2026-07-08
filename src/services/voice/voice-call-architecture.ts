/**
 * Real-time voice call foundations — interfaces only, no external realtime API.
 */

import { CompanionModeId } from '../../types';
import { VoicePersonality } from '../../types/user-profile';
import {
  LiveTranscriptSegment,
  ScheduledVoiceCall,
  VoiceCallQualityMetrics,
  VoicePersonalityProfile,
  VOICE_PERSONALITY_PROFILES,
} from '../../types/voice-call';
import { VoiceEngine, VoiceEngineEvents, createVoiceEngine } from './voice-engine';

export type RealtimeVoiceSessionConfig = {
  userId: string;
  conversationId: string;
  mode: CompanionModeId;
  personality: VoicePersonality;
  scheduledCall?: ScheduledVoiceCall;
};

export interface IRealtimeVoiceProvider {
  connect(config: RealtimeVoiceSessionConfig): Promise<void>;
  disconnect(): Promise<void>;
  sendAudioChunk?(chunk: ArrayBuffer): void;
  onTranscript?(segment: LiveTranscriptSegment): void;
  onQuality?(metrics: VoiceCallQualityMetrics): void;
}

export class RealtimeVoiceSessionManager {
  private engine: VoiceEngine | null = null;
  private transcript: LiveTranscriptSegment[] = [];
  private qualitySamples: VoiceCallQualityMetrics[] = [];

  constructor(
    private readonly events: VoiceEngineEvents,
    private readonly provider?: IRealtimeVoiceProvider,
  ) {}

  get liveTranscript(): LiveTranscriptSegment[] {
    return [...this.transcript];
  }

  get latestQuality(): VoiceCallQualityMetrics | null {
    return this.qualitySamples.at(-1) ?? null;
  }

  getPersonalityProfile(personality: VoicePersonality): VoicePersonalityProfile {
    return VOICE_PERSONALITY_PROFILES.find((item) => item.id === personality) ?? VOICE_PERSONALITY_PROFILES[0];
  }

  async start(config: RealtimeVoiceSessionConfig) {
    this.engine = createVoiceEngine(this.events);
    await this.engine.startSession({
      userId: config.userId,
      conversationId: config.conversationId,
      mode: config.mode,
    });
    await this.provider?.connect(config);
  }

  async end() {
    await this.provider?.disconnect();
    await this.engine?.endSession();
    this.engine = null;
  }

  appendTranscript(segment: Omit<LiveTranscriptSegment, 'id'>) {
    const entry: LiveTranscriptSegment = {
      ...segment,
      id: `live-${Date.now()}-${this.transcript.length}`,
    };
    this.transcript.push(entry);
    return entry;
  }

  recordQuality(metrics: VoiceCallQualityMetrics) {
    this.qualitySamples.push(metrics);
    if (this.qualitySamples.length > 20) {
      this.qualitySamples.shift();
    }
  }
}

export function createRealtimeVoiceSessionManager(events: VoiceEngineEvents) {
  return new RealtimeVoiceSessionManager(events);
}
