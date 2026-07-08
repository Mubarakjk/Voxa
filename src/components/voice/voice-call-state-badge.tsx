import { colors } from '../../constants/theme';
import { VoxaText } from '../ui/voxa-text';
import { VoiceConnectionState } from '../../services/voice/voice-engine';

const STATE_LABELS: Record<VoiceConnectionState, string> = {
  idle: 'Ready when you are',
  connecting: 'Connecting...',
  connected: 'Connected',
  listening: 'Listening',
  thinking: 'Thinking',
  speaking: 'Speaking',
  interrupted: 'Interrupted',
  disconnected: 'Call ended',
  error: 'Connection error',
};

const STATE_COLORS: Partial<Record<VoiceConnectionState, string>> = {
  listening: colors.safe,
  speaking: colors.primarySoft,
  thinking: colors.blue,
  error: colors.danger,
  interrupted: colors.textSecondary,
};

type VoiceCallStateBadgeProps = {
  state: VoiceConnectionState;
  durationLabel?: string;
};

export function VoiceCallStateBadge({ state, durationLabel }: VoiceCallStateBadgeProps) {
  const label = durationLabel ? `${STATE_LABELS[state]} · ${durationLabel}` : STATE_LABELS[state];
  return (
    <VoxaText variant="caption" color="textSecondary" style={{ color: STATE_COLORS[state] }}>
      {label}
    </VoxaText>
  );
}

export function getVoiceStateLabel(state: VoiceConnectionState) {
  return STATE_LABELS[state];
}
