import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { GlassCard } from '../ui/glass-card';
import { VoxaText } from '../ui/voxa-text';
import { PremiumButton } from '../premium/premium-ui';
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
  if (c.status === 'completed') return 'Challenge done ✓';
  if (c.status === 'skipped') return 'Skipped — fresh start tomorrow';
  if (c.status === 'accepted') return c.title;
  return c.title;
}

export function TodaysAdventureCard({
  data,
  onPrimary,
  onChallengeDetails,
  onMission,
  onSecondary,
  secondaryLabel,
}: Props) {
  const { adventure, xp, dailyChallenge, weeklyMission } = data;
  const xpPct = Math.min(100, Math.max(0, (xp.totalXp / Math.max(1, xp.xpToNextLevel)) * 100));

  return (
    <StaggerFade index={0}>
      <GlassCard style={styles.card}>
        <View style={styles.header}>
          <VoxaText variant="caption" color="primarySoft" style={styles.headerTitle} numberOfLines={1}>
            Today's Adventure
          </VoxaText>
          <VoxaText variant="caption" color="textMuted" style={styles.level} numberOfLines={1}>
            Lv {xp.level}
          </VoxaText>
        </View>

        <View style={styles.xpRow}>
          <View style={styles.xpTrack}>
            <View style={[styles.xpFill, { width: `${xpPct}%` }]} />
          </View>
          <VoxaText variant="caption" color="textMuted" style={styles.xpLabel} numberOfLines={1}>
            {xp.totalXp}/{xp.xpToNextLevel}
          </VoxaText>
        </View>

        <Pressable onPress={onChallengeDetails} style={styles.challengeRow} hitSlop={4}>
          <Ionicons name="flag-outline" size={16} color={colors.primarySoft} style={styles.rowIcon} />
          <VoxaText variant="body" color="textSecondary" numberOfLines={2} style={styles.rowBody}>
            {challengeStatusLine(dailyChallenge)}
          </VoxaText>
        </Pressable>

        {adventure.missionProgress && weeklyMission?.status !== 'abandoned' ? (
          <Pressable onPress={onMission} style={styles.metaRow} hitSlop={4}>
            <Ionicons name="shield-outline" size={15} color={colors.textMuted} style={styles.rowIcon} />
            <VoxaText variant="caption" color="textMuted" numberOfLines={1} style={styles.rowBody}>
              Mission {adventure.missionProgress}
            </VoxaText>
          </Pressable>
        ) : null}

        {adventure.featuredGame && dailyChallenge?.status !== 'completed' ? (
          <VoxaText variant="caption" color="textMuted" numberOfLines={1} style={styles.hint}>
            Suggested: {adventure.featuredGame.emoji} {adventure.featuredGame.title}
          </VoxaText>
        ) : adventure.spinAvailable ? (
          <VoxaText variant="caption" color="textMuted" numberOfLines={1} style={styles.hint}>
            Daily spin ready
          </VoxaText>
        ) : adventure.spinCountdownLabel ? (
          <VoxaText variant="caption" color="textMuted" numberOfLines={1} style={styles.hint}>
            Next spin in {adventure.spinCountdownLabel}
          </VoxaText>
        ) : null}

        <View style={styles.actions}>
          <PremiumButton label={adventure.primaryLabel} onPress={onPrimary} />
          {onSecondary && secondaryLabel ? (
            <Pressable onPress={onSecondary} style={styles.secondary} hitSlop={8}>
              <VoxaText variant="caption" color="primarySoft">
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
    gap: spacing.md12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: { flex: 1, minWidth: 0 },
  level: { flexShrink: 0 },
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  xpTrack: {
    flex: 1,
    minWidth: 0,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceStrong,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    backgroundColor: colors.primarySoft,
    borderRadius: 3,
  },
  xpLabel: {
    flexShrink: 0,
    minWidth: 44,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
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
  hint: { marginLeft: 24 },
  actions: { gap: spacing.sm, marginTop: spacing.xs },
  secondary: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 36,
    justifyContent: 'center',
  },
});
