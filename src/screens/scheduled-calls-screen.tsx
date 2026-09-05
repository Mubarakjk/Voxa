import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { EmptyState, PremiumButton, ScreenHeader } from '../components/premium/premium-ui';
import { LoadingState } from '../components/ui/screen-state';
import { isScheduledCallsEnabled } from '../config/scheduled-calls';
import { isRealtimeVoiceEnabled } from '../config/realtime-voice';
import { layout, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import { getScheduledCallService } from '../services/scheduled-calls/scheduled-call-service';
import {
  ScheduledCallsPreferences,
  ScheduledCompanionCall,
} from '../types/scheduled-companion-call';
import { getVoxaDisplayName } from '../utils/companion-display';

type Props = NativeStackScreenProps<RootStackParamList, 'ScheduledCalls'>;

export function ScheduledCallsScreen({ navigation }: Props) {
  const { profile, services } = useVoxa();
  const svc = getScheduledCallService(services.storage);
  const [items, setItems] = useState<ScheduledCompanionCall[]>([]);
  const [prefs, setPrefs] = useState<ScheduledCallsPreferences | null>(null);
  const [permission, setPermission] = useState<string>('undetermined');
  const [loading, setLoading] = useState(true);
  const [missedPrompt, setMissedPrompt] = useState<ScheduledCompanionCall | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const companionName = getVoxaDisplayName(profile);
      const missed = await svc.reconcile(profile.id, companionName);
      const [list, preferences, perm] = await Promise.all([
        svc.list(profile.id),
        svc.getPreferences(),
        svc.getPermissionState(),
      ]);
      setItems(list.filter((item) => item.enabled || item.status === 'missed'));
      setPrefs(preferences);
      setPermission(perm);
      setMissedPrompt(missed[0] ?? null);
    } finally {
      setLoading(false);
    }
  }, [profile, svc]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!isScheduledCallsEnabled()) {
    return (
      <ScreenShell>
        <ScreenHeader showBack title="Scheduled calls" />
        <EmptyState icon="call-outline" title="Feature disabled" message="Scheduled companion calls are turned off." />
      </ScreenShell>
    );
  }

  if (loading) {
    return (
      <ScreenShell>
        <LoadingState label="Loading scheduled calls…" />
      </ScreenShell>
    );
  }

  const callNow = (item: ScheduledCompanionCall) => {
    if (!isRealtimeVoiceEnabled()) {
      Alert.alert('Live call unavailable', 'Enable realtime voice to start this companion call.');
      return;
    }
    navigation.navigate('RealtimeCall', {
      autoStart: true,
      scheduledCallId: item.id,
      fromScheduledCall: true,
    });
  };

  return (
    <ScreenShell padded={false}>
      <ScreenHeader showBack title="Scheduled calls" />
      <ScrollView contentContainerStyle={styles.content}>
        <GlassCard style={styles.card}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <VoxaText variant="subtitle">Scheduled calls</VoxaText>
              <VoxaText variant="caption" color="textMuted">
                Opt-in companion alerts. Not a real phone call.
              </VoxaText>
            </View>
            <Switch
              value={prefs?.globallyEnabled ?? true}
              onValueChange={(value) => {
                void svc.updatePreferences({ globallyEnabled: value }).then(() => load());
              }}
            />
          </View>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <VoxaText variant="body">Notification preview</VoxaText>
              <VoxaText variant="caption" color="textMuted">
                {prefs?.notificationPreview === 'contextual'
                  ? 'Shows the call reason'
                  : 'Generic: Incoming call from Voxa'}
              </VoxaText>
            </View>
            <Switch
              value={prefs?.notificationPreview === 'contextual'}
              onValueChange={(value) => {
                void svc
                  .updatePreferences({ notificationPreview: value ? 'contextual' : 'generic' })
                  .then(() => load());
              }}
            />
          </View>
          {permission === 'denied' ? (
            <PremiumButton label="Open Settings for alerts" onPress={() => void svc.openSystemSettings()} />
          ) : null}
        </GlassCard>

        {missedPrompt ? (
          <GlassCard style={styles.card}>
            <VoxaText variant="subtitle">Missed check-in</VoxaText>
            <VoxaText variant="caption" color="textSecondary">
              You missed your check-in with Voxa. Start it now?
            </VoxaText>
            <View style={styles.row}>
              <PremiumButton label="Start now" onPress={() => callNow(missedPrompt)} />
              <PremiumButton label="Dismiss" variant="ghost" onPress={() => setMissedPrompt(null)} />
            </View>
          </GlassCard>
        ) : null}

        <PremiumButton
          label="Schedule a call"
          icon="add"
          onPress={() => navigation.navigate('ScheduleCompanionCall')}
        />

        {items.length === 0 ? (
          <EmptyState
            icon="call-outline"
            title="No scheduled calls"
            message="Choose a time for Voxa to check in with you."
          />
        ) : (
          items.map((item) => (
            <GlassCard key={item.id} style={styles.card}>
              <View style={styles.itemHeader}>
                <View style={{ flex: 1 }}>
                  <VoxaText variant="subtitle">{item.title}</VoxaText>
                  <VoxaText variant="caption" color="textSecondary">
                    {new Date(item.nextScheduledAt).toLocaleString()} · {item.repeatRule.type}
                  </VoxaText>
                  <VoxaText variant="caption" color="textMuted">
                    Status: {item.status}
                    {permission === 'denied' ? ' · alerts disabled' : ''}
                  </VoxaText>
                </View>
                <Switch
                  value={item.enabled}
                  onValueChange={(value) => {
                    if (!profile) return;
                    void svc.setEnabled(profile.id, item.id, value, getVoxaDisplayName(profile)).then(load);
                  }}
                />
              </View>
              <View style={styles.actions}>
                <Action label="Edit" onPress={() => navigation.navigate('ScheduleCompanionCall', { callId: item.id })} />
                <Action label="Call now" onPress={() => callNow(item)} />
                <Action
                  label="Cancel"
                  danger
                  onPress={() => {
                    if (!profile) return;
                    Alert.alert('Cancel scheduled call?', item.title, [
                      { text: 'Keep', style: 'cancel' },
                      {
                        text: 'Cancel call',
                        style: 'destructive',
                        onPress: () => void svc.cancel(profile.id, item.id).then(load),
                      },
                    ]);
                  }}
                />
              </View>
            </GlassCard>
          ))
        )}

        {!isRealtimeVoiceEnabled() ? (
          <VoxaText variant="caption" color="textMuted">
            Live Answer requires realtime voice. You can still schedule alerts.
          </VoxaText>
        ) : null}
      </ScrollView>
    </ScreenShell>
  );
}

function Action({ label, onPress, danger }: { label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} style={styles.action}>
      <VoxaText variant="caption" color={danger ? 'danger' : 'primarySoft'}>
        {label}
      </VoxaText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: layout.screenPadding, gap: spacing.md, paddingBottom: spacing.xxl },
  card: { gap: spacing.md },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  itemHeader: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  actions: { flexDirection: 'row', gap: spacing.md },
  action: { minHeight: 44, justifyContent: 'center' },
  row: { gap: spacing.sm },
});
