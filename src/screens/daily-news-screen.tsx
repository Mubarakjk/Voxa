import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { ScreenHeader } from '../components/premium/premium-ui';
import { LoadingState } from '../components/ui/screen-state';
import { layout, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import { DailyNewsDigest } from '../types/phase12-experiences';

type Props = NativeStackScreenProps<RootStackParamList, 'DailyNews'>;

export function DailyNewsScreen(_props: Props) {
  const { profile, companion } = useVoxa();
  const [digest, setDigest] = useState<DailyNewsDigest | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const dash = await companion.getHomeDashboard(profile.id);
    setDigest(dash.phase12?.dailyNews ?? null);
    setLoading(false);
  }, [profile, companion]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (loading) {
    return (
      <ScreenShell>
        <LoadingState label="Loading your digest..." />
      </ScreenShell>
    );
  }

  if (!digest) {
    return (
      <ScreenShell>
        <VoxaText variant="body" color="textSecondary">No personal digest yet for today.</VoxaText>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenHeader showBack
          eyebrow={digest.date}
          title="Your Digest"
          subtitle="Personal companion notes from your goals and routines — not external world headlines."
        />
        <GlassCard style={styles.card}>
          <VoxaText variant="subtitle">{digest.headline}</VoxaText>
          <VoxaText variant="body" color="textSecondary">{digest.companionTake}</VoxaText>
        </GlassCard>
        {digest.items.map((item) => (
          <GlassCard key={item.id} style={styles.card}>
            <VoxaText variant="caption" color="primarySoft">
              {item.category}
              {item.source ? ` · ${item.source}` : ' · Voxa'}
            </VoxaText>
            <VoxaText variant="subtitle">{item.title}</VoxaText>
            <VoxaText variant="body" color="textSecondary">{item.summary}</VoxaText>
          </GlassCard>
        ))}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: layout.screenPadding, paddingBottom: spacing.xxl, gap: spacing.sm },
  card: { gap: spacing.xs },
});
