import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../../constants/theme';
import { MemoryConfidenceLevel } from '../../types/phase4-intelligence';
import { VoxaText } from '../ui/voxa-text';

const COLORS: Record<MemoryConfidenceLevel, string> = {
  high: colors.primarySoft,
  medium: colors.textMuted,
  low: '#E8A87C',
};

const LABELS: Record<MemoryConfidenceLevel, string> = {
  high: 'You told Voxa',
  medium: 'Likely',
  low: 'Uncertain',
};

type MemoryConfidenceBadgeProps = {
  level: MemoryConfidenceLevel;
};

/** User-facing trust hint — no scores or internal metadata. */
export function MemoryConfidenceBadge({ level }: MemoryConfidenceBadgeProps) {
  return (
    <View style={[styles.badge, { borderColor: `${COLORS[level]}55` }]}>
      <VoxaText variant="caption" style={{ color: COLORS[level] }}>
        {LABELS[level]}
      </VoxaText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    backgroundColor: `${colors.surface}88`,
  },
});
