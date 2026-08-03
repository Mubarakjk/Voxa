import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { TimelineItem } from '../premium/premium-ui';
import { GlassCard } from '../ui/glass-card';
import { colors, radius, spacing } from '../../constants/theme';
import { LifeTimelineEventKind } from '../../types/companion-intelligence';
import { TimelineSlice } from '../../types/phase2-intelligence';
import { filterTimelineEvents, TIMELINE_KIND_LABELS } from '../../services/intelligence/life-timeline-service';
import { VoxaText } from '../ui/voxa-text';
import { RootStackParamList } from '../../navigation/types';

type LifeTimelineSectionProps = {
  timeline: TimelineSlice;
};

export function LifeTimelineSection({ timeline }: LifeTimelineSectionProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [filter, setFilter] = useState<LifeTimelineEventKind | 'all'>('all');

  const filtered = useMemo(
    () => filterTimelineEvents(timeline.events, filter).slice(0, 8),
    [timeline.events, filter],
  );

  if (timeline.events.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <VoxaText variant="caption" color="textMuted">
          {timeline.milestoneCount} milestones · {timeline.events.length} moments
        </VoxaText>
        <Pressable
          onPress={() => navigation.navigate('LifeTimeline')}
          style={styles.seeAll}
          accessibilityRole="button"
          accessibilityLabel="Open full life timeline">
          <VoxaText variant="caption" color="primarySoft">
            See all
          </VoxaText>
          <Ionicons name="chevron-forward" size={14} color={colors.primarySoft} />
        </Pressable>
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
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`Filter timeline: ${label}`}>
      <VoxaText variant="caption" color={active ? 'primarySoft' : 'textMuted'}>
        {label}
      </VoxaText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  header: {
    marginBottom: spacing.xs,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 40 },
  filters: { gap: spacing.xs, paddingBottom: spacing.sm },
  chip: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  chipActive: {
    backgroundColor: 'rgba(45, 212, 191, 0.15)',
    borderColor: 'rgba(45, 212, 191, 0.35)',
  },
  card: { gap: spacing.md },
});
