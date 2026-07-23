import { CompositeScreenProps, useFocusEffect } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { isFeatureVisible } from '../config/feature-status';
import { FadeIn, LoadingPulse } from '../components/premium/premium-ui';
import { RitualProgressRing } from '../components/ritual/ritual-progress-ring';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { HomeHeroSection } from '../components/phase6/home-hero-section';
import { HomeMorningBriefCard } from '../components/home/home-morning-brief-card';
import { DelightBanner } from '../components/phase7/delight-banner';
import { TodaysAdventureCard } from '../components/phase10/todays-adventure-card';
import { colors, layout, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { useCachedDashboard, invalidateDashboardCache } from '../hooks/use-cached-dashboard';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import {
  buildCompanionGreeting,
  getDaysSinceLastVisit,
  recordCompanionVisit,
} from '../services/companion/companion-presence-service';
import { getDelightMomentsService } from '../services/intelligence/delight-moments-service';
import { getConversationMilestonesService } from '../services/phase8/conversation-milestones-service';
import { getDailySurpriseService } from '../services/phase10/daily-surprise-service';
import { getCelebrationService, buildLevelUpMessage } from '../services/phase10/celebration-service';
import { getFollowUpEngineService } from '../services/phase11/follow-up-engine-service';
import { getLivingWowService } from '../services/phase11/living-wow-service';
import { getVoxaAvatarTint, getVoxaDisplayName } from '../utils/companion-display';
import { hapticCelebrate } from '../utils/haptics';
import { getRitualService } from '../services/ritual/ritual-service';
import { getDailyReflectionService } from '../services/reflection/daily-reflection-service';
import { navigateToRoutine } from '../utils/home-navigation';
import { RitualHomeState } from '../types/ritual';
import { recordTiming } from '../utils/performance-metrics';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function HomeScreen({ navigation }: Props) {
  const { profile, companion, services } = useVoxa();

  const fetchDashboard = useCallback(
    (userId: string) => companion.getHomeDashboard(userId),
    [companion],
  );

  const { dashboard, isLoading, load, invalidate } = useCachedDashboard(profile?.id, fetchDashboard);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ritualState, setRitualState] = useState<RitualHomeState | null>(null);
  const [dismissedDelight, setDismissedDelight] = useState(false);
  const [dismissedMilestone, setDismissedMilestone] = useState(false);
  const [reflectionPending, setReflectionPending] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!profile) return;
      setLoadError(null);
      void load().catch((err) => {
        setLoadError(err instanceof Error ? err.message : 'Failed to load home.');
      }).finally(() => recordTiming('home.warm', Date.now()));
      void (async () => {
        const daysAway = await getDaysSinceLastVisit();
        if (isFeatureVisible('dailyCheckIn')) {
          setRitualState(await getRitualService(services.storage).getHomeState());
        } else {
          setRitualState(null);
        }
        const hour = new Date().getHours();
        if (hour >= 17) {
          const todayReflection = await getDailyReflectionService(services.storage).getToday(profile.id);
          setReflectionPending(!todayReflection?.answers.smiled.trim());
        } else {
          setReflectionPending(false);
        }
        const greeting = buildCompanionGreeting({
          profile,
          memories: dashboard?.memories ?? [],
          streakDays: dashboard?.routineSummary.streakDays,
          daysAway,
          voxaName: getVoxaDisplayName(profile),
        });
        if (greeting.mood === 'celebrating') void hapticCelebrate();
        await recordCompanionVisit();
        const pending = dashboard?.phase10.pendingLevelUp;
        if (pending && profile) {
          const reward = dashboard?.phase10.rewards.at(-1)?.title;
          void getCelebrationService(services.storage)
            .showIfNew(profile.id, {
              kind: 'level_up',
              eventKey: `level_up:${pending.newLevel}`,
              title: 'Level up!',
              subtitle: pending.message || buildLevelUpMessage(pending.newLevel),
              emoji: '⭐',
              oldLevel: pending.oldLevel,
              newLevel: pending.newLevel,
              rewardTitle: reward,
            })
            .then((shown) => {
              if (shown) void getCelebrationService(services.storage).markLevelUpShown(profile.id);
            });
        }
      })();
    }, [load, profile, services.storage, dashboard?.memories, dashboard?.routineSummary.streakDays, dashboard?.phase10.pendingLevelUp, dashboard?.phase10.rewards]),
  );

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load(true);
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const refreshPhase10 = useCallback(() => {
    invalidate();
    invalidateDashboardCache();
    void load(true);
  }, [invalidate, load]);

  if (isLoading && !dashboard) {
    return (
      <ScreenShell padded={false}>
        <LoadingPulse label="Waking up Voxa..." />
      </ScreenShell>
    );
  }

  if (loadError && !dashboard) {
    return (
      <ScreenShell padded={false}>
        <View style={styles.errorWrap}>
          <VoxaText variant="body" color="textSecondary">{loadError}</VoxaText>
          <Pressable onPress={() => void load(true).catch(() => undefined)}>
            <VoxaText variant="caption" color="primarySoft">Tap to retry</VoxaText>
          </Pressable>
        </View>
      </ScreenShell>
    );
  }

  if (!dashboard || !profile) return null;

  const voxaName = getVoxaDisplayName(profile);
  const voxaTint = getVoxaAvatarTint(profile);
  const phase7 = dashboard.phase7;
  const phase8 = dashboard.phase8;
  const phase10 = dashboard.phase10;
  const phase11 = dashboard.phase11;
  const phase12 = dashboard.phase12;

  const openTalk = (starter?: string) => {
    if (phase11.wowMoment) {
      void getLivingWowService(services.storage).markShown(profile.id, phase11.wowMoment.id);
    }
    navigation.navigate('Talk', starter ? { starterPrompt: starter } : undefined);
  };

  const respondFollowUp = () => {
    if (phase11.followUp) {
      void getFollowUpEngineService(services.storage).resolve(phase11.followUp.id, profile.id);
      openTalk(phase11.followUp.prompt);
      return;
    }
    openTalk(dashboard.dailyBriefing.suggestedAction);
  };

  return (
    <ScreenShell padded={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={colors.primarySoft} />}>
        <FadeIn>
          <HomeHeroSection
            greeting={phase11.rhythm.greeting}
            headline={phase11.emotionalMessage}
            subline={phase11.rhythm.focusLine || phase11.todayFocus}
            tint={voxaTint}
            orbMood={phase11.mood}
            orbState={phase7.livingCompanion.state}
            orbIntensity={phase7.livingCompanion.intensity}
            moodReason={phase11.moodReason}
            ritualRing={
              ritualState && isFeatureVisible('dailyCheckIn') ? (
                <RitualProgressRing
                  percent={ritualState.progressPercent}
                  morningDone={ritualState.morningDone}
                  eveningDone={ritualState.eveningDone}
                />
              ) : undefined
            }
            primaryLabel={`Talk to ${voxaName}`}
            onPrimary={() => openTalk(phase11.talkStarter ?? undefined)}
            onOrbPress={() => openTalk(phase11.talkStarter ?? undefined)}
            onCheckIn={
              ritualState?.pendingPeriod
                ? () => navigation.navigate('DailyCheckIn', { period: ritualState.pendingPeriod! })
                : undefined
            }
            onRoutine={() => navigateToRoutine(navigation)}
          />
        </FadeIn>

        {dashboard.phase4.delightMoment && !dismissedDelight ? (
          <DelightBanner
            moment={dashboard.phase4.delightMoment}
            onDismiss={() => {
              setDismissedDelight(true);
              void getDelightMomentsService(services.storage).markShown(dashboard.phase4.delightMoment!);
            }}
          />
        ) : phase8.milestone && !dismissedMilestone ? (
          <DelightBanner
            moment={{
              id: phase8.milestone.id,
              kind: 'milestone',
              title: phase8.milestone.title,
              message: phase8.milestone.message,
              showConfetti: phase8.milestone.showConfetti,
              priority: 90,
            }}
            onDismiss={() => {
              setDismissedMilestone(true);
              void getConversationMilestonesService(services.storage).markShown(phase8.milestone!);
              if (phase8.milestone?.showConfetti) void hapticCelebrate();
            }}
          />
        ) : null}

        <HomeMorningBriefCard
          dailyBriefing={dashboard.dailyBriefing}
          phase11={phase11}
          phase12={phase12}
          upcomingReminder={dashboard.upcomingReminders[0] ?? null}
          routineSummary={dashboard.routineSummary}
          reflectionPending={reflectionPending}
          onFollowUp={respondFollowUp}
          onReflection={() => navigation.navigate('DailyReflection')}
          onNews={() => navigation.navigate('DailyNews')}
          onRelationship={() => navigation.navigate('RelationshipGrowth')}
          onRoutine={() => navigateToRoutine(navigation)}
        />

        <TodaysAdventureCard
          data={phase10}
          onPrimary={() => {
            const a = phase10.adventure;
            if (a.primaryAction === 'challenge') navigation.navigate('DailyChallenge');
            else if (a.primaryAction === 'mission') navigation.navigate('WeeklyMission');
            else if (a.primaryAction === 'spin') navigation.navigate('DailySpin');
            else if (a.featuredGame) {
              navigation.navigate('ArcadeGameSession', { gameId: a.featuredGame.id });
            } else navigation.navigate('DailyChallenge');
          }}
          onChallengeDetails={() => navigation.navigate('DailyChallenge')}
          onMission={() => navigation.navigate('WeeklyMission')}
          onSecondary={() => {
            const s = phase10.adventure.surprise;
            if (s) {
              void getDailySurpriseService(services.storage).markShown(profile.id).then(refreshPhase10);
              navigation.navigate('Talk', { starterPrompt: s.actionPrompt ?? s.line });
              return;
            }
            const card = phase10.adventure.deckCard;
            if (card) navigation.navigate('Talk', { starterPrompt: card.prompt });
            else navigation.navigate('ConversationDecks');
          }}
          secondaryLabel={
            phase10.adventure.surprise
              ? 'Open surprise'
              : phase10.adventure.deckCard
                ? 'Conversation card'
                : undefined
          }
        />
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.lg,
    paddingBottom: layout.tabBarHeight + spacing.xxl,
    gap: spacing.lg,
  },
  errorWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
});
