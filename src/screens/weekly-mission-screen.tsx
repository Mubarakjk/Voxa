import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';

import { PremiumButton, ScreenHeader } from '../components/premium/premium-ui';
import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { colors, layout, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { invalidateDashboardCache } from '../hooks/use-cached-dashboard';
import {
  daysRemainingInWeek,
  getWeeklyMissionService,
  missionCompletionPercent,
  supportiveMissionMessage,
} from '../services/phase10/weekly-mission-service';
import { WeeklyMission } from '../types/phase10-play';

export function WeeklyMissionScreen() {
  const { profile, services, companion } = useVoxa();
  const service = getWeeklyMissionService(services.storage);
  const [mission, setMission] = useState<WeeklyMission | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!profile) return;
    const dash = await companion.getHomeDashboard(profile.id);
    setMission(dash.phase10.weeklyMission);
  }, [companion, profile]);

  const run = async (fn: () => Promise<WeeklyMission | null | undefined>) => {
    if (!profile) return;
    setBusy(true);
    try {
      const next = await fn();
      if (next) setMission(next);
      invalidateDashboardCache();
    } finally {
      setBusy(false);
    }
  };

  if (!profile || !mission) {
    return (
      <ScreenShell padded={false}>
        <ScrollView contentContainerStyle={styles.scroll} onLayout={() => void refresh()}>
          <ScreenHeader title="Weekly mission" subtitle="Loading..." />
        </ScrollView>
      </ScreenShell>
    );
  }

  const pct = missionCompletionPercent(mission);
  const daysLeft = daysRemainingInWeek();
  const message = supportiveMissionMessage(mission);

  return (
    <ScreenShell padded={false}>
      <ScrollView contentContainerStyle={styles.scroll} onLayout={() => void refresh()}>
        <ScreenHeader title="Weekly mission" subtitle={`${daysLeft} days remaining · +${mission.xpReward} XP`} />

        <GlassCard style={styles.card}>
          <VoxaText variant="subtitle">{mission.title}</VoxaText>
          <VoxaText variant="body" color="textSecondary">{message}</VoxaText>
          <VoxaText variant="caption" color="textMuted">{pct}% complete · Status: {mission.status}</VoxaText>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>

          {mission.tasks.map((task) => (
            <View key={task.id} style={styles.taskRow}>
              <Ionicons
                name={task.skipped ? 'remove-circle-outline' : task.done ? 'checkmark-circle' : 'ellipse-outline'}
                size={20}
                color={task.done ? colors.primarySoft : colors.textMuted}
              />
              <View style={styles.taskCopy}>
                <VoxaText variant="body" color={task.skipped ? 'textMuted' : 'text'}>{task.label}</VoxaText>
                <VoxaText variant="caption" color="textMuted">{task.completed}/{task.target}</VoxaText>
              </View>
              {!mission.completed && mission.status !== 'abandoned' && !task.skipped ? (
                <View style={styles.taskActions}>
                  <Pressable disabled={busy} onPress={() => void run(() => service.completeTask(profile.id, task.id))}>
                    <VoxaText variant="caption" color="primarySoft">+1</VoxaText>
                  </Pressable>
                  <Pressable disabled={busy} onPress={() => void run(() => service.undoTask(profile.id, task.id))}>
                    <VoxaText variant="caption" color="textMuted">Undo</VoxaText>
                  </Pressable>
                  <Pressable disabled={busy} onPress={() => void run(() => service.skipTask(profile.id, task.id))}>
                    <VoxaText variant="caption" color="textMuted">Skip</VoxaText>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ))}

          <View style={styles.actions}>
            {mission.status === 'pending' ? (
              <PremiumButton label="Start mission" disabled={busy} onPress={() => void run(() => service.start(profile.id))} />
            ) : null}
            {mission.status === 'active' ? (
              <PremiumButton label="Abandon mission" disabled={busy} onPress={() => Alert.alert('Abandon mission?', 'No guilt — restart anytime this week.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Abandon', onPress: () => void run(() => service.abandon(profile.id)) },
              ])} />
            ) : null}
            {mission.status === 'abandoned' ? (
              <PremiumButton label="Restart mission" disabled={busy} onPress={() => void run(() => service.restart(profile.id))} />
            ) : null}
          </View>
        </GlassCard>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: layout.screenPadding, gap: spacing.lg, paddingBottom: spacing.xxl },
  card: { gap: spacing.md },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceStrong, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primarySoft },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  taskCopy: { flex: 1, gap: 2 },
  taskActions: { flexDirection: 'row', gap: spacing.sm },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
});
