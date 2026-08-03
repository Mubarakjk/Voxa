import { Ionicons } from '@expo/vector-icons';
import { CompositeScreenProps, useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import {
  EmptyState,
  FadeIn,
  ScreenHeader,
  SectionCard,
  SkeletonBlock,
  StatCard,
  StaggerFade,
} from '../components/premium/premium-ui';
import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { SectionHeader, VoxaText } from '../components/ui/voxa-text';
import { getGoalCategoryLabel } from '../constants/goal-options';
import { isExperimentalFeaturesEnabled } from '../config/feature-status';
import { isMemoryPinned, sortMemoriesWithPinnedFirst, VOICE_MEMORY_TAG } from '../utils/memory-pinned';
import { colors, layout, radius, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { useCachedDashboard } from '../hooks/use-cached-dashboard';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { getRoutineCoachService } from '../services/routine/routine-coach-service';
import { getRelationshipGrowthService } from '../services/relationship/relationship-growth-service';
import { getCompanionJournalService, CompanionJournalEntry } from '../services/journal/companion-journal-service';
import { formatReminderDateTime } from '../utils/reminders';
import { formatTime12Hour } from '../utils/time-parse';
import { LifeDashboardCard } from '../components/phase2/life-dashboard-card';
import { RelationshipDashboardCard } from '../components/phase2/relationship-dashboard-card';
import { DailyCoachCard } from '../components/phase2/daily-coach-card';
import { LifeTimelineSection } from '../components/phase2/life-timeline-section';
import { WeeklyGrowthCard } from '../components/phase3/weekly-growth-card';
import { CoachScoreCard } from '../components/phase5/coach-score-card';
import { SharedTimelineSection } from '../components/phase8/shared-timeline-section';
import { PhotoStorySection } from '../components/phase8/photo-story-section';
import { MonthlyReplayCard } from '../components/phase8/monthly-replay-card';
import { Phase12JourneyHub } from '../components/phase12/phase12-journey-hub';
import { JourneyPlaySection } from '../components/phase10/journey-play-section';
import { OurStorySection } from '../components/phase11/our-story-section';
import { CommandBarSheet } from '../components/life-os/command-bar-sheet';
import { recordTiming } from '../utils/performance-metrics';
import { canStartLiveVoice, openVoiceConversation } from '../utils/voice-navigation';
import { hapticSuccess } from '../utils/haptics';
import { handleCommandBarResult } from '../utils/command-bar-navigation';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Journey'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function JourneyScreen({ navigation }: Props) {
  const stackNav = useNavigation<NativeStackScreenProps<RootStackParamList>['navigation']>();
  const { profile, companion, services } = useVoxa();

  const fetchDashboard = useCallback(
    (userId: string) => companion.getHomeDashboard(userId),
    [companion],
  );

  const { dashboard, isLoading, load } = useCachedDashboard(profile?.id, fetchDashboard);

  const routineCoach = useMemo(
    () => getRoutineCoachService(services.storage, services.repositories),
    [services.storage, services.repositories],
  );
  const journalService = useMemo(
    () => getCompanionJournalService(services.storage, services.repositories),
    [services.storage, services.repositories],
  );
  const [journalEntry, setJournalEntry] = useState<CompanionJournalEntry | null>(null);
  const [dailyNudge, setDailyNudge] = useState<string | null>(null);
  const [todaySchedule, setTodaySchedule] = useState<Awaited<ReturnType<typeof routineCoach.getTodaySchedule>> | null>(null);
  const [mounted, setMounted] = useState({ timeline: false, memories: false, goals: false, extras: false });
  const [refreshing, setRefreshing] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setMounted((m) => ({ ...m, timeline: true })), 80);
    const t2 = setTimeout(() => setMounted((m) => ({ ...m, memories: true })), 200);
    const t3 = setTimeout(() => setMounted((m) => ({ ...m, goals: true })), 320);
    const t4 = setTimeout(() => setMounted((m) => ({ ...m, extras: true })), 440);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  const loadExtras = useCallback(async () => {
    if (!profile) return;
    const [entry, nudge, schedule] = await Promise.all([
      journalService.getTodayEntry().then(async (existing) => existing ?? journalService.generateTodayNote(profile.id)),
      routineCoach.getDailyNudge(profile.id, profile.displayName),
      routineCoach.getTodaySchedule(profile.id),
    ]);
    setJournalEntry(entry);
    setDailyNudge(nudge);
    setTodaySchedule(schedule);
  }, [profile, journalService, routineCoach]);

  useFocusEffect(
    useCallback(() => {
      const started = Date.now();
      void load().finally(() => recordTiming('journey.load', Date.now() - started));
      void loadExtras();
    }, [load, loadExtras]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([load(true), loadExtras()]);
    } finally {
      setRefreshing(false);
    }
  }, [load, loadExtras]);

  if (isLoading && !dashboard) {
    return (
      <ScreenShell padded={false}>
        <View style={styles.skeletonWrap}>
          <SkeletonBlock height={48} />
          <SkeletonBlock height={120} />
          <SkeletonBlock height={160} />
          <SkeletonBlock height={100} />
        </View>
      </ScreenShell>
    );
  }

  if (!dashboard) {
    return (
      <ScreenShell padded={false}>
        <EmptyState
          icon="trail-sign-outline"
          title="Your journey starts here"
          message="Talk with Voxa, set a goal, or complete a routine — your story will grow here."
          actionLabel="Start talking"
          onAction={() => navigation.navigate('Talk')}
        />
      </ScreenShell>
    );
  }

  const wow = dashboard.wowExperience;
  const phase2 = dashboard.phase2;
  const phase3 = dashboard.phase3;
  const phase8 = dashboard.phase8;
  const timeline = phase2.timeline.events;
  const routine = dashboard.routineSummary;
  const rememberMoments = dashboard.memories.filter((m) => m.tags?.includes('remember-this'));
  const photoMemories = dashboard.memories.filter((m) => m.tags?.includes('photo-memory'));
  const voiceMemories = dashboard.memories.filter((m) => m.tags?.includes(VOICE_MEMORY_TAG));
  const pinnedMemories = sortMemoriesWithPinnedFirst(dashboard.memories).filter((m) => isMemoryPinned(m));
  const hasRoutineData =
    (todaySchedule?.totalCount ?? 0) > 0 || routine.blocks.length > 0 || Boolean(dailyNudge);
  const experimental = isExperimentalFeaturesEnabled();

  const markRoutineDone = async (blockId: string) => {
    if (!profile) return;
    try {
      await routineCoach.markBlock(profile.id, blockId, 'completed');
      void hapticSuccess();
      void getRelationshipGrowthService(services.storage, services.repositories)
        .recordRoutineCompleted(profile.id)
        .catch(() => undefined);
      void load();
      void loadExtras();
    } catch {
      Alert.alert('Could not update routine', 'Something went wrong. Please try again.');
    }
  };

  const skipRoutine = async (blockId: string) => {
    if (!profile) return;
    try {
      await routineCoach.markBlock(profile.id, blockId, 'skipped');
      void loadExtras();
    } catch (err) {
      Alert.alert('Could not skip task', err instanceof Error ? err.message : 'Try again.');
    }
  };

  const snoozeRoutine = async (blockId: string) => {
    if (!profile) return;
    try {
      await routineCoach.markBlock(profile.id, blockId, 'snoozed');
      void loadExtras();
    } catch (err) {
      Alert.alert('Could not snooze task', err instanceof Error ? err.message : 'Try again.');
    }
  };

  return (
    <ScreenShell padded={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={colors.primarySoft} />}>
        <FadeIn>
          <ScreenHeader
            eyebrow="Your story together"
            title="Journey"
            subtitle="Presence, progress, and the chapters you share."
          />
        </FadeIn>

        <Pressable
          onPress={() => setCommandOpen(true)}
          style={styles.searchEntry}
          accessibilityRole="button"
          accessibilityLabel="Search your life">
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <VoxaText variant="body" color="textMuted">
            Search your life…
          </VoxaText>
        </Pressable>

        {wow.streakDays >= 7 && wow.streakDays % 7 === 0 ? (
          <StaggerFade index={0}>
            <GlassCard style={styles.streakCelebrate}>
              <VoxaText variant="caption" color="primarySoft">
                Streak celebration
              </VoxaText>
              <VoxaText variant="subtitle">{wow.streakDays}-day streak</VoxaText>
              <VoxaText variant="body" color="textSecondary">
                Showing up this consistently is rare. Open Achievements to see what you unlocked.
              </VoxaText>
              <Pressable
                onPress={() => stackNav.navigate('AchievementCentre')}
                style={styles.streakCta}
                accessibilityRole="button"
                accessibilityLabel="Open achievements">
                <VoxaText variant="caption" color="primarySoft">
                  View achievements
                </VoxaText>
              </Pressable>
            </GlassCard>
          </StaggerFade>
        ) : null}

        <StaggerFade index={0}>
          <View style={styles.statsRow}>
            <StatCard label="Memories" value={String(dashboard.memories.length)} detail="What Voxa remembers" />
            <StatCard label="Goals" value={String(dashboard.activeGoals.length)} detail="Active right now" />
            <StatCard label="Bond" value={`${phase2.relationshipDashboard.relationshipScore}`} detail="Relationship score" />
          </View>
        </StaggerFade>

        <StaggerFade index={1}>
          <SectionCard
            title="Life Dashboard"
            subtitle="Life Score, today’s focus, and your toolkit"
            actionLabel="Open"
            onPress={() => stackNav.navigate('LifeOSHub')}
          />
        </StaggerFade>

        <StaggerFade index={2}>
          <Phase12JourneyHub
            data={dashboard.phase12}
            onNavigate={(screen) => {
              if (screen === 'ScheduledCheckIns') stackNav.navigate('ScheduledCheckIns');
              else if (screen === 'ProactiveCheckIns') stackNav.navigate('ProactiveCheckIns');
              else if (screen === 'DailyReflection') stackNav.navigate('DailyReflection');
              else if (screen === 'RelationshipGrowth') stackNav.navigate('RelationshipGrowth');
              else if (screen === 'MoodTimeline') stackNav.navigate('MoodTimeline');
              else if (screen === 'WeeklyLetter') stackNav.navigate('WeeklyLetter');
              else if (screen === 'PhotoMemories') stackNav.navigate('PhotoMemories');
              else if (screen === 'MoodJournal') stackNav.navigate('MoodJournal');
              else if (screen === 'CoachingHub') stackNav.navigate('CoachingHub');
              else if (screen === 'ConversationWorlds') stackNav.navigate('ConversationWorlds');
              else if (screen === 'RelationshipTimeline') stackNav.navigate('RelationshipTimeline');
              else if (screen === 'CompanionChallenges') stackNav.navigate('CompanionChallenges');
              else if (screen === 'GiftsCollection') stackNav.navigate('GiftsCollection');
              else if (screen === 'DailyNews') stackNav.navigate('DailyNews');
              else if (screen === 'NotesHub') stackNav.navigate('NotesHub');
            }}
          />
        </StaggerFade>

        {dashboard.phase11?.ourStory?.length ? (
          <StaggerFade index={3}>
            <OurStorySection entries={dashboard.phase11.ourStory} />
          </StaggerFade>
        ) : null}

        {dashboard.phase10 ? (
          <StaggerFade index={4}>
            <JourneyPlaySection
              data={dashboard.phase10}
              onArcade={() => stackNav.navigate('GamesHub')}
              onAchievements={() => stackNav.navigate('AchievementCentre')}
              onDecks={() => stackNav.navigate('ConversationDecks')}
              onChallenge={() => stackNav.navigate('DailyChallenge')}
              onMission={() => stackNav.navigate('WeeklyMission')}
            />
          </StaggerFade>
        ) : null}

        {phase8.sharedTimeline.length > 0 ? (
          <FadeIn delay={15}>
            <SharedTimelineSection entries={phase8.sharedTimeline} />
          </FadeIn>
        ) : null}

        {phase8.monthlyReplay ? (
          <FadeIn delay={18}>
            <MonthlyReplayCard
              replay={phase8.monthlyReplay}
              onOpen={() => stackNav.navigate('MonthlyReplay')}
            />
          </FadeIn>
        ) : null}

        {phase8.photoStory.length > 0 ? (
          <FadeIn delay={20}>
            <PhotoStorySection items={phase8.photoStory} />
          </FadeIn>
        ) : null}

        <FadeIn delay={22}>
          <SectionCard
            title="Shared challenges"
            subtitle={phase8.activeChallenge ? phase8.activeChallenge.title : 'Build habits together'}
            actionLabel="Open"
            onPress={() => stackNav.navigate('SharedChallenges')}
          />
        </FadeIn>

        <FadeIn delay={20}>
          <LifeDashboardCard data={phase2.lifeDashboard} />
        </FadeIn>

        <FadeIn delay={40}>
          <DailyCoachCard coach={phase2.dailyCoach} />
        </FadeIn>

        {phase3.weeklyGrowth ? (
          <FadeIn delay={45}>
            <WeeklyGrowthCard growth={phase3.weeklyGrowth} />
          </FadeIn>
        ) : null}

        {dashboard.phase5 ? (
          <FadeIn delay={46}>
            <CoachScoreCard phase5={dashboard.phase5} />
          </FadeIn>
        ) : null}

        <FadeIn delay={48}>
          <SectionCard
            title="Do something together"
            subtitle="Activities with clear start and end"
            actionLabel="Browse"
            onPress={() => stackNav.navigate('Activities')}
          />
        </FadeIn>

        {phase3.knowledgeHighlights.length > 0 ? (
          <FadeIn delay={48}>
            <SectionCard title="Connected profile" subtitle={`Showing up as ${phase3.adaptiveModeDisplay}`}>
              <VoxaText variant="body" color="textSecondary">
                {phase3.knowledgeHighlights.join(' · ')}
              </VoxaText>
              {phase3.sportsHighlight ? (
                <VoxaText variant="caption" color="textMuted">
                  Sports: {phase3.sportsHighlight}
                </VoxaText>
              ) : null}
            </SectionCard>
          </FadeIn>
        ) : null}

        {dashboard.phase4.relationshipGrowth.evolutionLine ? (
          <FadeIn delay={50}>
            <SectionCard
              title="Our friendship"
              subtitle={dashboard.phase4.relationshipGrowth.anniversaryLine ?? undefined}
              actionLabel="Growth"
              onPress={() => stackNav.navigate('RelationshipGrowth')}>
              <VoxaText variant="body" color="textSecondary">
                {dashboard.phase4.relationshipGrowth.evolutionLine}
              </VoxaText>
            </SectionCard>
          </FadeIn>
        ) : null}

        <FadeIn delay={60}>
          <RelationshipDashboardCard
            data={phase2.relationshipDashboard}
            summary={dashboard.relationshipSummary}
          />
        </FadeIn>

        {phase2.emotionalMoments.length > 0 ? (
          <FadeIn delay={70}>
            <SectionHeader title="Emotional moments" />
            {phase2.emotionalMoments.slice(0, 2).map((moment) => (
              <SectionCard key={moment.id} title={moment.title} subtitle={moment.kind}>
                <VoxaText variant="body" color="textSecondary">
                  {moment.message}
                </VoxaText>
              </SectionCard>
            ))}
          </FadeIn>
        ) : null}

        {phase2.memoryThemes.length > 0 ? (
          <FadeIn delay={75}>
            <SectionHeader title="Memory themes" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.themeRow}>
              {phase2.memoryThemes.map((theme) => (
                <GlassCard key={theme.theme} style={styles.themeCard}>
                  <VoxaText variant="caption" color="primarySoft">
                    {theme.label}
                  </VoxaText>
                  <VoxaText variant="subtitle">{theme.count}</VoxaText>
                </GlassCard>
              ))}
            </ScrollView>
          </FadeIn>
        ) : null}

        {(wow.streakDays > 0 || dashboard.memories.length > 0 || dashboard.activeGoals.length > 0) ? (
          <>
            <SectionHeader title="What we've achieved together" />
            <SectionCard
              title="Growth summary"
              subtitle={`${wow.streakDays} days · ${dashboard.memories.length} memories · ${dashboard.activeGoals.length} active goals`}>
              <VoxaText variant="body" color="textSecondary">
                {dashboard.relationshipSummary}
              </VoxaText>
              <View style={styles.moodRow}>
                <Ionicons name="happy-outline" size={16} color={colors.primarySoft} />
                <VoxaText variant="caption" color="textMuted">
                  Mood: {wow.moodLabel} — {wow.moodDetail}
                </VoxaText>
              </View>
            </SectionCard>
          </>
        ) : null}

        {mounted.timeline && timeline.length > 0 ? (
          <>
            <SectionHeader title="Life timeline" />
            <LifeTimelineSection timeline={phase2.timeline} />
          </>
        ) : null}

        {mounted.extras && journalEntry ? (
          <>
            <SectionHeader title="Daily companion journal" />
            <SectionCard title="Today's note" subtitle={journalEntry.date}>
              <VoxaText variant="body" color="textSecondary">
                {journalEntry.isPrivate ? 'This note is private.' : journalEntry.body}
              </VoxaText>
              <View style={styles.journalActions}>
                <Pressable onPress={() => void journalService.setPrivate(journalEntry.id, !journalEntry.isPrivate).then(loadExtras)}>
                  <VoxaText variant="caption" color="primarySoft">
                    {journalEntry.isPrivate ? 'Make visible' : 'Make private'}
                  </VoxaText>
                </Pressable>
                <Pressable onPress={() => void journalService.deleteEntry(journalEntry.id).then(() => setJournalEntry(null))}>
                  <VoxaText variant="caption" color="danger">
                    Delete
                  </VoxaText>
                </Pressable>
              </View>
            </SectionCard>
          </>
        ) : null}

        {mounted.extras && hasRoutineData ? (
          <>
            <SectionHeader title="Routine Coach" />
            <SectionCard
              title="Today's timeline"
              subtitle={
                todaySchedule && todaySchedule.totalCount > 0
                  ? `${todaySchedule.completionPercent}% complete · ${todaySchedule.streakDays} day streak`
                  : 'Your daily rhythm'
              }>
              {dailyNudge ? (
                <VoxaText variant="caption" color="primarySoft" style={styles.nudge}>
                  {dailyNudge}
                </VoxaText>
              ) : null}
              {todaySchedule?.nextBlock ? (
                <VoxaText variant="body" color="textSecondary">
                  Next: {todaySchedule.nextBlock.title} at{' '}
                  {formatTime12Hour(
                    Number(todaySchedule.nextBlock.time.split(':')[0]),
                    Number(todaySchedule.nextBlock.time.split(':')[1]),
                  )}
                </VoxaText>
              ) : null}
              {(todaySchedule?.blocks ?? routine.blocks).slice(0, 6).map((block) => {
            const [h, m] = block.time.split(':').map(Number);
            const status = block.completion?.status;
            const done = status === 'completed';
            const skipped = status === 'skipped';
            const snoozed = status === 'snoozed';
            return (
              <View key={block.id} style={styles.routineRow}>
                <Pressable style={styles.routineMain} onPress={() => !done && void markRoutineDone(block.id)}>
                  <VoxaText variant="body" color={done ? 'textMuted' : 'text'}>
                    {done ? '✓ ' : skipped ? '– ' : snoozed ? '⏸ ' : '○ '}
                    {block.title}
                  </VoxaText>
                  <VoxaText variant="caption" color="textMuted">
                    {formatTime12Hour(h, m)}
                  </VoxaText>
                </Pressable>
                {!done ? (
                  <View style={styles.routineActions}>
                    <Pressable onPress={() => void skipRoutine(block.id)}>
                      <VoxaText variant="caption" color="textMuted">
                        Skip
                      </VoxaText>
                    </Pressable>
                    <Pressable onPress={() => void snoozeRoutine(block.id)}>
                      <VoxaText variant="caption" color="textMuted">
                        Snooze
                      </VoxaText>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );
          })}
            </SectionCard>
          </>
        ) : null}

        {mounted.memories && pinnedMemories.length > 0 ? (
          <>
            <SectionHeader title="Pinned memories" />
            {pinnedMemories.slice(0, 5).map((memory) => (
              <SectionCard key={memory.id} title={memory.title} subtitle={memory.category}>
                <VoxaText variant="body" color="textSecondary" numberOfLines={3}>
                  {memory.content}
                </VoxaText>
              </SectionCard>
            ))}
          </>
        ) : null}

        <SectionHeader title="Weekly recap" />
        <SectionCard
          title="Your week with Voxa"
          subtitle="Reflection when enough data exists"
          actionLabel="Open"
          onPress={() => stackNav.navigate('WeeklyRecap')}
        />

        {mounted.memories && rememberMoments.length > 0 ? (
          <>
            <SectionHeader title="Remember this" />
            {rememberMoments.slice(0, 5).map((memory) => (
              <SectionCard
                key={memory.id}
                title={memory.title}
                subtitle={new Date(memory.occurredAt ?? memory.createdAt).toLocaleDateString()}>
                <VoxaText variant="body" color="textSecondary" numberOfLines={3}>
                  {memory.content}
                </VoxaText>
              </SectionCard>
            ))}
          </>
        ) : null}

        {mounted.memories && photoMemories.length > 0 ? (
          <>
            <SectionHeader title="Photo memories" />
            {photoMemories.slice(0, 5).map((memory) => (
              <SectionCard
                key={memory.id}
                title={memory.title}
                subtitle={new Date(memory.occurredAt ?? memory.createdAt).toLocaleDateString()}>
                <VoxaText variant="body" color="textSecondary" numberOfLines={3}>
                  {memory.content}
                </VoxaText>
              </SectionCard>
            ))}
          </>
        ) : null}

        {mounted.extras && wow.achievements.length > 0 ? (
          <>
            <SectionHeader title="Achievements" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.achievementRow}>
              {wow.achievements.map((item) => (
                <GlassCard key={item.id} style={styles.achievementCard}>
                  <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={22} color={colors.primarySoft} />
                  <VoxaText variant="caption" style={styles.achievementTitle}>
                    {item.title}
                  </VoxaText>
                  <VoxaText variant="caption" color="textMuted" numberOfLines={2}>
                    {item.subtitle}
                  </VoxaText>
                </GlassCard>
              ))}
            </ScrollView>
          </>
        ) : null}

        {mounted.extras && wow.monthlyRecap && !phase8.monthlyReplay ? (
          <>
            <SectionHeader title="Monthly recap" />
            <GlassCard style={styles.card}>
              <VoxaText variant="body" color="textSecondary">
                {wow.monthlyRecap}
              </VoxaText>
            </GlassCard>
          </>
        ) : null}

        {mounted.goals && dashboard.activeGoals.length > 0 ? (
          <>
            <SectionHeader title="Goals" />
            {dashboard.activeGoals.map((goal) => (
              <SectionCard
                key={goal.id}
                title={goal.title}
                subtitle={getGoalCategoryLabel(goal.category)}
                actionLabel="Plan"
                onPress={() => stackNav.navigate('GoalDetail', { goalId: goal.id })}>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${goal.progress}%` }]} />
                </View>
                <VoxaText variant="caption" color="textMuted">
                  {goal.progress}% complete
                </VoxaText>
              </SectionCard>
            ))}
          </>
        ) : null}

        {dashboard.memories.filter((m) => !m.tags?.includes('remember-this') && !m.tags?.includes('photo-memory')).length > 0 ? (
          <>
            <SectionHeader title="Memories" />
            {dashboard.memories
              .filter((m) => !m.tags?.includes('remember-this') && !m.tags?.includes('photo-memory'))
              .slice(0, 5)
              .map((memory) => (
                <SectionCard
                  key={memory.id}
                  title={memory.title}
                  subtitle={memory.category}
                  actionLabel="View all"
                  onPress={() => stackNav.navigate('Memory')}>
                  <VoxaText variant="body" color="textSecondary" numberOfLines={2}>
                    {memory.content}
                  </VoxaText>
                </SectionCard>
              ))}
          </>
        ) : null}

        {voiceMemories.length > 0 ? (
          <>
            <SectionHeader title="Voice memories" />
            {voiceMemories.slice(0, 5).map((memory) => (
              <SectionCard
                key={memory.id}
                title={memory.title}
                subtitle={new Date(memory.occurredAt ?? memory.createdAt).toLocaleDateString()}>
                <VoxaText variant="body" color="textSecondary" numberOfLines={3}>
                  {memory.content}
                </VoxaText>
              </SectionCard>
            ))}
          </>
        ) : null}

        {experimental && canStartLiveVoice() && wow.voiceMemoryCount > 0 ? (
          <>
            <SectionHeader title="Voice memories" />
            <SectionCard title="Voice conversations" subtitle={`${wow.voiceMemoryCount} voice moments saved`}>
              <Pressable onPress={() => openVoiceConversation(stackNav, { autoStart: true })}>
                <VoxaText variant="caption" color="primarySoft">
                  Continue in Talk →
                </VoxaText>
              </Pressable>
            </SectionCard>
          </>
        ) : null}

        {dashboard.upcomingReminders.length > 0 ? (
          <>
            <SectionHeader title="Check-ins & reminders" />
            {dashboard.upcomingReminders.map((reminder) => (
              <SectionCard key={reminder.id} title={reminder.title} subtitle={formatReminderDateTime(reminder.scheduledAt)} />
            ))}
          </>
        ) : null}

        {dashboard.companionNote?.trim() ? (
          <>
            <SectionHeader title="Reflections" />
            <GlassCard style={styles.card}>
              <VoxaText variant="body" color="textSecondary">
                {dashboard.companionNote}
              </VoxaText>
              <View style={styles.moodRow}>
                <Ionicons name="pulse-outline" size={16} color={colors.primarySoft} />
                <VoxaText variant="caption" color="textMuted">
                  Mood today: {wow.moodLabel} — {wow.moodDetail}
                </VoxaText>
              </View>
            </GlassCard>
          </>
        ) : null}
      </ScrollView>
      <CommandBarSheet
        visible={commandOpen}
        onClose={() => setCommandOpen(false)}
        onNavigate={(result) => handleCommandBarResult(stackNav, result)}
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.lg,
    paddingBottom: layout.tabBarHeight + spacing.xxl,
    gap: spacing.xl,
  },
  streakCelebrate: { gap: spacing.sm },
  streakCta: { minHeight: 44, justifyContent: 'center' },
  searchEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  skeletonWrap: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.xl,
    gap: spacing.md,
  },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  achievementRow: { gap: spacing.sm, paddingBottom: spacing.md },
  achievementCard: { width: 140, gap: spacing.sm, marginRight: spacing.sm },
  achievementTitle: { fontWeight: '600' },
  themeRow: { gap: spacing.sm, paddingBottom: spacing.md },
  themeCard: { width: 120, gap: 4, marginRight: spacing.sm },
  card: { gap: spacing.md, marginBottom: spacing.md },
  routineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
    gap: spacing.sm,
  },
  routineMain: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  routineActions: { flexDirection: 'row', gap: spacing.sm },
  journalActions: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm },
  nudge: { marginBottom: spacing.sm },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 999 },
  moodRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
});
