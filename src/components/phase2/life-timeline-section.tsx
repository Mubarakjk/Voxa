import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { TimelineItem } from '../premium/premium-ui';
import { GlassCard } from '../ui/glass-card';
import { colors, radius, spacing } from '../../constants/theme';
import { LifeTimelineEventKind } from '../../types/companion-intelligence';
import { TimelineSlice } from '../../types/phase2-intelligence';
import { filterTimelineEvents, TIMELINE_KIND_LABELS } from '../../services/intelligence/life-timeline-service';
import { VoxaText } from '../ui/voxa-text';

type LifeTimelineSectionProps = {
  timeline: TimelineSlice;
};

export function LifeTimelineSection({ timeline }: LifeTimelineSectionProps) {
  const [filter, setFilter] = useState<LifeTimelineEventKind | 'all'>('all');

  const filtered = useMemo(
    () => filterTimelineEvents(timeline.events, filter).slice(0, 20),
    [timeline.events, filter],
  );

  if (timeline.events.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <VoxaText variant="caption" color="textMuted">
          {timeline.milestoneCount} milestones · {timeline.events.length} moments
        </VoxaText>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        <FilterChip label="All" active={filter === 'all'} onPress={() => setFilter('all')} />
        {timeline.availableKinds.map((kind) => (
          <FilterChip
            key={kind}
            label={TIMELINE_KIND_LABELS[kind]}
            active={filter === kind}
            onPress={() => setFilter(kind)}
          />
        ))}
      </ScrollView>
      <GlassCard style={styles.card}>
        {filtered.map((item, index) => (
          <TimelineItem
            key={item.id}
            title={item.title}
            subtitle={item.description}
            date={new Date(item.occurredAt).toLocaleDateString()}
            isLast={index === filtered.length - 1}
          />
        ))}
      </GlassCard>
    </View>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <VoxaText variant="caption" color={active ? 'primarySoft' : 'textMuted'}>
        {label}
      </VoxaText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  header: { marginBottom: spacing.xs },
  filters: { gap: spacing.xs, paddingBottom: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  chipActive: {
    backgroundColor: 'rgba(139, 124, 246, 0.15)',
    borderColor: 'rgba(139, 124, 246, 0.35)',
  },
  card: { gap: spacing.md },
});
