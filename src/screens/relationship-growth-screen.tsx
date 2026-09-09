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
        <ScreenHeader showBack
          eyebrow="Built over time"
          title={snapshot.levelLabel}
          subtitle={snapshot.familiarityLine}
        />

        <GlassCard style={styles.hero}>
          <VoxaText variant="caption" color="textMuted" style={styles.heroEyebrow}>
            Together
          </VoxaText>
          <VoxaText variant="title" style={styles.heroTitle}>
            {snapshot.daysTogether} days
          </VoxaText>
          {snapshot.nextLevelLabel ? (
            <>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${snapshot.progressPercent}%` }]} />
              </View>
              <VoxaText variant="caption" color="textSecondary" style={styles.progressCaption}>
                Growing toward {snapshot.nextLevelLabel} · {snapshot.progressPercent}%
              </VoxaText>
            </>
          ) : (
            <VoxaText variant="caption" color="primarySoft" style={styles.progressCaption}>
              Inner Circle — you have earned this depth.
            </VoxaText>
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
          <GlassCard
            key={item.id}
            style={item.unlocked ? styles.convCard : [styles.convCard, styles.convCardLocked]}>
            <View style={styles.convRow}>
              <View style={styles.convCopy}>
                <VoxaText
                  variant="subtitle"
                  color={item.unlocked ? 'text' : 'textMuted'}
                  style={styles.convTitle}>
                  {item.title}
                </VoxaText>
                <VoxaText variant="caption" color="textMuted" style={styles.convDescription}>
                  {item.description}
                </VoxaText>
              </View>
              {item.unlocked ? (
                <Pressable
                  style={styles.startBtn}
                  hitSlop={6}
                  onPress={() => {
                    const starter = growthSvc.getUnlockedStarters(snapshot.level).find((s) => s.id === item.id);
                    if (starter) {
                      navigation.navigate('MainTabs', { screen: 'Talk', params: { starterPrompt: starter.starterPrompt } });
                    }
                  }}>
                  <VoxaText variant="caption" color="primarySoft">Start</VoxaText>
                </Pressable>
              ) : (
                <View style={styles.lockWrap} accessibilityLabel="Locked">
                  <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
                </View>
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
      <VoxaText variant="title" style={styles.metricValue}>
        {value}
      </VoxaText>
      <VoxaText variant="caption" color="textMuted" style={styles.metricLabel}>
        {label}
      </VoxaText>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: layout.screenPadding, paddingBottom: spacing.xxl * 2, gap: spacing.md },
  hero: {
    gap: spacing.md12,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  heroEyebrow: { lineHeight: 18 },
  heroTitle: { lineHeight: 32 },
  progressTrack: {
    height: 6,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  progressFill: { height: '100%', backgroundColor: colors.primarySoft, borderRadius: radius.lg },
  progressCaption: { lineHeight: 18, paddingBottom: spacing.xs },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metric: {
    flexGrow: 1,
    flexBasis: '46%',
    minWidth: 0,
    maxWidth: '100%',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
  },
  metricValue: { lineHeight: 28 },
  metricLabel: {
    lineHeight: 18,
    flexShrink: 1,
  },
  convCard: {
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  convCardLocked: {
    opacity: 0.72,
  },
  convRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  convCopy: {
    flex: 1,
    minWidth: 0,
    gap: spacing.sm,
    paddingRight: spacing.xs,
  },
  convTitle: { lineHeight: 22 },
  convDescription: { lineHeight: 18 },
  startBtn: {
    flexShrink: 0,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 36,
    justifyContent: 'center',
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceQuiet,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
  },
  lockWrap: {
    flexShrink: 0,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
});
