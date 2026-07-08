import { Ionicons } from '@expo/vector-icons';
import { CompositeScreenProps, useFocusEffect } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { LiveCompanionOrb } from '../components/live-companion/live-companion-orb';
import { UpgradeCard } from '../components/subscription/upgrade-card';
import { FadeIn, SectionCard } from '../components/premium/premium-ui';
import { GlassCard } from '../components/ui/glass-card';
import { LoadingPulse } from '../components/premium/premium-ui';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { colors, layout, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { useCachedDashboard } from '../hooks/use-cached-dashboard';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { setVoiceDebugState } from '../services/voice/voice-debug-state';
import { PlanStatus } from '../types';
import { getVoxaAvatarTint, getVoxaDisplayName } from '../utils/companion-display';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getOrbState(): import('../components/live-companion/live-companion-orb').CompanionOrbState {
  const hour = new Date().getHours();
  if (hour >= 23 || hour < 6) return 'sleeping';
  return 'idle';
}

export function HomeScreen({ navigation }: Props) {
  const { profile, companion } = useVoxa();
  const [planStatus, setPlanStatus] = useState<PlanStatus | null>(null);

  const fetchDashboard = useCallback(
    (userId: string) => companion.getHomeDashboard(userId),
    [companion],
  );

  const { dashboard, isLoading, load } = useCachedDashboard(profile?.id, fetchDashboard);

  useFocusEffect(
    useCallback(() => {
      if (!profile) return;
      void load();
      void companion.getPlanStatusForUser(profile.id).then(setPlanStatus);
    }, [load, profile, companion]),
  );

  useEffect(() => {
    if (!dashboard) return;
    setVoiceDebugState({
      orbState: getOrbState(),
      orbMood: dashboard.wowExperience.relationshipMoment?.kind === 'goal_complete' ? 'celebrating' : 'calm',
      relationshipScore: dashboard.wowExperience.relationshipScore,
    });
  }, [dashboard]);

  if (isLoading && !dashboard) {
    return (
      <ScreenShell padded={false}>
        <LoadingPulse label="Waking up Voxa..." />
      </ScreenShell>
    );
  }

  if (!dashboard || !profile) return null;

  const voxaName = getVoxaDisplayName(profile);
  const voxaTint = getVoxaAvatarTint(profile);
  const wow = dashboard.wowExperience;
  const firstName = profile.displayName.split(' ')[0];
  const orbMood =
    wow.relationshipMoment?.kind === 'goal_complete' || wow.relationshipMoment?.kind === 'birthday'
      ? 'celebrating'
      : 'calm';

  return (
    <ScreenShell padded={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews>
        <FadeIn>
          <VoxaText variant="caption" color="textMuted" style={styles.eyebrow}>
            {getTimeGreeting()}
          </VoxaText>
        </FadeIn>

        <FadeIn delay={40}>
          <View style={styles.hero}>
            <LiveCompanionOrb
              size={220}
              tint={voxaTint}
              active
              state={getOrbState()}
              mood={orbMood}
            />
            <VoxaText variant="title" style={styles.heroTitle}>
              {getTimeGreeting()}, {firstName}
            </VoxaText>
            <VoxaText variant="body" color="textSecondary" style={styles.heroMessage}>
              {wow.heroMessage}
            </VoxaText>
            {wow.friendRecallLine ? (
              <VoxaText variant="caption" color="textMuted" style={styles.recall}>
                {wow.friendRecallLine}
              </VoxaText>
            ) : null}
          </View>
        </FadeIn>

        <FadeIn delay={80}>
          <View style={styles.actions}>
            <HeroAction icon="chatbubbles-outline" label="Talk" onPress={() => navigation.navigate('Talk')} />
            <HeroAction icon="radio-outline" label="Call" onPress={() => navigation.navigate('Voxa', { action: 'voice' })} />
            <HeroAction icon="sparkles-outline" label="Remember" onPress={() => navigation.navigate('Journey')} />
          </View>
        </FadeIn>

        <View style={styles.divider} />

        {dashboard.routineSummary.nextBlock ? (
          <FadeIn delay={95}>
            <GlassCard style={styles.routineCard}>
              <VoxaText variant="label" color="primarySoft">
                Stay on schedule
              </VoxaText>
              <VoxaText variant="subtitle">{dashboard.routineSummary.nextBlock.title}</VoxaText>
              <VoxaText variant="caption" color="textSecondary">
                {dashboard.routineMessage ??
                  `${dashboard.routineSummary.completedCount}/${dashboard.routineSummary.totalCount} done today`}
              </VoxaText>
            </GlassCard>
          </FadeIn>
        ) : null}

        {!planStatus?.isPro ? (
          <FadeIn delay={100}>
            <UpgradeCard
              trialDaysLeft={planStatus?.isTrialActive ? planStatus.trialDaysLeft : undefined}
              onPress={() => navigation.getParent()?.navigate('Paywall', { source: 'home' })}
            />
          </FadeIn>
        ) : null}

        {wow.surpriseMessage ? (
          <FadeIn delay={110}>
            <GlassCard style={styles.surpriseCard}>
              <Ionicons name="heart-outline" size={18} color={colors.primarySoft} />
              <VoxaText variant="body" color="textSecondary">
                {wow.surpriseMessage}
              </VoxaText>
            </GlassCard>
          </FadeIn>
        ) : null}

        <FadeIn delay={120}>
          <SectionCard title="Today's focus" subtitle={dashboard.homeIntelligence.dailyFocus}>
            <VoxaText variant="body" color="textSecondary">
              {dashboard.homeIntelligence.progressUpdate}
            </VoxaText>
          </SectionCard>
        </FadeIn>

        <FadeIn delay={140}>
          <GlassCard variant="elevated" style={styles.quoteCard}>
            <VoxaText variant="label" color="primarySoft">
              Quote of the day
            </VoxaText>
            <VoxaText variant="body" color="textSecondary" style={styles.quoteText}>
              "{wow.dailyQuote}"
            </VoxaText>
          </GlassCard>
        </FadeIn>

        {wow.continueConversation ? (
          <FadeIn delay={160}>
            <SectionCard
              title="Continue where you left off"
              actionLabel="Talk"
              onPress={() => navigation.navigate('Talk')}>
              <VoxaText variant="body" color="textSecondary" numberOfLines={2}>
                "{wow.continueConversation.preview}"
              </VoxaText>
            </SectionCard>
          </FadeIn>
        ) : null}

        {dashboard.memories[0] ? (
          <FadeIn delay={180}>
            <SectionCard
              title="A memory"
              subtitle={dashboard.memories[0].category}
              actionLabel="Journey"
              onPress={() => navigation.navigate('Journey')}>
              <VoxaText variant="subtitle">{dashboard.memories[0].title}</VoxaText>
            </SectionCard>
          </FadeIn>
        ) : null}
      </ScrollView>
    </ScreenShell>
  );
}

function HeroAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.actionBtn, pressed && styles.actionPressed]} onPress={onPress}>
      <View style={styles.actionIcon}>
        <Ionicons name={icon} size={22} color={colors.primarySoft} />
      </View>
      <VoxaText variant="caption" color="textSecondary">
        {label}
      </VoxaText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.lg,
    paddingBottom: layout.tabBarHeight + spacing.xxl,
    gap: spacing.xl,
  },
  eyebrow: { letterSpacing: 1.2, textTransform: 'uppercase' },
  hero: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg },
  heroTitle: { textAlign: 'center', marginTop: spacing.sm },
  heroMessage: { textAlign: 'center', maxWidth: 300, lineHeight: 24 },
  recall: { textAlign: 'center', maxWidth: 280, fontStyle: 'italic' },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
    paddingVertical: spacing.sm,
  },
  actionBtn: { alignItems: 'center', gap: spacing.sm, minWidth: 72 },
  actionPressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139, 124, 246, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(139, 124, 246, 0.25)',
  },
  divider: {
    height: 1,
    backgroundColor: colors.glassBorder,
    marginVertical: spacing.sm,
  },
  quoteCard: { gap: spacing.sm },
  quoteText: { fontStyle: 'italic', lineHeight: 24 },
  surpriseCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  routineCard: { gap: spacing.sm, paddingVertical: spacing.lg },
});
