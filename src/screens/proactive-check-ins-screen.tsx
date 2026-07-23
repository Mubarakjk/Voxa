import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { GlassCard } from '../components/ui/glass-card';
import { PrimaryButton } from '../components/ui/buttons';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { LoadingState } from '../components/ui/screen-state';
import { colors, layout, radius, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import { getProactiveCheckInOrchestrator } from '../services/proactive-check-ins';
import {
  PROACTIVE_INACTIVITY_OPTIONS,
  ProactiveCheckInDelivery,
  ProactiveCheckInSettings,
  ProactiveInactivityHours,
} from '../types/proactive-check-in';

type Props = NativeStackScreenProps<RootStackParamList, 'ProactiveCheckIns'>;

export function ProactiveCheckInsScreen({ navigation }: Props) {
  const { profile, services } = useVoxa();
  const orchestrator = getProactiveCheckInOrchestrator(services.storage, services.repositories);
  const [settings, setSettings] = useState<ProactiveCheckInSettings | null>(null);
  const [history, setHistory] = useState<ProactiveCheckInDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [nextSettings, nextHistory] = await Promise.all([
        orchestrator.getSettings(profile.id),
        orchestrator.history(profile.id),
      ]);
      setSettings(nextSettings);
      setHistory(nextHistory);
    } finally {
      setLoading(false);
    }
  }, [orchestrator, profile]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const saveSettings = async (patch: Partial<ProactiveCheckInSettings>) => {
    if (!profile) return;
    const next = await orchestrator.updateSettings(profile.id, patch);
    setSettings(next);
  };

  const runSync = async () => {
    if (!profile) return;
    setSyncing(true);
    try {
      await orchestrator.sync(profile.id, profile);
      await load();
    } finally {
      setSyncing(false);
    }
  };

  if (loading || !settings) {
    return (
      <ScreenShell>
        <LoadingState label="Loading proactive check-ins..." />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="chevron-back" size={20} color={colors.primarySoft} />
          <VoxaText variant="caption" color="primarySoft">Back</VoxaText>
        </Pressable>

        <VoxaText variant="title">Proactive check-ins</VoxaText>
        <VoxaText variant="body" color="textSecondary">
          Voxa notices when you have been quiet and sends a natural, unique check-in using your goals, routines, and memories.
        </VoxaText>

        <GlassCard style={styles.card}>
          <View style={styles.row}>
            <View style={styles.flex}>
              <VoxaText variant="subtitle">Enabled</VoxaText>
              <VoxaText variant="caption" color="textMuted">Respects your notification and check-in preferences</VoxaText>
            </View>
            <Switch
              value={settings.enabled}
              onValueChange={(enabled) => void saveSettings({ enabled })}
              trackColor={{ true: colors.primary, false: colors.surfaceStrong }}
            />
          </View>
        </GlassCard>

        <VoxaText variant="subtitle">Inactivity threshold</VoxaText>
        <View style={styles.chips}>
          {PROACTIVE_INACTIVITY_OPTIONS.map((option) => {
            const active = settings.inactivityHours === option.hours;
            return (
              <Pressable
                key={option.hours}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => void saveSettings({ inactivityHours: option.hours as ProactiveInactivityHours })}>
                <VoxaText variant="caption" color={active ? 'primarySoft' : 'textSecondary'}>
                  {option.label}
                </VoxaText>
              </Pressable>
            );
          })}
        </View>

        <PrimaryButton label={syncing ? 'Syncing…' : 'Sync schedule now'} onPress={() => void runSync()} disabled={syncing} />

        <GlassCard style={styles.card}>
          <VoxaText variant="subtitle">Recent check-ins</VoxaText>
          {history.length === 0 ? (
            <VoxaText variant="caption" color="textMuted">No proactive check-ins sent yet.</VoxaText>
          ) : (
            history.slice(0, 8).map((entry) => (
              <View key={entry.id} style={styles.historyRow}>
                <VoxaText variant="caption" color="textMuted">{entry.deliveredAt.slice(0, 16).replace('T', ' ')}</VoxaText>
                <VoxaText variant="body" color="textSecondary">{entry.message}</VoxaText>
              </View>
            ))
          )}
        </GlassCard>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: layout.screenPadding,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  card: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1, gap: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  historyRow: { gap: 4, paddingTop: spacing.sm },
});
