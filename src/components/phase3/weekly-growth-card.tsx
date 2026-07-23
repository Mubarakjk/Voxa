import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { GlassCard } from '../ui/glass-card';
import { colors, spacing } from '../../constants/theme';
import { WeeklyGrowthSnapshot } from '../../types/phase3-intelligence';
import { VoxaText } from '../ui/voxa-text';

type WeeklyGrowthCardProps = {
  growth: WeeklyGrowthSnapshot;
  compact?: boolean;
};

export function WeeklyGrowthCard({ growth, compact }: WeeklyGrowthCardProps) {
  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="trending-up" size={16} color={colors.primarySoft} />
        <VoxaText variant="label" color="primarySoft">
          Weekly growth
        </VoxaText>
      </View>
      <VoxaText variant="caption" color="textMuted">
        {growth.weekLabel}
      </VoxaText>
      {!compact ? (
        <VoxaText variant="subtitle" style={styles.headline}>
          {growth.headline}
        </VoxaText>
      ) : null}
      {growth.achievements.length > 0 ? (
        <VoxaText variant="body" color="textSecondary">
          {growth.achievements[0]}
        </VoxaText>
      ) : null}
      <View style={styles.focusRow}>
        <Ionicons name="compass-outline" size={14} color={colors.textMuted} />
        <VoxaText variant="caption" color="textMuted">
          Next focus: {growth.suggestedFocus}
        </VoxaText>
      </View>
      {!compact && growth.moodInsight ? (
        <VoxaText variant="caption" color="textMuted" style={styles.mood}>
          {growth.moodInsight}
        </VoxaText>
      ) : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  headline: { marginTop: spacing.xs },
  focusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  mood: { marginTop: 4, fontStyle: 'italic' },
});
