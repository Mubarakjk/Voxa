import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { FadeIn, PremiumButton, SectionCard, StaggerFade, TimelineItem } from '../components/premium/premium-ui';
import { GlassCard } from '../components/ui/glass-card';
import { VoxaText } from '../components/ui/voxa-text';
import { LifeOSScreenShell } from '../components/phase5/life-os-screen-shell';
import { LifeScoreRing } from '../components/life-os/life-score-ring';
import { CommandBarSheet } from '../components/life-os/command-bar-sheet';
import { CountUpNumber } from '../components/premium/count-up-number';
import { colors, radius, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import { getPhase5LifeOSService } from '../services/life-os/phase5-life-os-service';
import { computeLifeScore } from '../services/life-os/life-score-service';
import { LifeScoreSnapshot } from '../types/life-score';
import { getDailyReflectionService } from '../services/reflection/daily-reflection-service';
import { getRoutineCoachService } from '../services/routine/routine-coach-service';
import { getCompanionFocusState } from '../services/companion/companion-focus-state';
import { LIVING_STAGE_LABELS } from '../types/phase11-living-companion';
import { resolveRelationshipStage } from '../services/phase7/relationship-evolution-service';
import { handleCommandBarResult } from '../utils/command-bar-navigation';
import { hapticLight, hapticSelection } from '../utils/haptics';
import { getVoxaDisplayName } from '../utils/companion-display';
import { isFeatureVisible } from '../config/feature-status';
import { getNutritionService } from '../services/nutrition/nutrition-service';

type LifeOSRoute = Extract<
  keyof RootStackParamList,
  | 'GoalDetail'
  | 'FutureSelf'
  | 'VisionBoard'
  | 'BucketList'
  | 'DreamJournal'
  | 'DecisionSimulator'
  | 'DebateMode'
  | 'CoachScore'
  | 'MemoryConnections'
  | 'LifeBook'
  | 'MemoryMovie'
>;

const FEATURES: Array<{ id: LifeOSRoute; title: string; icon: keyof typeof Ionicons.glyphMap; desc: string }> = [
  { id: 'GoalDetail', title: 'Goal Planner', icon: 'flag-outline', desc: 'Plans & next actions' },
  { id: 'FutureSelf', title: 'Future Self', icon: 'sparkles-outline', desc: 'Who you are becoming' },
  { id: 'VisionBoard', title: 'Vision Board', icon: 'images-outline', desc: 'Dreams & progress' },
  { id: 'BucketList', title: 'Bucket List', icon: 'earth-outline', desc: 'Experiences' },
  { id: 'DreamJournal', title: 'Dream Journal', icon: 'moon-outline', desc: 'Private reflections' },
  { id: 'DecisionSimulator', title: 'Decisions', icon: 'git-compare-outline', desc: 'Weigh options' },
  { id: 'DebateMode', title: 'Debate', icon: 'chatbox-ellipses-outline', desc: 'Challenge thinking' },
  { id: 'CoachScore', title: 'Score details', icon: 'stats-chart-outline', desc: 'Transparent domains' },
  { id: 'MemoryConnections', title: 'Connections', icon: 'link-outline', desc: 'Linked recall' },
  { id: 'LifeBook', title: 'Life Book', icon: 'book-outline', desc: 'Monthly chapters' },
  { id: 'MemoryMovie', title: 'Memory Movie', icon: 'film-outline', desc: 'Storyboard preview' },
];

export function LifeOSHubScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile, services, companion } = useVoxa();
  const service = useMemo(
    () => getPhase5LifeOSService(services.storage, services.repositories),
    [services.storage, services.repositories],
  );
  const [lifeScore, setLifeScore] = useState<LifeScoreSnapshot | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const [bondScore, setBondScore] = useState(0);
  const [stageLabel, setStageLabel] = useState('New Friend');
  const [timelinePreview, setTimelinePreview] = useState<
    Array<{ id: string; title: string; subtitle?: string; date: string }>
  >([]);
  const [commandOpen, setCommandOpen] = useState(false);
  const [routineLine, setRoutineLine] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!profile) return;
      void (async () => {
        void service.refreshMemoryConnections(profile.id);
        const [dash, reflection, schedule, focusState, nutritionPrefs] = await Promise.all([
          companion.getHomeDashboard(profile.id).catch(() => null),
          getDailyReflectionService(services.storage).getToday(profile.id),
          getRoutineCoachService(services.storage, services.repositories).getTodaySchedule(profile.id),
          getCompanionFocusState(profile.id),
          isFeatureVisible('calorieTracking')
            ? getNutritionService(services.storage).getPreferences(profile.id)
            : Promise.resolve(null),
        ]);

        const coach = await service.getCoachScore(profile.id, schedule.completionPercent);
        const relationshipScore = dash?.phase2.relationshipDashboard.relationshipScore ?? 0;
        const stage = resolveRelationshipStage({
          conversationCount: dash?.phase2.relationshipDashboard.conversationCount ?? 0,
          sharedMemories: dash?.phase2.relationshipDashboard.sharedMemories ?? 0,
          daysTogether: dash?.phase2.relationshipDashboard.daysTogether ?? 0,
          goalsCompleted: dash?.phase2.relationshipDashboard.goalsAchieved ?? 0,
        });

        setLifeScore(
          computeLifeScore({
            coach,
            relationshipScore,
            activeGoals: dash?.dailyBriefing.activeGoals ?? [],
            reflectionDoneToday: Boolean(reflection?.answers.smiled.trim()),
            nutritionModeOn: Boolean(nutritionPrefs && nutritionPrefs.mode !== 'off'),
          }),
        );
        setBondScore(relationshipScore);
        setStageLabel(LIVING_STAGE_LABELS[stage] ?? 'Friend');
        setFocus(
          focusState?.focus ||
            dash?.phase11.todayFocus ||
            dash?.dailyBriefing.activeGoals?.[0]?.title ||
            null,
        );
        setRoutineLine(
          schedule.totalCount > 0
            ? `${schedule.completedCount}/${schedule.totalCount} routines today`
            : null,
        );
        setTimelinePreview(
          (dash?.phase2.timeline.events ?? []).slice(0, 4).map((e) => ({
            id: e.id,
            title: e.title,
            subtitle: e.description,
            date: new Date(e.occurredAt).toLocaleDateString(),
          })),
        );
      })();
    }, [profile, service, companion, services.storage, services.repositories]),
  );

  const voxaName = profile ? getVoxaDisplayName(profile) : 'Voxa';

  return (
    <LifeOSScreenShell
      title="Life"
      subtitle="Your private pulse — consistency over time, never a judgment."
      disclaimer="Life Score is a calm visualisation of habits and moments. It is not a grade.">
      <FadeIn>
        <GlassCard style={styles.hero}>
          <View style={styles.heroTop}>
            <LifeScoreRing overall={lifeScore?.overall ?? 0} />
            <View style={styles.heroCopy}>
              <VoxaText variant="caption" color="primarySoft">
                {stageLabel}
              </VoxaText>
              <VoxaText variant="subtitle">Bond</VoxaText>
              <CountUpNumber value={bondScore} style={styles.bondValue} />
              <VoxaText variant="caption" color="textMuted" style={styles.summary}>
                {lifeScore?.summaryLine ?? 'Gathering your rhythm…'}
              </VoxaText>
            </View>
          </View>

          <View style={styles.focusBlock}>
            <VoxaText variant="caption" color="textMuted">
              Today’s focus
            </VoxaText>
            <VoxaText variant="body">{focus ?? 'Open Talk and set an intention when you’re ready.'}</VoxaText>
            {routineLine ? (
              <VoxaText variant="caption" color="primarySoft">
                {routineLine}
              </VoxaText>
            ) : null}
          </View>

          <PremiumButton
            label={`Talk to ${voxaName}`}
            icon="chatbubbles"
            onPress={() => {
              void hapticLight();
              navigation.navigate('MainTabs', {
                screen: 'Talk',
                params: focus ? { starterPrompt: `Let's focus on: ${focus}` } : undefined,
              });
            }}
          />

          <Pressable
            style={styles.searchEntry}
            onPress={() => {
              void hapticSelection();
              setCommandOpen(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Search your life">
            <Ionicons name="search" size={18} color={colors.primarySoft} />
            <VoxaText variant="body" color="textSecondary">
              Search your life…
            </VoxaText>
          </Pressable>
        </GlassCard>
      </FadeIn>

      <StaggerFade index={0}>
        <SectionCard
          title="Life Score"
          subtitle="Private categories — tap details for transparent coaching domains">
          <View style={styles.scoreGrid}>
            {(lifeScore?.categories ?? []).map((cat) => (
              <View key={cat.id} style={styles.scoreCell}>
                <VoxaText variant="caption" color="textMuted">
                  {cat.label}
                </VoxaText>
                <VoxaText variant="subtitle">{cat.value}</VoxaText>
              </View>
            ))}
          </View>
          <Pressable onPress={() => navigation.navigate('CoachScore')} style={styles.linkRow}>
            <VoxaText variant="caption" color="primarySoft">
              View score details
            </VoxaText>
            <Ionicons name="chevron-forward" size={14} color={colors.primarySoft} />
          </Pressable>
        </SectionCard>
      </StaggerFade>

      <StaggerFade index={1}>
        <SectionCard title="Timeline" subtitle="Moments across your journey">
          {timelinePreview.length === 0 ? (
            <VoxaText variant="body" color="textSecondary">
              Talk, set goals, and complete routines — your timeline will grow here.
            </VoxaText>
          ) : (
            timelinePreview.map((item, index) => (
              <TimelineItem
                key={item.id}
                title={item.title}
                subtitle={item.subtitle}
                date={item.date}
                isLast={index === timelinePreview.length - 1}
              />
            ))
          )}
          <Pressable onPress={() => navigation.navigate('LifeTimeline')} style={styles.linkRow}>
            <VoxaText variant="caption" color="primarySoft">
              Open full timeline
            </VoxaText>
            <Ionicons name="chevron-forward" size={14} color={colors.primarySoft} />
          </Pressable>
        </SectionCard>
      </StaggerFade>

      <StaggerFade index={2}>
        <View style={styles.shortcutRow}>
          <Shortcut
            icon="heart-outline"
            label="Memories"
            onPress={() => navigation.navigate('Memory')}
          />
          <Shortcut
            icon="moon-outline"
            label="Reflect"
            onPress={() => navigation.navigate('DailyReflection')}
          />
          <Shortcut
            icon="calendar-outline"
            label="Weekly"
            onPress={() => navigation.navigate('WeeklyRecap')}
          />
          <Shortcut
            icon="trophy-outline"
            label="Wins"
            onPress={() => navigation.navigate('AchievementCentre')}
          />
        </View>
      </StaggerFade>

      <StaggerFade index={3}>
        <SectionCard title="Toolkit" subtitle="Deeper Life OS tools when you need them">
          <View style={styles.grid}>
            {FEATURES.map((feature) => (
              <GlassCard
                key={feature.id}
                style={styles.card}
                onPress={() => navigation.navigate(feature.id)}>
                <Ionicons name={feature.icon} size={20} color={colors.primarySoft} />
                <VoxaText variant="caption" style={styles.cardTitle}>
                  {feature.title}
                </VoxaText>
              </GlassCard>
            ))}
          </View>
        </SectionCard>
      </StaggerFade>

      <CommandBarSheet
        visible={commandOpen}
        onClose={() => setCommandOpen(false)}
        onNavigate={(result) => handleCommandBarResult(navigation, result)}
      />
    </LifeOSScreenShell>
  );
}

function Shortcut({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.shortcut} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <Ionicons name={icon} size={18} color={colors.primarySoft} />
      <VoxaText variant="caption">{label}</VoxaText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.md, padding: spacing.lg },
  heroTop: { flexDirection: 'row', gap: spacing.lg, alignItems: 'center' },
  heroCopy: { flex: 1, gap: 4 },
  bondValue: { fontSize: 26, lineHeight: 30, color: colors.primarySoft },
  summary: { marginTop: spacing.xs },
  focusBlock: { gap: 4 },
  searchEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  scoreGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  scoreCell: { width: '30%', gap: 2 },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
    minHeight: 44,
  },
  shortcutRow: { flexDirection: 'row', gap: spacing.sm },
  shortcut: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    minHeight: 72,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  card: { width: '31%', gap: 6, padding: spacing.sm, minHeight: 88 },
  cardTitle: { fontWeight: '600' },
});
