import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { CountUpNumber } from '../premium/count-up-number';
import { SectionCard } from '../premium/premium-ui';
import { colors, spacing } from '../../constants/theme';
import { RelationshipDashboardSnapshot } from '../../types/phase2-intelligence';
import { VoxaText } from '../ui/voxa-text';

type RelationshipDashboardCardProps = {
  data: RelationshipDashboardSnapshot;
  summary?: string;
};

function Stat({ label, value, animate }: { label: string; value: number; animate?: boolean }) {
  return (
    <View style={styles.stat}>
      {animate ? (
        <CountUpNumber value={value} style={styles.statValue} />
      ) : (
        <VoxaText variant="title" style={styles.statValue}>
          {value}
        </VoxaText>
      )}
      <VoxaText variant="caption" color="textMuted">
        {label}
      </VoxaText>
    </View>
  );
}

export function RelationshipDashboardCard({ data, summary }: RelationshipDashboardCardProps) {
  return (
    <SectionCard
      title="Your bond"
      subtitle={`${data.daysTogether} days together · score ${data.relationshipScore}`}>
      <View style={styles.row}>
        <Stat label="Conversations" value={data.conversationCount} animate />
        <Stat label="Memories" value={data.sharedMemories} animate />
        <Stat label="Ritual streak" value={data.ritualStreak} />
        <Stat label="Goals done" value={data.goalsAchieved} animate />
      </View>
      <View style={styles.scoreRow}>
        <VoxaText variant="caption" color="textMuted">
          Relationship score
        </VoxaText>
        <CountUpNumber value={data.relationshipScore} style={styles.scoreValue} />
      </View>
      {summary ? (
        <VoxaText variant="body" color="textSecondary">
          {summary}
        </VoxaText>
      ) : null}
      {data.naturalRecallLine ? (
        <View style={styles.recall}>
          <Ionicons name="heart-outline" size={14} color={colors.primarySoft} />
          <VoxaText variant="caption" color="textMuted">
            {data.naturalRecallLine}
          </VoxaText>
        </View>
      ) : null}
      {data.milestones.length > 0 ? (
        <View style={styles.milestones}>
          {data.milestones.map((m) => (
            <View key={m.id} style={styles.chip}>
              <VoxaText variant="caption" color="primarySoft">
                {m.label}
              </VoxaText>
            </View>
          ))}
        </View>
      ) : null}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.sm },
  stat: { minWidth: '22%', gap: 2 },
  statValue: { fontSize: 20, lineHeight: 24 },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  scoreValue: { fontSize: 28, lineHeight: 32, color: colors.primarySoft },
  recall: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center', marginTop: spacing.sm },
  milestones: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(45, 212, 191, 0.12)',
  },
});
