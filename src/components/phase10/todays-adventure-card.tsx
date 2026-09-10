import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { GlassCard } from '../ui/glass-card';
import { VoxaText } from '../ui/voxa-text';
import { colors, spacing } from '../../constants/theme';
import { DailyChallenge, Phase10DashboardData } from '../../types/phase10-play';
import { StaggerFade } from '../premium/premium-ui';

type Props = {
  data: Phase10DashboardData;
  onPrimary: () => void;
  onChallengeDetails: () => void;
  onMission: () => void;
  onSecondary?: () => void;
  secondaryLabel?: string;
};

function challengeStatusLine(c: DailyChallenge | null): string {
  if (!c) return 'No challenge today';
  if (c.status === 'completed') return 'Challenge done';
  if (c.status === 'skipped') return 'Skipped — fresh start tomorrow';
  if (c.status === 'accepted') return c.title;
  return c.title;
}

/** Visually demoted play/challenges block — kept below core companion content. */
export function TodaysAdventureCard({
  data,
  onPrimary,
  onChallengeDetails,
  onMission,
  onSecondary,
  secondaryLabel,
}: Props) {
  const { adventure, dailyChallenge, weeklyMission } = data;

  return (
    <StaggerFade index={4}>
      <GlassCard style={styles.card} variant="quiet">
        <View style={styles.header}>
          <VoxaText variant="caption" color="textMuted" style={styles.headerTitle} numberOfLines={1}>
            Play & challenges
          </VoxaText>
        </View>

        <Pressable onPress={onChallengeDetails} style={styles.challengeRow} hitSlop={4}>
          <Ionicons name="flag-outline" size={15} color={colors.textMuted} style={styles.rowIcon} />
          <VoxaText variant="body" color="textMuted" numberOfLines={2} style={styles.rowBody}>
            {challengeStatusLine(dailyChallenge)}
          </VoxaText>
        </Pressable>

        {adventure.missionProgress && weeklyMission?.status !== 'abandoned' ? (
          <Pressable onPress={onMission} style={styles.metaRow} hitSlop={4}>
            <Ionicons name="shield-outline" size={14} color={colors.textMuted} style={styles.rowIcon} />
            <VoxaText variant="caption" color="textMuted" numberOfLines={1} style={styles.rowBody}>
              Mission {adventure.missionProgress}
            </VoxaText>
          </Pressable>
        ) : null}

        <View style={styles.actions}>
          <Pressable
            onPress={onPrimary}
            style={({ pressed }) => [styles.primaryLink, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={adventure.primaryLabel}>
            <VoxaText variant="caption" color="primarySoft">
              {adventure.primaryLabel}
            </VoxaText>
            <Ionicons name="chevron-forward" size={14} color={colors.primarySoft} />
          </Pressable>
          {onSecondary && secondaryLabel ? (
            <Pressable onPress={onSecondary} style={styles.secondary} hitSlop={8}>
              <VoxaText variant="caption" color="textMuted">
                {secondaryLabel}
              </VoxaText>
            </Pressable>
          ) : null}
        </View>
      </GlassCard>
    </StaggerFade>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    paddingVertical: spacing.md12,
    paddingHorizontal: spacing.md12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
    borderRadius: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: { flex: 1, minWidth: 0, letterSpacing: 0.4 },
  challengeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  rowIcon: { flexShrink: 0, marginTop: 2 },
  rowBody: { flex: 1, minWidth: 0 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  primaryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 36,
    paddingVertical: spacing.xs,
  },
  secondary: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    minHeight: 36,
    justifyContent: 'center',
  },
  pressed: { opacity: 0.8 },
});
