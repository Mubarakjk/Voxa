import { Pressable, StyleSheet, View } from 'react-native';

import { GlassCard } from '../ui/glass-card';
import { VoxaText } from '../ui/voxa-text';
import { colors, radius, spacing } from '../../constants/theme';
import { SharedChallenge } from '../../types/phase8-retention';
import { PremiumButton } from '../premium/premium-ui';

type Props = {
  challenge: SharedChallenge;
  onCheckIn?: () => void;
  onViewAll?: () => void;
};

export function SharedChallengeCard({ challenge, onCheckIn, onViewAll }: Props) {
  const progress = Math.min(100, Math.round((challenge.completedDays / challenge.durationDays) * 100));

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <VoxaText variant="subtitle">{challenge.title}</VoxaText>
        <VoxaText variant="caption" color="textMuted">{challenge.streakDays}d streak</VoxaText>
      </View>
      <VoxaText variant="body" color="textSecondary">{challenge.description}</VoxaText>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${progress}%` }]} />
      </View>
      <VoxaText variant="caption" color="textMuted">
        Day {challenge.completedDays} of {challenge.durationDays}
      </VoxaText>
      <View style={styles.actions}>
        {onCheckIn ? <PremiumButton label="Check in today" onPress={onCheckIn} variant="primary" /> : null}
        {onViewAll ? (
          <Pressable onPress={onViewAll}>
            <VoxaText variant="caption" color="primarySoft">All challenges</VoxaText>
          </Pressable>
        ) : null}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  barTrack: { height: 6, borderRadius: radius.full, backgroundColor: colors.surface, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.primarySoft, borderRadius: radius.full },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.xs },
});
