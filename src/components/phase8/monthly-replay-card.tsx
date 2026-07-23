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
        <VoxaText variant="caption" color="primarySoft">{replay.monthLabel} replay</VoxaText>
        <VoxaText variant="subtitle">
          {replay.biggestAchievement ?? 'Your month together'}
        </VoxaText>
        {replay.moodTrend ? (
          <VoxaText variant="body" color="textSecondary">{replay.moodTrend}</VoxaText>
        ) : null}
        <VoxaText variant="caption" color="textMuted">
          {replay.goalsCompleted} goals · {replay.photoCount} photos
        </VoxaText>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
});
