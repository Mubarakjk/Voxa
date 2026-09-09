import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { EmptyState, ScreenHeader } from '../components/premium/premium-ui';
import { LoadingState } from '../components/ui/screen-state';
import { layout, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import { RelationshipMilestone } from '../types/phase12-experiences';

type Props = NativeStackScreenProps<RootStackParamList, 'RelationshipTimeline'>;

export function RelationshipTimelineScreen(_props: Props) {
  const { profile, companion } = useVoxa();
  const [milestones, setMilestones] = useState<RelationshipMilestone[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const dash = await companion.getHomeDashboard(profile.id);
    setMilestones(dash.phase12?.timelinePreview ?? []);
    setLoading(false);
  }, [profile, companion]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (loading) {
    return (
      <ScreenShell>
        <LoadingState label="Loading timeline..." />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          showBack
          title="Our story"
          subtitle="Verified milestones only — no invented romance."
        />
        {milestones.length === 0 ? (
          <GlassCard style={styles.emptyCard}>
            <EmptyState
              icon="heart-outline"
              title="Story growing"
              message="Keep chatting and achieving — milestones appear from real events."
            />
          </GlassCard>
        ) : (
          milestones.map((m) => (
            <GlassCard key={m.id} style={styles.card}>
              <VoxaText variant="caption" color="primarySoft" style={styles.eyebrow}>
                {new Date(m.occurredAt).toLocaleDateString()} · {m.confidence}
              </VoxaText>
              <VoxaText variant="subtitle" style={styles.title}>
                {m.favourite ? '★ ' : ''}
                {m.title}
              </VoxaText>
              <VoxaText variant="body" color="textSecondary" style={styles.description}>
                {m.description}
              </VoxaText>
            </GlassCard>
          ))
        )}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: layout.screenPadding,
    paddingBottom: spacing.xxl * 2,
    gap: spacing.md,
  },
  card: {
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  emptyCard: {
    padding: 0,
  },
  eyebrow: { lineHeight: 18 },
  title: { lineHeight: 24 },
  description: { lineHeight: 22 },
});
