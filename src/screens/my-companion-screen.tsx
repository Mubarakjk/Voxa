import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { EmptyState, FadeIn, HeroOrb, ScreenHeader, StaggerFade } from '../components/premium/premium-ui';
import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { LoadingState } from '../components/ui/screen-state';
import { VoxaText } from '../components/ui/voxa-text';
import { colors, layout, radius, semantic, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import { getDailyCheckInService } from '../services/check-in/daily-check-in-service';
import {
  buildCompanionInsights,
  CompanionInsight,
} from '../services/companion/companion-insights-service';
import { getRelationshipGrowthService } from '../services/relationship/relationship-growth-service';
import { RelationshipGrowthSnapshot } from '../types/relationship-growth';
import { createDefaultCompanionControls } from '../types/relationship-personality';
import { getVoxaAvatarTint, getVoxaDisplayName } from '../utils/companion-display';
import { hapticLight, hapticSelection } from '../utils/haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'MyCompanion'>;

export function MyCompanionScreen({ navigation }: Props) {
  const { profile, companion, services, refreshProfile } = useVoxa();
  const [growth, setGrowth] = useState<RelationshipGrowthSnapshot | null>(null);
  const [insights, setInsights] = useState<CompanionInsight[]>([]);
  const [checkIns, setCheckIns] = useState(0);
  const [loading, setLoading] = useState(true);

  const controls = profile?.preferences.companionControls ?? createDefaultCompanionControls();
  const showInsights = controls.showRelationshipInsights !== false;

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const growthSvc = getRelationshipGrowthService(services.storage, services.repositories);
      const checkInSvc = getDailyCheckInService(services.storage);
      const [snap, memories, goals, moodHistory, entries, dash] = await Promise.all([
        growthSvc.getSnapshot(profile.id),
        companion.listMemories(profile.id),
        services.repositories.goals.listGoals(profile.id),
        checkInSvc.listMoodHistory(),
        checkInSvc.listEntries(),
        companion.getHomeDashboard(profile.id).catch(() => null),
      ]);
      setGrowth(snap);
      setCheckIns(entries.filter((e) => !e.skipped).length);
      if (showInsights) {
        setInsights(
          buildCompanionInsights({
            memories,
            goals,
            moodHistory,
            growth: snap,
            checkInsCompleted: entries.filter((e) => !e.skipped).length,
            routineStreakDays: dash?.routineSummary?.streakDays,
          }),
        );
      } else {
        setInsights([]);
      }
    } finally {
      setLoading(false);
    }
  }, [companion, profile, services.repositories, services.storage, showInsights]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const toggleInsights = async () => {
    if (!profile) return;
    void hapticSelection();
    const current = profile.preferences.companionControls ?? createDefaultCompanionControls();
    await services.repositories.userProfile.updateProfile({
      preferences: {
        ...profile.preferences,
        companionControls: {
          ...current,
          showRelationshipInsights: !(current.showRelationshipInsights !== false),
        },
      },
    });
    await refreshProfile();
  };

  if (loading) {
    return (
      <ScreenShell>
        <LoadingState label="Loading your companion…" />
      </ScreenShell>
    );
  }

  if (!profile || !growth) {
    return (
      <ScreenShell>
        <EmptyState
          icon="heart-outline"
          title="Companion waiting"
          message="Start a conversation — your shared story begins there."
          actionLabel="Open Talk"
          onAction={() => navigation.navigate('MainTabs', { screen: 'Talk' })}
        />
      </ScreenShell>
    );
  }

  const voxaName = getVoxaDisplayName(profile);
  const tint = getVoxaAvatarTint(profile);
  const { metrics } = growth;

  return (
    <ScreenShell padded={false}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <FadeIn>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.back}
            accessibilityRole="button"
            accessibilityLabel="Go back">
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
          <ScreenHeader
            eyebrow="My Companion"
            title={voxaName}
            subtitle={growth.familiarityLine}
          />
        </FadeIn>

        <StaggerFade index={0}>
          <View style={styles.heroOrb}>
            <HeroOrb tint={tint} size={168} label={voxaName} caption={growth.familiarityLine} />
          </View>
        </StaggerFade>

        <StaggerFade index={1}>
          <View style={styles.heroStats}>
            <VoxaText variant="label" color="textMuted">
              Days together
            </VoxaText>
            <VoxaText variant="title">{growth.daysTogether}</VoxaText>
            <VoxaText variant="caption" color="primarySoft">
              {growth.levelLabel}
            </VoxaText>
            {growth.nextLevelLabel && growth.progressPercent > 0 ? (
              <>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${growth.progressPercent}%`, backgroundColor: tint }]} />
                </View>
                <VoxaText variant="caption" color="textMuted">
                  Growing toward {growth.nextLevelLabel}
                </VoxaText>
              </>
            ) : null}
          </View>
        </StaggerFade>

        <StaggerFade index={2}>
          <View style={styles.metrics}>
            <Metric label="Conversations" value={metrics.conversationCount} />
            <Metric label="Goals done" value={metrics.goalsCompleted} />
            <Metric label="Check-ins" value={checkIns} />
            <Metric label="Memories" value={metrics.memoriesShared} />
            <Metric label="Reflections" value={metrics.reflectionsCompleted} />
            <Metric label="Routines" value={metrics.routinesCompleted} />
          </View>
        </StaggerFade>

        <StaggerFade index={3}>
          <View style={styles.rowLinks}>
            <LinkChip
              label="Growth"
              onPress={() => {
                void hapticLight();
                navigation.navigate('RelationshipGrowth');
              }}
            />
            <LinkChip
              label="Timeline"
              onPress={() => {
                void hapticLight();
                navigation.navigate('RelationshipTimeline');
              }}
            />
            <LinkChip
              label="Life Book"
              onPress={() => {
                void hapticLight();
                navigation.navigate('LifeBook');
              }}
            />
            <LinkChip
              label="Studio"
              onPress={() => {
                void hapticLight();
                navigation.navigate('CompanionStudio');
              }}
            />
          </View>
        </StaggerFade>

        {showInsights ? (
          <StaggerFade index={4}>
            <VoxaText variant="subtitle" style={styles.sectionTitle}>
              What {voxaName} has learned
            </VoxaText>
            <VoxaText variant="caption" color="textMuted" style={styles.sectionSub}>
              Only from your stored data — never invented.
            </VoxaText>
            {insights.length === 0 ? (
              <GlassCard>
                <VoxaText variant="body" color="textSecondary">
                  Keep talking, checking in, and saving moments. Insights appear when there’s enough real evidence.
                </VoxaText>
              </GlassCard>
            ) : (
              insights.map((insight, index) => (
                <StaggerFade key={insight.id} index={index}>
                  <GlassCard style={styles.insightCard}>
                    <VoxaText variant="body">{insight.text}</VoxaText>
                    <VoxaText variant="caption" color="textMuted" style={styles.evidence}>
                      Why: {insight.evidence}
                    </VoxaText>
                  </GlassCard>
                </StaggerFade>
              ))
            )}
          </StaggerFade>
        ) : (
          <GlassCard>
            <VoxaText variant="body" color="textSecondary">
              Relationship insights are hidden.
            </VoxaText>
          </GlassCard>
        )}

        <Pressable
          onPress={() => void toggleInsights()}
          style={styles.privacyToggle}
          accessibilityRole="switch"
          accessibilityState={{ checked: showInsights }}
          accessibilityLabel="Show relationship insights">
          <VoxaText variant="caption" color="primarySoft">
            {showInsights ? 'Hide relationship insights' : 'Show relationship insights'}
          </VoxaText>
        </Pressable>
      </ScrollView>
    </ScreenShell>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.metric} accessibilityLabel={`${label}: ${value}`}>
      <VoxaText variant="subtitle">{value}</VoxaText>
      <VoxaText variant="caption" color="textMuted">
        {label}
      </VoxaText>
    </View>
  );
}

function LinkChip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.linkChip} accessibilityRole="button" accessibilityLabel={label}>
      <VoxaText variant="caption" color="primarySoft">
        {label}
      </VoxaText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  back: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  heroOrb: { alignItems: 'center', paddingVertical: spacing.md },
  heroStats: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceQuiet,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceStrong,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  fill: { height: '100%', borderRadius: 3 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metric: {
    width: '31%',
    minWidth: 96,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceQuiet,
    gap: 2,
  },
  rowLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  linkChip: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.surfaceQuiet,
  },
  sectionTitle: { marginTop: spacing.sm },
  sectionSub: { marginBottom: spacing.xs },
  insightCard: { gap: spacing.sm, borderColor: semantic.companion + '44' },
  evidence: { lineHeight: 18 },
  privacyToggle: { minHeight: 48, justifyContent: 'center', marginTop: spacing.md },
});
