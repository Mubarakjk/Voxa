import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { GlassCard } from '../ui/glass-card';
import { VoxaText } from '../ui/voxa-text';
import { colors, spacing } from '../../constants/theme';
import { Phase11DashboardData } from '../../types/phase11-living-companion';
import { StaggerFade } from '../premium/premium-ui';

type Props = {
  data: Phase11DashboardData;
  onFollowUp?: () => void;
  onStory?: () => void;
};

/** Compact companion card — hero owns greeting + primary CTA. */
export function LivingCompanionHomeCard({ data, onFollowUp, onStory }: Props) {
  const { relationship, followUp, personality, todayFocus, wowMoment, recall } = data;

  const detailLine =
    wowMoment?.line ??
    recall?.line ??
    personality.insideJokeLine ??
    personality.evolutionLine;

  return (
    <StaggerFade index={1}>
      <GlassCard style={styles.card}>
        <View style={styles.header}>
          <VoxaText variant="caption" color="primarySoft">Together</VoxaText>
          <VoxaText variant="caption" color="textMuted">{relationship.stageLabel}</VoxaText>
        </View>

        <View style={styles.track}>
          <View style={[styles.fill, { width: `${relationship.progressPercent}%` }]} />
        </View>
        <View style={styles.relRow}>
          <VoxaText variant="caption" color="textMuted">{relationship.progressPercent}% to {relationship.nextStageLabel ?? 'max bond'}</VoxaText>
          <VoxaText variant="caption" color="textMuted">{relationship.conversationCount} chats</VoxaText>
        </View>

        <View style={styles.focusRow}>
          <Ionicons name="compass-outline" size={16} color={colors.primarySoft} />
          <VoxaText variant="body" color="textSecondary" numberOfLines={2}>Today: {todayFocus}</VoxaText>
        </View>

        {detailLine ? (
          <VoxaText variant="caption" color="textMuted" numberOfLines={2}>{detailLine}</VoxaText>
        ) : null}

        {followUp ? (
          <Pressable
            onPress={onFollowUp}
            style={({ pressed }) => [styles.followUp, pressed && styles.pressed]}>
            <Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.primarySoft} />
            <VoxaText variant="caption" color="primarySoft" style={styles.followUpText}>
              {followUp.dueLabel}: {followUp.prompt}
            </VoxaText>
          </Pressable>
        ) : null}

        {onStory && data.storyPreview.length > 0 ? (
          <Pressable onPress={onStory} style={({ pressed }) => [styles.storyLink, pressed && styles.pressed]}>
            <VoxaText variant="caption" color="primarySoft">Our Story →</VoxaText>
          </Pressable>
        ) : null}
      </GlassCard>
    </StaggerFade>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  relRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceStrong,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.primarySoft,
    borderRadius: 4,
    shadowColor: colors.primarySoft,
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  focusRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  followUp: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  followUpText: { flex: 1 },
  storyLink: { alignSelf: 'flex-start', paddingVertical: spacing.xs },
  pressed: { opacity: 0.8 },
});
