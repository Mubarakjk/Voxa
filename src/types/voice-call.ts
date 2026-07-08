import { EntityId, ISODateString } from './common';
import { VoicePersonality } from './user-profile';
import { CompanionModeId } from './companion-mode';

export type VoiceCallQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';

export type VoiceCallQualityMetrics = {
  latencyMs?: number;
  packetLossPercent?: number;
  jitterMs?: number;
  quality: VoiceCallQuality;
  sampledAt: ISODateString;
};

export type LiveTranscriptSegment = {
  id: EntityId;
  role: 'user' | 'voxa';
  text: string;
  isFinal: boolean;
  timestamp: ISODateString;
};

export type ScheduledVoiceCall = {
  id: EntityId;
  userId: EntityId;
  conversationId?: EntityId;
  mode: CompanionModeId;
  personality: VoicePersonality;
  scheduledAt: ISODateString;
  reminderId?: EntityId;
  status: 'scheduled' | 'completed' | 'cancelled' | 'missed';
  title?: string;
};

export type VoicePersonalityProfile = {
  id: VoicePersonality;
  label: string;
  description: string;
  ttsVoiceId?: string;
  speakingRate?: number;
  expoPitch?: number;
  expoRate?: number;
};

export const VOICE_PERSONALITY_PROFILES: VoicePersonalityProfile[] = [
  {
    id: 'warm_calm',
    label: 'Warm & calm',
    description: 'Soft, steady, emotionally present.',
    ttsVoiceId: 'nova',
    speakingRate: 0.9,
    expoPitch: 0.95,
    expoRate: 0.9,
  },
  {
    id: 'gentle',
    label: 'Gentle',
    description: 'Quiet, reassuring, unhurried.',
    ttsVoiceId: 'shimmer',
    speakingRate: 0.85,
    expoPitch: 1.0,
    expoRate: 0.85,
  },
  {
    id: 'energetic',
    label: 'Energetic',
    description: 'Upbeat and motivating.',
    ttsVoiceId: 'coral',
    speakingRate: 1.08,
    expoPitch: 1.08,
    expoRate: 1.08,
  },
  {
    id: 'direct',
    label: 'Direct',
    description: 'Clear and concise.',
    ttsVoiceId: 'onyx',
    speakingRate: 1.05,
    expoPitch: 1.0,
    expoRate: 1.05,
  },
];
