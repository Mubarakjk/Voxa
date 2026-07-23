import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as FileSystem from 'expo-file-system/legacy';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { hasOpenAIApiKey, hasSupabaseConfig } from '../config/env';
import { colors, layout, radius, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import { getCompanionJournalService } from '../services/journal/companion-journal-service';
import { getRoutineCoachService } from '../services/routine/routine-coach-service';
import { getCurrentUserId } from '../services/supabase/client';
import { audioSessionManager } from '../services/audio/audio-session-manager';
import { getAIProviderInfo } from '../services/ai/create-ai-service';
import { getChatSaveSnapshot } from '../utils/chat-save-status';
import { getDebugPanelInfo } from '../utils/debug-info';
import { getFeatureLogs } from '../utils/feature-logger';
import { getPerformanceReport } from '../utils/performance-metrics';
import { getPlayDebugSnapshot } from '../utils/play-debug-state';
import { getVoiceNoteDebugSnapshot, recordVoiceNoteTestResult } from '../utils/voice-note-debug-state';
import { runVoiceNoteRecordingTest } from '../services/voice-notes/voice-note-recording-service';
import { voiceNoteAudioLock } from '../services/voice-notes/voice-note-audio-lock';
import { getVoiceNoteFeatureDiagnostics } from '../services/voice-notes/voice-note-access';
import { getFeatureStatus } from '../config/feature-status';

type HealthStatus = 'green' | 'yellow' | 'red';

type ServiceHealth = {
  id: string;
  label: string;
  status: HealthStatus;
  detail: string;
};

const STATUS_COLOR: Record<HealthStatus, string> = {
  green: '#4ade80',
  yellow: '#fbbf24',
  red: '#f87171',
};

export function HealthCheckScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile, services } = useVoxa();
  const [services_, setServices] = useState<ServiceHealth[]>([]);
  const [running, setRunning] = useState<string | null>(null);
  const [perf, setPerf] = useState(getPerformanceReport());

  const [testLines, setTestLines] = useState<string[]>([]);
  const [testRunning, setTestRunning] = useState(false);

  const runVoiceNoteTest = async () => {
    setTestRunning(true);
    try {
      const result = await runVoiceNoteRecordingTest();
      setTestLines(result.lines);
      recordVoiceNoteTestResult(result.pass ? 'pass' : 'fail');
    } finally {
      setTestRunning(false);
      await runAllChecks();
    }
  };

  const runAllChecks = useCallback(async () => {
    const results: ServiceHealth[] = [];
    const push = (item: ServiceHealth) => results.push(item);

    push({
      id: 'user',
      label: 'Current user',
      status: profile ? 'green' : 'red',
      detail: profile ? `${profile.displayName} (${profile.id.slice(0, 8)}…)` : 'No profile loaded',
    });

    push({
      id: 'supabase',
      label: 'Supabase',
      status: hasSupabaseConfig() ? 'green' : 'yellow',
      detail: hasSupabaseConfig() ? 'Configured' : 'Local-only mode',
    });

    try {
      const userId = await getCurrentUserId();
      push({
        id: 'auth',
        label: 'Auth session',
        status: userId ? 'green' : hasSupabaseConfig() ? 'yellow' : 'green',
        detail: userId ? `Signed in (${userId.slice(0, 8)}…)` : 'No active session',
      });
    } catch (err) {
      push({
        id: 'auth',
        label: 'Auth session',
        status: 'red',
        detail: err instanceof Error ? err.message : 'Auth check failed',
      });
    }

    push({
      id: 'openai',
      label: 'OpenAI',
      status: hasOpenAIApiKey() ? 'green' : 'yellow',
      detail: hasOpenAIApiKey() ? getAIProviderInfo().label : 'No API key — offline AI',
    });

    push({
      id: 'audio',
      label: 'Audio',
      status: audioSessionManager.voiceCallActive ? 'yellow' : 'green',
      detail: audioSessionManager.voiceCallActive
        ? 'Voice call active — recording blocked'
        : 'Session idle',
    });

    try {
      const probe = `${FileSystem.documentDirectory}voxa-health-probe.txt`;
      await FileSystem.writeAsStringAsync(probe, 'ok');
      await FileSystem.deleteAsync(probe, { idempotent: true });
      push({ id: 'storage', label: 'Storage', status: 'green', detail: 'Read/write OK' });
    } catch (err) {
      push({
        id: 'storage',
        label: 'Storage',
        status: 'red',
        detail: err instanceof Error ? err.message : 'Storage probe failed',
      });
    }

    if (profile) {
      try {
        const memories = await services.repositories.memories.listMemories(profile.id);
        push({
          id: 'memory',
          label: 'Memory',
          status: 'green',
          detail: `${memories.length} memories`,
        });
      } catch (err) {
        push({
          id: 'memory',
          label: 'Memory',
          status: 'red',
          detail: err instanceof Error ? err.message : 'Memory list failed',
        });
      }

      try {
        const routine = await getRoutineCoachService(services.storage, services.repositories).getTodaySchedule(
          profile.id,
        );
        push({
          id: 'routine',
          label: 'Routine',
          status: 'green',
          detail: `${routine.completedCount}/${routine.totalCount} blocks today`,
        });
      } catch (err) {
        push({
          id: 'routine',
          label: 'Routine',
          status: 'red',
          detail: err instanceof Error ? err.message : 'Routine load failed',
        });
      }

      try {
        const journal = getCompanionJournalService(services.storage, services.repositories);
        const entries = await journal.listEntries();
        push({
          id: 'journal',
          label: 'Journal',
          status: 'green',
          detail: `${entries.length} entries`,
        });
      } catch (err) {
        push({
          id: 'journal',
          label: 'Journal',
          status: 'red',
          detail: err instanceof Error ? err.message : 'Journal load failed',
        });
      }

      try {
        const goals = await services.repositories.goals.listActiveGoals(profile.id);
        push({
          id: 'relationship',
          label: 'Relationship',
          status: goals.length > 0 ? 'green' : 'yellow',
          detail: `${goals.length} active goals`,
        });
      } catch (err) {
        push({
          id: 'relationship',
          label: 'Relationship',
          status: 'yellow',
          detail: 'Goals unavailable',
        });
      }
    }

    const voice = getVoiceNoteDebugSnapshot();
    push({
      id: 'voice_note',
      label: 'Voice note (expo-audio)',
      status: voice.lastError ? 'red' : voice.uriExists ? 'green' : 'yellow',
      detail: voice.lastError ?? voice.lastTestResult ?? `state=${voice.state}`,
    });

    const chatSave = getChatSaveSnapshot();
    push({
      id: 'chat',
      label: 'Chat',
      status: chatSave.status.startsWith('Failed') ? 'red' : chatSave.status === 'OK' ? 'green' : 'yellow',
      detail: chatSave.status,
    });

    const debug = await getDebugPanelInfo(profile, services);
    push({
      id: 'attachments',
      label: 'Attachments',
      status: debug.storageBucketStatus?.includes('fail') ? 'red' : hasSupabaseConfig() ? 'green' : 'yellow',
      detail: debug.storageBucketStatus ?? (hasSupabaseConfig() ? 'Bucket configured' : 'Local only'),
    });

    push({
      id: 'cache',
      label: 'Cache',
      status: 'green',
      detail: `Dashboard hit ${getPerformanceReport().cache.hitPercent ?? 0}%`,
    });

    if (profile) {
      const play = await getPlayDebugSnapshot(profile.id, services.storage);
      push({
        id: 'play_xp',
        label: 'Play · XP / Level',
        status: 'green',
        detail: `${play.xp}/${play.xpToNext} XP · Lv ${play.level}`,
      });
      push({
        id: 'play_challenge',
        label: 'Play · Challenge / Mission',
        status: 'green',
        detail: `Challenge: ${play.challengeStatus} · Mission: ${play.missionStatus}`,
      });
      push({
        id: 'play_spin',
        label: 'Play · Spin / Achievements',
        status: play.duplicationGuard === 'ok' ? 'green' : 'yellow',
        detail: `Spin: ${play.spinAvailable} · Last ach: ${play.lastAchievement} · Guard: ${play.duplicationGuard}`,
      });
      push({
        id: 'play_celebration',
        label: 'Play · Celebration',
        status: 'green',
        detail: `Last event: ${play.lastCelebration} · Spin reward: ${play.lastSpinReward}`,
      });
    }

    setPerf(getPerformanceReport());
    setServices(results);
  }, [profile, services]);

  const runSingle = async (id: string) => {
    setRunning(id);
    await runAllChecks();
    setRunning(null);
  };

  useEffect(() => {
    void runAllChecks();
  }, [runAllChecks]);

  const failures = getFeatureLogs(undefined, 8).filter((e) => e.level === 'failure');

  return (
    <ScreenShell padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="chevron-back" size={20} color={colors.primarySoft} />
          <VoxaText variant="caption" color="primarySoft">
            Back
          </VoxaText>
        </Pressable>

        <VoxaText variant="title">System Health</VoxaText>
        <VoxaText variant="body" color="textSecondary">
          Tap a service to re-run checks. Green = OK, yellow = degraded, red = broken.
        </VoxaText>

        <Pressable style={styles.refreshAll} onPress={() => void runAllChecks()}>
          <VoxaText variant="caption" color="primarySoft">
            Refresh all
          </VoxaText>
        </Pressable>

        {services_.map((service) => (
          <Pressable
            key={service.id}
            style={styles.row}
            onPress={() => void runSingle(service.id)}>
            <View style={[styles.dot, { backgroundColor: STATUS_COLOR[service.status] }]} />
            <View style={styles.copy}>
              <VoxaText variant="subtitle">{service.label}</VoxaText>
              <VoxaText variant="caption" color="textMuted">
                {service.detail}
              </VoxaText>
            </View>
            {running === service.id ? (
              <ActivityIndicator size="small" color={colors.primarySoft} />
            ) : (
              <Ionicons name="refresh-outline" size={16} color={colors.textMuted} />
            )}
          </Pressable>
        ))}

        <View style={styles.section}>
          <VoxaText variant="subtitle">Voice note diagnostics</VoxaText>
          <VoxaText variant="caption" color="textMuted">
            Feature: {getFeatureStatus('voiceNote')} · UI visible: {String(getVoiceNoteFeatureDiagnostics().uiVisible)}
          </VoxaText>
          <VoxaText variant="caption" color="textMuted">
            Gate: {String(getVoiceNoteFeatureDiagnostics().gateAllowed ?? 'unchecked')} · Daily sent:{' '}
            {getVoiceNoteFeatureDiagnostics().dailyUsageCount ?? '—'}
          </VoxaText>
          <VoxaText variant="caption" color="textMuted">
            Lock: {voiceNoteAudioLock.getOwner() ?? 'idle'} · Recorder: {getVoiceNoteDebugSnapshot().state}
          </VoxaText>
          <VoxaText variant="caption" color="textMuted">
            Permission: {String(getVoiceNoteDebugSnapshot().permissionGranted ?? 'unknown')} · Error:{' '}
            {getVoiceNoteDebugSnapshot().lastError ?? 'none'}
          </VoxaText>
          {__DEV__ ? (
            <>
              <Pressable style={styles.testBtn} onPress={() => void runVoiceNoteTest()} disabled={testRunning}>
                <VoxaText variant="caption" color="primarySoft">
                  {testRunning ? 'Running 3-second test…' : 'Run 3-second recording test'}
                </VoxaText>
              </Pressable>
              <Pressable
                style={styles.testBtn}
                onPress={() => navigation.navigate('VoiceNoteRecorderDiagnostic')}>
                <VoxaText variant="caption" color="primarySoft">
                  Open recorder diagnostic (250ms native poll)
                </VoxaText>
              </Pressable>
            </>
          ) : null}
          {testLines.map((line) => (
            <VoxaText key={line} variant="caption" color="textMuted">
              {line}
            </VoxaText>
          ))}
        </View>

        <View style={styles.section}>
          <VoxaText variant="subtitle">Performance</VoxaText>
          <VoxaText variant="caption" color="textMuted">
            Chat send: {perf.timings.chatSendMs.last ?? '—'}ms · Chat load: {perf.timings.chatLoadMs.last ?? '—'}ms
          </VoxaText>
          <VoxaText variant="caption" color="textMuted">
            Cache hit: {perf.cache.hitPercent ?? 0}% ({perf.cache.dashboardHits} hits)
          </VoxaText>
        </View>

        {failures.length > 0 ? (
          <View style={styles.section}>
            <VoxaText variant="subtitle">Recent failures</VoxaText>
            {failures.map((entry) => (
              <VoxaText key={`${entry.at}-${entry.feature}`} variant="caption" color="textMuted">
                {entry.feature}: {entry.detail ?? 'failed'}
              </VoxaText>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm },
  refreshAll: { alignSelf: 'flex-start', paddingVertical: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  copy: { flex: 1, gap: 2 },
  section: { gap: spacing.xs, marginTop: spacing.sm },
  testBtn: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
});
