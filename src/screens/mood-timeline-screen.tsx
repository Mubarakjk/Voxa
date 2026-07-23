import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { MoodTimelineSection } from '../components/mood/mood-timeline-section';
import { ScreenShell } from '../components/ui/screen-shell';
import { LoadingState } from '../components/ui/screen-state';
import { ScreenHeader } from '../components/premium/premium-ui';
import { layout, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import { getMoodIntelligenceService } from '../services/intelligence/mood-intelligence-service';
import { MoodSnapshot, MoodTimelineEntry } from '../types/mood-intelligence';
import { moodLabelDisplay } from '../types/mood-intelligence';
import { VoxaText } from '../components/ui/voxa-text';
import { GlassCard } from '../components/ui/glass-card';

type Props = NativeStackScreenProps<RootStackParamList, 'MoodTimeline'>;

export function MoodTimelineScreen(_props: Props) {
  const { profile, services } = useVoxa();
  const moodIntel = getMoodIntelligenceService(services.storage);
  const [entries, setEntries] = useState<MoodTimelineEntry[]>([]);
  const [snapshot, setSnapshot] = useState<MoodSnapshot>({ current: null, confidence: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [timeline, current] = await Promise.all([
        moodIntel.getTimeline(profile.id, 90),
        moodIntel.getCurrentMood(profile.id),
      ]);
      setEntries(timeline);
      setSnapshot(current);
    } finally {
      setLoading(false);
    }
  }, [moodIntel, profile]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (loading) {
    return (
      <ScreenShell>
        <LoadingState label="Loading mood timeline..." />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenHeader
          eyebrow="Mood intelligence"
          title="Mood timeline"
          subtitle="Local-first history from chat, voice, journal, and check-ins."
        />

        {snapshot.current ? (
          <GlassCard style={styles.current}>
            <VoxaText variant="caption" color="textMuted">Current read</VoxaText>
            <VoxaText variant="title">{moodLabelDisplay(snapshot.current)}</VoxaText>
            <VoxaText variant="caption" color="textSecondary">
              {snapshot.source ?? 'inferred'} · {Math.round(snapshot.confidence * 100)}% confidence
            </VoxaText>
          </GlassCard>
        ) : null}

        <MoodTimelineSection entries={entries} limit={30} />
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: layout.screenPadding,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  current: { gap: spacing.xs },
});
