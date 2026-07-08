import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../../constants/theme';
import { VoxaText } from '../ui/voxa-text';
import { VoiceConnectionState } from '../../services/voice/voice-engine';

type Quality = 'excellent' | 'good' | 'fair' | 'poor';

type Props = {
  state: VoiceConnectionState;
  error?: string | null;
  durationLabel?: string;
};

function qualityForState(state: VoiceConnectionState, error?: string | null): Quality {
  if (error || state === 'error') return 'poor';
  if (state === 'connecting') return 'fair';
  if (state === 'listening' || state === 'speaking' || state === 'connected') return 'excellent';
  if (state === 'thinking') return 'good';
  return 'good';
}

const QUALITY_BARS: Record<Quality, number> = {
  excellent: 4,
  good: 3,
  fair: 2,
  poor: 1,
};

function VoiceConnectionIndicatorComponent({ state, error, durationLabel }: Props) {
  const quality = qualityForState(state, error);
  const bars = QUALITY_BARS[quality];
  const label =
    error ? 'Reconnecting…' : state === 'connecting' ? 'Connecting…' : state === 'error' ? 'Connection issue' : 'Connected';

  return (
    <View style={styles.wrap}>
      <View style={styles.bars}>
        {[1, 2, 3, 4].map((level) => (
          <View
            key={level}
            style={[
              styles.bar,
              { height: 4 + level * 3, opacity: level <= bars ? 1 : 0.2 },
              level <= bars && quality === 'poor' && styles.barPoor,
              level <= bars && quality !== 'poor' && styles.barGood,
            ]}
          />
        ))}
      </View>
      <VoxaText variant="caption" color="textMuted">
        {label}
      </VoxaText>
      {durationLabel ? (
        <VoxaText variant="caption" color="textMuted">
          · {durationLabel}
        </VoxaText>
      ) : null}
    </View>
  );
}

export const VoiceConnectionIndicator = memo(VoiceConnectionIndicatorComponent);

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignSelf: 'center',
  },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 16 },
  bar: { width: 3, borderRadius: 2, backgroundColor: colors.textMuted },
  barGood: { backgroundColor: colors.safe },
  barPoor: { backgroundColor: colors.danger },
});
