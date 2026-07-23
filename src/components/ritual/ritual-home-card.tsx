import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { RitualPeriod } from '../../types/ritual';
import { colors, radius, spacing } from '../../constants/theme';
import { VoxaText } from '../ui/voxa-text';
import { RitualProgressRing } from './ritual-progress-ring';

type RitualHomeCardProps = {
  period: RitualPeriod;
  continueLabel: string;
  progressPercent: number;
  morningDone: boolean;
  eveningDone: boolean;
  streakCombined: number;
  onPress: () => void;
  onDismiss?: () => void;
};

export function RitualHomeCard({
  period,
  continueLabel,
  progressPercent,
  morningDone,
  eveningDone,
  streakCombined,
  onPress,
  onDismiss,
}: RitualHomeCardProps) {
  const isMorning = period === 'morning';

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <RitualProgressRing
        percent={progressPercent}
        morningDone={morningDone}
        eveningDone={eveningDone}
      />
      <View style={styles.copy}>
        <VoxaText variant="subtitle">{continueLabel}</VoxaText>
        <VoxaText variant="caption" color="textSecondary">
          {isMorning
            ? 'Greeting, focus, routine & a gentle start'
            : 'Reflect on today, then wind down together'}
        </VoxaText>
        {streakCombined > 0 ? (
          <VoxaText variant="caption" color="primarySoft">
            {streakCombined} day ritual streak
          </VoxaText>
        ) : null}
      </View>
      <View style={styles.actions}>
        {onDismiss ? (
          <Pressable onPress={onDismiss} hitSlop={8}>
            <Ionicons name="close" size={16} color={colors.textMuted} />
          </Pressable>
        ) : null}
        <Ionicons
          name={isMorning ? 'sunny-outline' : 'moon-outline'}
          size={20}
          color={colors.primarySoft}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  copy: { flex: 1, gap: 4 },
  actions: { alignItems: 'center', gap: spacing.sm },
});
