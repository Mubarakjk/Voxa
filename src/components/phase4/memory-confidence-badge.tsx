import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../../constants/theme';
import { MemoryConfidenceLevel } from '../../types/phase4-intelligence';
import { VoxaText } from '../ui/voxa-text';

const COLORS: Record<MemoryConfidenceLevel, string> = {
  high: colors.primarySoft,
  medium: colors.textMuted,
  low: '#E8A87C',
};

type MemoryConfidenceBadgeProps = {
  level: MemoryConfidenceLevel;
  percent?: number;
};

export function MemoryConfidenceBadge({ level, percent }: MemoryConfidenceBadgeProps) {
  const label = level === 'high' ? 'High' : level === 'medium' ? 'Medium' : 'Low';
  return (
    <View style={[styles.badge, { borderColor: `${COLORS[level]}55` }]}>
      <VoxaText variant="caption" style={{ color: COLORS[level] }}>
        {label}{percent != null ? ` · ${percent}%` : ''}
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
