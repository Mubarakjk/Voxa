import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { EmptyState, FadeIn, ScreenHeader, StaggerFade, TimelineItem } from '../components/premium/premium-ui';
import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { colors, layout, radius, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import { LifeTimelineEvent, LifeTimelineEventKind } from '../types/companion-intelligence';
import {
  filterTimelineEvents,
  TIMELINE_KIND_LABELS,
} from '../services/intelligence/life-timeline-service';
import { hapticSelection } from '../utils/haptics';

export function LifeTimelineScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile, companion } = useVoxa();
  const [events, setEvents] = useState<LifeTimelineEvent[]>([]);
  const [filter, setFilter] = useState<LifeTimelineEventKind | 'all'>('all');
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!profile) return;
      setLoading(true);
      void companion
        .getHomeDashboard(profile.id)
        .then((dash) => {
          setEvents(dash.phase2.timeline.events);
        })
        .finally(() => setLoading(false));
    }, [profile, companion]),
  );

  const kinds = useMemo(() => {
    const set = new Set<LifeTimelineEventKind>();
    events.forEach((e) => set.add(e.kind));
    return [...set].sort((a, b) => TIMELINE_KIND_LABELS[a].localeCompare(TIMELINE_KIND_LABELS[b]));
  }, [events]);

  const filtered = useMemo(() => filterTimelineEvents(events, filter), [events, filter]);

  return (
    <ScreenShell padded={false}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back} accessibilityRole="button">
          <Ionicons name="chevron-back" size={20} color={colors.primarySoft} />
          <VoxaText variant="caption" color="primarySoft">
            Back
          </VoxaText>
        </Pressable>

        <FadeIn>
          <ScreenHeader
            title="Life Timeline"
            subtitle="Goals, rituals, conversations, and milestones — your story in order."
          />
        </FadeIn>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          <FilterChip
            label="All"
            active={filter === 'all'}
            onPress={() => {
              void hapticSelection();
              setFilter('all');
            }}
          />
          {kinds.map((kind) => (
            <FilterChip
              key={kind}
              label={TIMELINE_KIND_LABELS[kind]}
              active={filter === kind}
              onPress={() => {
                void hapticSelection();
                setFilter(kind);
              }}
            />
          ))}
        </ScrollView>

        {loading ? (
          <VoxaText variant="caption" color="textMuted">
            Loading moments…
          </VoxaText>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="git-branch-outline"
            title="Your timeline is waiting"
            message="Talk with Voxa, finish a routine, or set a goal — moments will appear here."
            actionLabel="Open Talk"
            onAction={() => navigation.navigate('MainTabs', { screen: 'Talk' })}
          />
        ) : (
          <GlassCard style={styles.spineCard}>
            <View style={styles.spine} />
            {filtered.map((item, index) => (
              <StaggerFade key={item.id} index={Math.min(index, 12)}>
                <View style={styles.row}>
                  <View style={styles.dot} />
                  <View style={styles.item}>
                    <TimelineItem
                      title={item.title}
                      subtitle={item.description}
                      date={`${TIMELINE_KIND_LABELS[item.kind]} · ${new Date(item.occurredAt).toLocaleDateString()}`}
                      isLast={index === filtered.length - 1}
                    />
                  </View>
                </View>
              </StaggerFade>
            ))}
          </GlassCard>
        )}
      </ScrollView>
    </ScreenShell>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]} accessibilityRole="button">
      <VoxaText variant="caption" color={active ? 'primarySoft' : 'textMuted'}>
        {label}
      </VoxaText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  back: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 44 },
  filters: { gap: spacing.xs, paddingBottom: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  chipActive: {
    backgroundColor: 'rgba(45, 212, 191, 0.15)',
    borderColor: 'rgba(45, 212, 191, 0.4)',
  },
  spineCard: { paddingLeft: spacing.sm, overflow: 'hidden' },
  spine: {
    position: 'absolute',
    left: 22,
    top: spacing.lg,
    bottom: spacing.lg,
    width: 2,
    backgroundColor: 'rgba(45, 212, 191, 0.35)',
  },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 6,
    marginLeft: 10,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.background,
  },
  item: { flex: 1 },
});
