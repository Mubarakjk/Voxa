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
  const xpPct = Math.min(100, (xp.totalXp / xp.xpToNextLevel) * 100);

  return (
    <StaggerFade index={0}>
      <GlassCard style={styles.card}>
        <View style={styles.header}>
          <VoxaText variant="caption" color="primarySoft">Today's Adventure</VoxaText>
          <VoxaText variant="caption" color="textMuted">Lv {xp.level}</VoxaText>
        </View>

        <View style={styles.xpRow}>
          <View style={styles.xpTrack}>
            <View style={[styles.xpFill, { width: `${xpPct}%` }]} />
          </View>
          <VoxaText variant="caption" color="textMuted">{xp.totalXp}/{xp.xpToNextLevel}</VoxaText>
        </View>

        <Pressable onPress={onChallengeDetails} style={styles.challengeRow}>
          <Ionicons name="flag-outline" size={16} color={colors.primarySoft} />
          <VoxaText variant="body" color="textSecondary" numberOfLines={2}>
            {challengeStatusLine(dailyChallenge)}
          </VoxaText>
        </Pressable>

        {adventure.missionProgress && weeklyMission?.status !== 'abandoned' ? (
          <Pressable onPress={onMission} style={styles.metaRow}>
            <Ionicons name="shield-outline" size={16} color={colors.textMuted} />
            <VoxaText variant="caption" color="textMuted">Mission {adventure.missionProgress}</VoxaText>
          </Pressable>
        ) : null}

        {adventure.featuredGame && dailyChallenge?.status !== 'completed' ? (
          <VoxaText variant="caption" color="textMuted">
            Suggested: {adventure.featuredGame.emoji} {adventure.featuredGame.title}
          </VoxaText>
        ) : adventure.spinAvailable ? (
          <VoxaText variant="caption" color="textMuted">Daily spin ready</VoxaText>
        ) : adventure.spinCountdownLabel ? (
          <VoxaText variant="caption" color="textMuted">Next spin in {adventure.spinCountdownLabel}</VoxaText>
        ) : null}

        <PremiumButton label={adventure.primaryLabel} onPress={onPrimary} />

        {onSecondary && secondaryLabel ? (
          <Pressable onPress={onSecondary}>
            <VoxaText variant="caption" color="primarySoft">{secondaryLabel}</VoxaText>
          </Pressable>
        ) : null}
      </GlassCard>
    </StaggerFade>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  xpRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  xpTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.surfaceStrong, overflow: 'hidden' },
  xpFill: {
    height: '100%',
    backgroundColor: colors.primarySoft,
    borderRadius: 4,
  },
  challengeRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  metaRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
});
