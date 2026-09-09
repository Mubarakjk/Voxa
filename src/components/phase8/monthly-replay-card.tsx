import { Pressable, StyleSheet } from 'react-native';

import { GlassCard } from '../ui/glass-card';
import { VoxaText } from '../ui/voxa-text';
import { spacing } from '../../constants/theme';
import { MonthlyReplayData } from '../../types/phase8-retention';

type Props = {
  replay: MonthlyReplayData;
  onOpen?: () => void;
};

export function MonthlyReplayCard({ replay, onOpen }: Props) {
  return (
    <Pressable onPress={onOpen} disabled={!onOpen}>
      <GlassCard style={styles.card}>
        <VoxaText variant="caption" color="primarySoft" style={styles.eyebrow}>
          {replay.monthLabel} replay
        </VoxaText>
        <VoxaText variant="subtitle" style={styles.title}>
          {replay.biggestAchievement ?? 'Your month together'}
        </VoxaText>
        {replay.moodTrend ? (
          <VoxaText variant="body" color="textSecondary" style={styles.trend}>
            {replay.moodTrend}
          </VoxaText>
        ) : null}
        <VoxaText variant="caption" color="textMuted" style={styles.meta}>
          {replay.goalsCompleted} goals · {replay.photoCount} photos
        </VoxaText>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  eyebrow: { lineHeight: 18 },
  title: { lineHeight: 24 },
  trend: { lineHeight: 22 },
  meta: { lineHeight: 18 },
});
