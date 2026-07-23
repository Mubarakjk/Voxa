import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { GlassCard } from '../ui/glass-card';
import { VoxaText } from '../ui/voxa-text';
import { colors, spacing } from '../../constants/theme';
import { LifeCalendarSnapshot } from '../../types/phase8-retention';
import { StaggerFade } from '../premium/premium-ui';

type Props = {
  calendar: LifeCalendarSnapshot;
  todayFocus: string;
  moodLabel?: string;
  onTalk?: () => void;
};

export function DailyCompanionCard({ calendar, todayFocus, moodLabel, onTalk }: Props) {
  const headline = calendar.todayLine ?? calendar.tomorrowLine ?? todayFocus;

  return (
    <StaggerFade index={0}>
      <GlassCard style={styles.card}>
        <VoxaText variant="caption" color="primarySoft">Today with Voxa</VoxaText>
        <VoxaText variant="body" color="textSecondary">{headline}</VoxaText>
        {moodLabel ? (
          <VoxaText variant="caption" color="textMuted">Voxa feels {moodLabel}</VoxaText>
        ) : null}
        {onTalk ? (
          <Pressable style={styles.action} onPress={onTalk}>
            <VoxaText variant="caption" color="primarySoft">Talk now</VoxaText>
            <Ionicons name="chatbubble-outline" size={14} color={colors.primarySoft} />
          </Pressable>
        ) : null}
      </GlassCard>
    </StaggerFade>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  action: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
});
