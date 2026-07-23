import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { EmptyState, SectionCard } from '../components/premium/premium-ui';
import { PrimaryButton } from '../components/ui/buttons';
import { VoxaText } from '../components/ui/voxa-text';
import { colors, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import { Goal } from '../types';
import { GoalMilestone, GoalNote, GoalPlan } from '../types/phase5-life-os';
import { getPhase5LifeOSService } from '../services/life-os/phase5-life-os-service';
import { LifeOSScreenShell } from '../components/phase5/life-os-screen-shell';

type Props = NativeStackScreenProps<RootStackParamList, 'GoalDetail'>;

export function GoalDetailScreen({ route }: Props) {
  const { profile, services } = useVoxa();
  const service = getPhase5LifeOSService(services.storage, services.repositories);
  const goalId = route.params?.goalId;
  const [goal, setGoal] = useState<import('../types').Goal | null>(null);
  const [plan, setPlan] = useState<GoalPlan | null>(null);
  const [milestones, setMilestones] = useState<GoalMilestone[]>([]);
  const [notes, setNotes] = useState<GoalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const load = useCallback(async () => {
    if (!profile || !goalId) {
      setLoading(false);
      return;
    }
    const g = await services.repositories.goals.getGoal(goalId);
    const [p, m, n] = await Promise.all([
      service.getGoalPlan(profile.id, goalId),
      service.listMilestones(profile.id, goalId),
      service.listGoalNotes(profile.id, goalId),
    ]);
    setGoal(g);
    setPlan(p);
    setMilestones(m);
    setNotes(n);
    setLoading(false);
  }, [profile, goalId, service, services.repositories.goals]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const recordNote = async (kind: GoalNote['kind']) => {
    if (!profile || !goalId) return;
    Alert.prompt('Add note', `Record a ${kind}`, async (text) => {
      if (!text?.trim()) return;
      await service.addGoalNote(profile.id, goalId, kind, text.trim());
      void load();
    });
  };

  if (!goalId) {
    return (
      <LifeOSScreenShell title="Goal Planner" subtitle="Select a goal from Journey">
        <EmptyState icon="flag-outline" title="No goal selected" message="Open Journey and tap a goal to see its plan." />
        <PrimaryButton label="Go to Journey" onPress={() => navigation.navigate('MainTabs', { screen: 'Journey' })} />
      </LifeOSScreenShell>
    );
  }

  if (loading) {
    return (
      <LifeOSScreenShell title="Goal Planner">
        <VoxaText variant="body" color="textMuted">Loading plan…</VoxaText>
      </LifeOSScreenShell>
    );
  }

  if (!goal) {
    return (
      <LifeOSScreenShell title="Goal Planner">
        <EmptyState icon="flag-outline" title="Goal not found" message="This goal may have been removed." />
      </LifeOSScreenShell>
    );
  }

  return (
    <LifeOSScreenShell title={goal.title} subtitle={`${goal.progress}% complete · ${goal.status}`}>
      {plan ? (
        <>
          <SectionCard title="Outcome" subtitle="Long-term direction">
            <VoxaText variant="body" color="textSecondary">{plan.outcome}</VoxaText>
          </SectionCard>
          {plan.todaysAction ? (
            <SectionCard title="Today's next action">
              <VoxaText variant="body" color="primarySoft">{plan.todaysAction}</VoxaText>
            </SectionCard>
          ) : null}
          {plan.coachInsight ? (
            <SectionCard title="Coach insight">
              <VoxaText variant="body" color="textSecondary">{plan.coachInsight}</VoxaText>
            </SectionCard>
          ) : null}
        </>
      ) : (
        <PrimaryButton
          label="Create plan"
          onPress={async () => {
            if (!profile) return;
            const p = await service.buildInitialPlan(goal);
            setPlan(p);
          }}
        />
      )}

      <SectionCard title="Milestones" subtitle={`${milestones.length} steps`}>
        {milestones.map((m) => (
          <View key={m.id} style={styles.row}>
            <VoxaText variant="body">{m.title}</VoxaText>
            <VoxaText variant="caption" color="textMuted">{m.status}</VoxaText>
          </View>
        ))}
        <Pressable onPress={() => {
          Alert.prompt('New milestone', 'Title', async (text) => {
            if (!profile || !text?.trim()) return;
            await service.addMilestone(profile.id, goalId, { title: text.trim() });
            void load();
          });
        }}>
          <VoxaText variant="caption" color="primarySoft">+ Add milestone</VoxaText>
        </Pressable>
      </SectionCard>

      <SectionCard title="Recent notes">
        {notes.slice(0, 5).map((n) => (
          <VoxaText key={n.id} variant="caption" color="textSecondary">[{n.kind}] {n.body}</VoxaText>
        ))}
        <View style={styles.actions}>
          <Pressable onPress={() => void recordNote('win')}><VoxaText variant="caption" color="primarySoft">Record win</VoxaText></Pressable>
          <Pressable onPress={() => void recordNote('setback')}><VoxaText variant="caption" color="primarySoft">Record setback</VoxaText></Pressable>
        </View>
      </SectionCard>

      <View style={styles.actions}>
        {goal.status === 'active' ? (
          <PrimaryButton label="Pause goal" onPress={async () => { await service.pauseGoal(profile!.id, goalId); void load(); }} />
        ) : goal.status === 'paused' ? (
          <PrimaryButton label="Resume goal" onPress={async () => { await service.resumeGoal(profile!.id, goalId); void load(); }} />
        ) : null}
        {goal.status !== 'completed' ? (
          <PrimaryButton label="Complete goal" onPress={async () => { await service.completeGoal(profile!.id, goalId); void load(); }} />
        ) : null}
      </View>
    </LifeOSScreenShell>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
});
