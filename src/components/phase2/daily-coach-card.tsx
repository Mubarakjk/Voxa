import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { GlassCard } from '../ui/glass-card';
import { colors, spacing } from '../../constants/theme';
import { DailyCoachSnapshot } from '../../types/phase2-intelligence';
import { VoxaText } from '../ui/voxa-text';

type DailyCoachCardProps = {
  coach: DailyCoachSnapshot;
  compact?: boolean;
};

export function DailyCoachCard({ coach, compact }: DailyCoachCardProps) {
  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="sparkles" size={16} color={colors.primarySoft} />
        <VoxaText variant="label" color="primarySoft">
          Today's coach
        </VoxaText>
      </View>
      {!compact ? (
        <VoxaText variant="subtitle" style={styles.greeting}>
          {coach.greeting}
        </VoxaText>
      ) : null}
      <VoxaText variant="body" color="textSecondary">
        {coach.message}
      </VoxaText>
      <View style={styles.focusRow}>
        <Ionicons name="compass-outline" size={14} color={colors.textMuted} />
        <VoxaText variant="caption" color="textMuted">
          Focus: {coach.focus}
        </VoxaText>
      </View>
      {!compact && coach.adaptedFrom.length > 0 ? (
        <VoxaText variant="caption" color="textMuted" style={styles.adapted}>
          Adapted from {coach.adaptedFrom.join(', ')}
        </VoxaText>
      ) : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  greeting: { marginTop: spacing.xs },
  focusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  adapted: { marginTop: 4, fontStyle: 'italic' },
});
