import { EntityId, ISODateString } from './common';

export type MoodIntelligenceLabel =
  | 'happy'
  | 'excited'
  | 'motivated'
  | 'calm'
  | 'sad'
  | 'lonely'
  | 'angry'
  | 'stressed'
  | 'burned_out'
  | 'anxious';

export type MoodTimelineSource = 'conversation' | 'voice' | 'journal' | 'check_in' | 'inferred';

export type MoodTimelineEntry = {
  id: EntityId;
  userId: EntityId;
  mood: MoodIntelligenceLabel;
  confidence: number;
  source: MoodTimelineSource;
  label: string;
  snippet?: string;
  detectedAt: ISODateString;
  /** Reserved for future Supabase sync. */
  remoteId?: string;
  syncedAt?: ISODateString;
};

export type MoodSnapshot = {
  current: MoodIntelligenceLabel | null;
  confidence: number;
  detectedAt?: ISODateString;
  source?: MoodTimelineSource;
};

export const MOOD_INTELLIGENCE_LABELS: Array<{ id: MoodIntelligenceLabel; label: string; emoji: string }> = [
  { id: 'happy', label: 'Happy', emoji: '🙂' },
  { id: 'excited', label: 'Excited', emoji: '🤩' },
  { id: 'motivated', label: 'Motivated', emoji: '💪' },
  { id: 'calm', label: 'Calm', emoji: '😌' },
  { id: 'sad', label: 'Sad', emoji: '😔' },
  { id: 'lonely', label: 'Lonely', emoji: '🥺' },
  { id: 'angry', label: 'Angry', emoji: '😤' },
  { id: 'stressed', label: 'Stressed', emoji: '😰' },
  { id: 'burned_out', label: 'Burned out', emoji: '🪫' },
  { id: 'anxious', label: 'Anxious', emoji: '😟' },
];

export function moodLabelDisplay(mood: MoodIntelligenceLabel): string {
  return MOOD_INTELLIGENCE_LABELS.find((item) => item.id === mood)?.label ?? mood;
}
