import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { LoadingState } from '../components/ui/screen-state';
import { ScreenHeader } from '../components/premium/premium-ui';
import { colors, layout, radius, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import { getRelationshipGrowthService } from '../services/relationship/relationship-growth-service';
import { RelationshipGrowthSnapshot } from '../types/relationship-growth';

type Props = NativeStackScreenProps<RootStackParamList, 'RelationshipGrowth'>;

export function RelationshipGrowthScreen({ navigation }: Props) {
  const { profile, services } = useVoxa();
  const growthSvc = getRelationshipGrowthService(services.storage, services.repositories);
  const [snapshot, setSnapshot] = useState<RelationshipGrowthSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      setSnapshot(await growthSvc.getSnapshot(profile.id));
    } finally {
      setLoading(false);
    }
  }, [growthSvc, profile]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (loading || !snapshot) {
    return (
      <ScreenShell>
        <LoadingState label="Loading relationship..." />
      </ScreenShell>
    );
  }

  const { metrics } = snapshot;

  return (
    <ScreenShell padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenHeader
          eyebrow="Built over time"
          title={snapshot.levelLabel}
          subtitle={snapshot.familiarityLine}
        />

        <GlassCard style={styles.hero}>
          <VoxaText variant="caption" color="textMuted">Together</VoxaText>
          <VoxaText variant="title">{snapshot.daysTogether} days</VoxaText>
          {snapshot.nextLevelLabel ? (
            <>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${snapshot.progressPercent}%` }]} />
              </View>
              <VoxaText variant="caption" color="textSecondary">
                Growing toward {snapshot.nextLevelLabel} · {snapshot.progressPercent}%
              </VoxaText>
            </>
          ) : (
            <VoxaText variant="caption" color="primarySoft">Inner Circle — you have earned this depth.</VoxaText>
          )}
        </GlassCard>

        <VoxaText variant="subtitle">Shared history</VoxaText>
        <View style={styles.metrics}>
          <Metric label="Conversations" value={metrics.conversationCount} />
          <Metric label="Voice minutes" value={metrics.voiceMinutes} />
          <Metric label="Goals completed" value={metrics.goalsCompleted} />
          <Metric label="Routines done" value={metrics.routinesCompleted} />
          <Metric label="Memories shared" value={metrics.memoriesShared} />
          <Metric label="Reflections" value={metrics.reflectionsCompleted} />
        </View>

        <VoxaText variant="subtitle">Conversations you have earned</VoxaText>
        {snapshot.lockedConversations.map((item) => (
          <GlassCard key={item.id} style={styles.convCard}>
            <View style={styles.convRow}>
              <View style={styles.flex}>
                <VoxaText variant="subtitle" color={item.unlocked ? 'text' : 'textMuted'}>
                  {item.title}
                </VoxaText>
                <VoxaText variant="caption" color="textMuted">{item.description}</VoxaText>
              </View>
              {item.unlocked ? (
                <Pressable
                  style={styles.startBtn}
                  onPress={() => {
                    const starter = growthSvc.getUnlockedStarters(snapshot.level).find((s) => s.id === item.id);
                    if (starter) {
                      navigation.navigate('MainTabs', { screen: 'Talk', params: { starterPrompt: starter.starterPrompt } });
                    }
                  }}>
                  <VoxaText variant="caption" color="primarySoft">Start</VoxaText>
                </Pressable>
              ) : (
                <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
              )}
            </View>
          </GlassCard>
        ))}
      </ScrollView>
    </ScreenShell>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.metric}>
      <VoxaText variant="title">{value}</VoxaText>
      <VoxaText variant="caption" color="textMuted">{label}</VoxaText>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: layout.screenPadding, paddingBottom: spacing.xxl, gap: spacing.md },
  hero: { gap: spacing.sm },
  progressTrack: {
    height: 6,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.primarySoft, borderRadius: radius.lg },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metric: {
    width: '30%',
    minWidth: 96,
    gap: 2,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  convCard: { gap: spacing.xs },
  convRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1, gap: 2 },
  startBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
});
