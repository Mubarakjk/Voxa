import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { CheckInPeriod } from '../../services/check-in/daily-check-in-service';
import { colors, radius, spacing } from '../../constants/theme';
import { VoxaText } from '../ui/voxa-text';

type DailyCheckInCardProps = {
  period: CheckInPeriod;
  onPress: () => void;
  onDismiss?: () => void;
};

export function DailyCheckInCard({ period, onPress, onDismiss }: DailyCheckInCardProps) {
  const isMorning = period === 'morning';

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.iconWrap}>
        <Ionicons
          name={isMorning ? 'sunny-outline' : 'moon-outline'}
          size={20}
          color={colors.primarySoft}
        />
      </View>
      <View style={styles.copy}>
        <VoxaText variant="subtitle">{isMorning ? 'Morning check-in' : 'Evening reflection'}</VoxaText>
        <VoxaText variant="caption" color="textSecondary">
          {isMorning
            ? 'How you feel, what matters, and how Voxa can help today'
            : 'What went well, what was hard, and what to adjust tomorrow'}
        </VoxaText>
      </View>
      {onDismiss ? (
        <Pressable onPress={onDismiss} hitSlop={8}>
          <Ionicons name="close" size={16} color={colors.textMuted} />
        </Pressable>
      ) : null}
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
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139, 124, 246, 0.12)',
  },
  copy: { flex: 1, gap: 4 },
});
