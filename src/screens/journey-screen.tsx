import { Ionicons } from '@expo/vector-icons';
import { CompositeScreenProps, useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  EmptyState,
  FadeIn,
  ScreenHeader,
  SectionCard,
  StatCard,
  TimelineItem,
} from '../components/premium/premium-ui';
import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { SectionHeader, VoxaText } from '../components/ui/voxa-text';
import { getGoalCategoryLabel } from '../constants/goal-options';
import { colors, layout, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { useCachedDashboard } from '../hooks/use-cached-dashboard';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { getRoutineCoachService } from '../services/routine/routine-coach-service';
import { formatReminderDateTime } from '../utils/reminders';
import { formatTime12Hour } from '../utils/time-parse';

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

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (isLoading && !dashboard) {
    return (
      <ScreenShell padded={false}>
        <EmptyState icon="trail-sign-outline" title="Loading your journey" message="Gathering memories, goals, and milestones..." />
      </ScreenShell>
    );
  }

  if (!dashboard) {
    return (
      <ScreenShell padded={false}>
        <EmptyState icon="trail-sign-outline" title="Your journey" message="Start talking with Voxa to build your story." />
      </ScreenShell>
    );
  }

  const wow = dashboard.wowExperience;
  const timeline = wow.lifeTimeline;
  const routine = dashboard.routineSummary;
  const routineCoach = getRoutineCoachService(services.storage, services.repositories);

  const markRoutineDone = async (blockId: string) => {
    if (!profile) return;
    await routineCoach.markBlock(profile.id, blockId, 'completed');
    void load();
  };

  return (
    <ScreenShell padded={false}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <FadeIn>
          <ScreenHeader
            eyebrow="Your story together"
            title="Journey"
            subtitle="Memories, goals, milestones, and reflections — all in one place."
          />
        </FadeIn>

        <View style={styles.statsRow}>
          <StatCard label="Memories" value={String(dashboard.memories.length)} detail="What Voxa remembers" />
          <StatCard label="Goals" value={String(dashboard.activeGoals.length)} detail="Active right now" />
          <StatCard label="Streak" value={`${wow.streakDays}d`} detail="Days together" />
        </View>

        <SectionHeader title="Routine Coach" />
        <SectionCard
          title="Today's routine"
          subtitle={
            routine.totalCount > 0
              ? `${routine.completionPercent}% complete · ${routine.streakDays} day streak`
              : 'Build your daily rhythm with Voxa'
          }>
          {routine.nextBlock ? (
            <VoxaText variant="body" color="textSecondary">
              Next: {routine.nextBlock.title} at{' '}
              {formatTime12Hour(
                Number(routine.nextBlock.time.split(':')[0]),
                Number(routine.nextBlock.time.split(':')[1]),
              )}
            </VoxaText>
          ) : (
            <VoxaText variant="caption" color="textMuted">
              Say “wake me up at 7” or “create a gym schedule” in Talk.
            </VoxaText>
          )}
          {routine.blocks.slice(0, 4).map((block) => {
            const [h, m] = block.time.split(':').map(Number);
            const done = block.completion?.status === 'completed';
            return (
              <Pressable
                key={block.id}
                style={styles.routineRow}
                onPress={() => !done && void markRoutineDone(block.id)}>
                <VoxaText variant="body" color={done ? 'textMuted' : 'text'}>
                  {done ? '✓ ' : '○ '}
                  {block.title}
                </VoxaText>
                <VoxaText variant="caption" color="textMuted">
                  {formatTime12Hour(h, m)}
                </VoxaText>
              </Pressable>
            );
          })}
        </SectionCard>

        {wow.achievements.length > 0 ? (
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

        <SectionHeader title="Relationship" />
        <SectionCard title="Your bond" subtitle="Growing with every conversation">
          <VoxaText variant="body" color="textSecondary">
            {dashboard.relationshipSummary}
          </VoxaText>
          {wow.relationshipMoments.slice(0, 2).map((moment) => (
            <VoxaText key={moment.id} variant="caption" color="textMuted">
              · {moment.message}
            </VoxaText>
          ))}
        </SectionCard>

        <SectionHeader title="Life timeline" />
        <GlassCard style={styles.card}>
          {timeline.length > 0 ? (
            timeline.map((item, index) => (
              <TimelineItem
                key={item.id}
                title={item.title}
                subtitle={item.description}
                date={new Date(item.occurredAt).toLocaleDateString()}
                isLast={index === timeline.length - 1}
              />
            ))
          ) : (
            <TimelineItem title="Journey begins" subtitle="Your timeline will grow as you and Voxa connect." isLast />
          )}
        </GlassCard>

        {wow.weeklyRecap ? (
          <>
            <SectionHeader title="Weekly recap" />
            <GlassCard style={styles.card}>
              <VoxaText variant="body" color="textSecondary">
                {wow.weeklyRecap}
              </VoxaText>
            </GlassCard>
          </>
        ) : null}

        {wow.monthlyRecap ? (
          <>
            <SectionHeader title="Monthly recap" />
            <GlassCard style={styles.card}>
              <VoxaText variant="body" color="textSecondary">
                {wow.monthlyRecap}
              </VoxaText>
            </GlassCard>
          </>
        ) : null}

        <SectionHeader title="Goals" />
        {dashboard.activeGoals.length === 0 ? (
          <SectionCard
            title="No active goals"
            subtitle="Set one with Voxa"
            actionLabel="Create"
            onPress={() => stackNav.navigate('CreateGoal')}
          />
        ) : (
          dashboard.activeGoals.map((goal) => (
            <SectionCard key={goal.id} title={goal.title} subtitle={getGoalCategoryLabel(goal.category)}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${goal.progress}%` }]} />
              </View>
              <VoxaText variant="caption" color="textMuted">
                {goal.progress}% complete
              </VoxaText>
            </SectionCard>
          ))
        )}

        <SectionHeader title="Memories" />
        {dashboard.memories.length === 0 ? (
          <SectionCard title="No memories yet" subtitle="Voxa learns as you talk" />
        ) : (
          dashboard.memories.slice(0, 5).map((memory) => (
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
          ))
        )}

        {wow.voiceMemoryCount > 0 ? (
          <>
            <SectionHeader title="Voice memories" />
            <SectionCard title="Voice conversations" subtitle={`${wow.voiceMemoryCount} voice moments saved`}>
              <Pressable onPress={() => navigation.navigate('Voxa', { action: 'voice' })}>
                <VoxaText variant="caption" color="primarySoft">
                  Start a voice call →
                </VoxaText>
              </Pressable>
            </SectionCard>
          </>
        ) : null}

        <SectionHeader title="Check-ins & reminders" />
        {dashboard.upcomingReminders.length === 0 ? (
          <SectionCard
            title="Nothing scheduled"
            actionLabel="Add"
            onPress={() => stackNav.navigate('CreateReminder', { presetKind: 'check_in' })}
          />
        ) : (
          dashboard.upcomingReminders.map((reminder) => (
            <SectionCard key={reminder.id} title={reminder.title} subtitle={formatReminderDateTime(reminder.scheduledAt)} />
          ))
        )}

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
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: layout.tabBarHeight + spacing.xxl,
  },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  achievementRow: { gap: spacing.sm, paddingBottom: spacing.md },
  achievementCard: { width: 140, gap: spacing.sm, marginRight: spacing.sm },
  achievementTitle: { fontWeight: '600' },
  card: { gap: spacing.md, marginBottom: spacing.md },
  routineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 999 },
  moodRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
});
