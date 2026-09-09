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
      <VoxaText variant="caption" color="textMuted" style={styles.weekLabel}>
        {growth.weekLabel}
      </VoxaText>
      {!compact ? (
        <VoxaText variant="subtitle" style={styles.headline}>
          {growth.headline}
        </VoxaText>
      ) : null}
      {growth.achievements.length > 0 ? (
        <VoxaText variant="body" color="textSecondary" style={styles.body}>
          {growth.achievements[0]}
        </VoxaText>
      ) : null}
      <View style={styles.focusRow}>
        <Ionicons name="compass-outline" size={14} color={colors.textMuted} />
        <VoxaText variant="caption" color="textMuted" style={styles.focusText}>
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
  card: {
    gap: spacing.md12,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  weekLabel: { lineHeight: 18 },
  headline: { marginTop: spacing.xs, lineHeight: 24 },
  body: { lineHeight: 22 },
  focusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  focusText: { flex: 1, minWidth: 0, lineHeight: 18 },
  mood: { marginTop: spacing.xs, fontStyle: 'italic', lineHeight: 18, paddingBottom: spacing.xs },
});
