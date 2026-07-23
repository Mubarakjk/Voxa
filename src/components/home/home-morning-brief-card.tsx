import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { GlassCard } from '../ui/glass-card';
import { VoxaText } from '../ui/voxa-text';
import { StaggerFade } from '../premium/premium-ui';
import { colors, radius, spacing } from '../../constants/theme';
import { DailyBriefing } from '../../types/daily-briefing';
import { Reminder } from '../../types';
import { Phase11DashboardData } from '../../types/phase11-living-companion';
import { Phase12DashboardData } from '../../types/phase12-experiences';
import { TodayRoutineSummary } from '../../types/routine';
import { formatReminderDateTime } from '../../utils/reminders';

type Props = {
  dailyBriefing: DailyBriefing;
  phase11: Phase11DashboardData;
  phase12: Phase12DashboardData;
  upcomingReminder: Reminder | null;
  routineSummary: TodayRoutineSummary;
  reflectionPending: boolean;
  onFollowUp: () => void;
  onReflection: () => void;
  onNews: () => void;
  onRelationship: () => void;
  onRoutine: () => void;
  onReminder?: () => void;
};

export function HomeMorningBriefCard({
  dailyBriefing,
  phase11,
  phase12,
  upcomingReminder,
  routineSummary,
  reflectionPending,
  onFollowUp,
  onReflection,
  onNews,
  onRelationship,
  onRoutine,
  onReminder,
}: Props) {
  const { relationship, rhythm, followUp } = phase11;
  const digest = phase12.dailyNews;
  const routineLine =
    rhythm.routineHint ??
    (routineSummary.nextBlock
      ? `Next: ${routineSummary.nextBlock.title} · ${routineSummary.completedCount}/${routineSummary.totalCount} today`
      : routineSummary.totalCount > 0
        ? `${routineSummary.completedCount}/${routineSummary.totalCount} routine blocks today`
        : null);

  const showFollowUp = Boolean(followUp && followUp.prompt !== phase11.emotionalMessage);

  return (
    <StaggerFade index={1}>
      <GlassCard style={styles.card}>
        <View style={styles.header}>
          <VoxaText variant="caption" color="primarySoft">Today at a glance</VoxaText>
          <VoxaText variant="caption" color="textMuted">{relationship.stageLabel}</VoxaText>
        </View>

        <VoxaText variant="body" color="textSecondary" numberOfLines={3}>
          {dailyBriefing.personalMessage}
        </VoxaText>

        <Pressable style={styles.relationshipRow} onPress={onRelationship}>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${relationship.progressPercent}%` }]} />
          </View>
          <View style={styles.relMeta}>
            <VoxaText variant="caption" color="textMuted">
              {relationship.progressPercent}% toward {relationship.nextStageLabel ?? 'Inner Circle'}
            </VoxaText>
            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
          </View>
        </Pressable>

        <BriefRow
          icon="compass-outline"
          label="Focus"
          value={phase11.todayFocus}
        />

        {digest ? (
          <BriefRow
            icon="newspaper-outline"
            label="Your digest"
            value={digest.companionTake || digest.headline}
            onPress={onNews}
          />
        ) : null}

        {upcomingReminder ? (
          <BriefRow
            icon="alarm-outline"
            label="Coming up"
            value={`${upcomingReminder.title} · ${formatReminderDateTime(upcomingReminder.scheduledAt)}`}
            onPress={onReminder}
          />
        ) : null}

        {routineLine ? (
          <BriefRow icon="calendar-outline" label="Routine" value={routineLine} onPress={onRoutine} />
        ) : null}

        {dailyBriefing.suggestedAction ? (
          <BriefRow
            icon="sparkles-outline"
            label="Suggestion"
            value={dailyBriefing.suggestedAction}
            onPress={onFollowUp}
          />
        ) : null}

        {showFollowUp && followUp ? (
          <BriefRow
            icon="chatbubble-ellipses-outline"
            label={followUp.dueLabel}
            value={followUp.prompt}
            onPress={onFollowUp}
          />
        ) : null}

        {reflectionPending ? (
          <BriefRow
            icon="moon-outline"
            label="Evening reflection"
            value="What made you smile today?"
            onPress={onReflection}
          />
        ) : null}
      </GlassCard>
    </StaggerFade>
  );
}

function BriefRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress?: () => void;
}) {
  const content = (
    <View style={styles.row}>
      <Ionicons name={icon} size={16} color={colors.primarySoft} />
      <View style={styles.rowBody}>
        <VoxaText variant="caption" color="textMuted">{label}</VoxaText>
        <VoxaText variant="body" color="textSecondary" numberOfLines={2}>{value}</VoxaText>
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={14} color={colors.textMuted} /> : null}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  relationshipRow: { gap: spacing.xs },
  track: {
    height: 6,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceStrong,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
  },
  relMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  rowBody: { flex: 1, gap: 2 },
  pressed: { opacity: 0.85 },
});
