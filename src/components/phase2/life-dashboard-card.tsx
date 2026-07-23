import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { SectionCard } from '../premium/premium-ui';
import { colors, spacing } from '../../constants/theme';
import { LifeDashboardSnapshot } from '../../types/phase2-intelligence';
import { VoxaText } from '../ui/voxa-text';

type LifeDashboardCardProps = {
  data: LifeDashboardSnapshot;
};

function Metric({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Ionicons name={icon} size={14} color={colors.primarySoft} />
      <VoxaText variant="caption" color="textMuted">
        {label}
      </VoxaText>
      <VoxaText variant="body" color="textSecondary" numberOfLines={1}>
        {value}
      </VoxaText>
    </View>
  );
}

export function LifeDashboardCard({ data }: LifeDashboardCardProps) {
  const trendIcon =
    data.moodTrend === 'up' ? 'trending-up-outline' : data.moodTrend === 'down' ? 'trending-down-outline' : 'remove-outline';

  return (
    <SectionCard title="Life at a glance" subtitle="Mood, rhythm, and what matters today">
      <View style={styles.grid}>
        <Metric icon={trendIcon} label="Mood" value={data.moodLabel} />
        <Metric
          icon="moon-outline"
          label="Sleep"
          value={data.sleepSchedule ? `${data.sleepSchedule.wake} – ${data.sleepSchedule.sleep}` : 'Not set'}
        />
        <Metric icon="calendar-outline" label="Routine" value={`${data.routinePercent}% · ${data.routineStreak}d streak`} />
        <Metric icon="flag-outline" label="Goals" value={data.topGoalTitle ?? `${data.activeGoals} active`} />
        <Metric icon="flame-outline" label="Check-ins" value={`${data.checkInStreak} day streak`} />
        <Metric
          icon="leaf-outline"
          label="Habits"
          value={data.habits.length > 0 ? data.habits.slice(0, 2).join(', ') : 'Building…'}
        />
      </View>
      {data.journalSnippet ? (
        <VoxaText variant="caption" color="textMuted" style={styles.journal}>
          Journal: {data.journalSnippet}
        </VoxaText>
      ) : null}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  metric: { width: '47%', gap: 2 },
  journal: { marginTop: spacing.sm, lineHeight: 18 },
});
