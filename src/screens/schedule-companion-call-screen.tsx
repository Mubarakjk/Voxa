import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';

import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { EmptyState, PremiumButton, ScreenHeader } from '../components/premium/premium-ui';
import { isScheduledCallsEnabled } from '../config/scheduled-calls';
import { colors, layout, radius, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import { getScheduledCallService } from '../services/scheduled-calls/scheduled-call-service';
import {
  CompanionCallTone,
  SCHEDULED_CALL_REASON_LABELS,
  ScheduledCallReason,
  ScheduledCallRepeatRule,
} from '../types/scheduled-companion-call';
import { getVoxaDisplayName } from '../utils/companion-display';

type Props = NativeStackScreenProps<RootStackParamList, 'ScheduleCompanionCall'>;

const REASONS = Object.entries(SCHEDULED_CALL_REASON_LABELS) as Array<[ScheduledCallReason, string]>;
const TONES: Array<{ id: CompanionCallTone; label: string }> = [
  { id: 'warm', label: 'Warm' },
  { id: 'motivating', label: 'Motivating' },
  { id: 'calm', label: 'Calm' },
  { id: 'coach', label: 'Coach' },
];
const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function defaultWhen(): Date {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}

export function ScheduleCompanionCallScreen({ navigation, route }: Props) {
  const { profile, services } = useVoxa();
  const svc = getScheduledCallService(services.storage);
  const editId = route.params?.callId;

  const [reason, setReason] = useState<ScheduledCallReason>('morning_motivation');
  const [customReason, setCustomReason] = useState('');
  const [when, setWhen] = useState(defaultWhen);
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [repeat, setRepeat] = useState<'never' | 'daily' | 'weekdays' | 'weekly' | 'custom_days'>('never');
  const [customDays, setCustomDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [tone, setTone] = useState<CompanionCallTone>('warm');
  const [ringtoneEnabled, setRingtoneEnabled] = useState(true);
  const [autoStartRealtime, setAutoStartRealtime] = useState(true);
  const [context, setContext] = useState('');
  const [permission, setPermission] = useState<string>('undetermined');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void svc.getPermissionState().then(setPermission);
  }, [svc]);

  useEffect(() => {
    if (!profile || !editId) return;
    void svc.get(profile.id, editId).then((item) => {
      if (!item) return;
      setReason(item.reason);
      setCustomReason(item.customReason ?? '');
      setWhen(new Date(item.nextScheduledAt));
      setRepeat(item.repeatRule.type);
      if (item.repeatRule.type === 'custom_days') setCustomDays(item.repeatRule.days);
      setTone(item.tone);
      setRingtoneEnabled(item.ringtoneEnabled);
      setAutoStartRealtime(item.autoStartRealtime);
      setContext(item.callContext ?? '');
    });
  }, [editId, profile, svc]);

  const repeatRule: ScheduledCallRepeatRule = useMemo(() => {
    if (repeat === 'custom_days') return { type: 'custom_days', days: customDays };
    return { type: repeat };
  }, [customDays, repeat]);

  if (!isScheduledCallsEnabled()) {
    return (
      <ScreenShell>
        <ScreenHeader showBack title="Schedule a call" />
        <EmptyState
          icon="call-outline"
          title="Scheduled calls are off"
          message="Enable EXPO_PUBLIC_SCHEDULED_CALLS_ENABLED to use this feature."
        />
      </ScreenShell>
    );
  }

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || profile.timezone || 'UTC';
      const companionName = getVoxaDisplayName(profile);
      const payload = {
        reason,
        customReason: reason === 'custom' ? customReason : undefined,
        scheduledAt: when.toISOString(),
        timezone,
        repeatRule,
        callContext: context,
        autoStartRealtime,
        ringtoneEnabled,
        tone,
        enabled: true,
      };

      if (editId) {
        await svc.update(profile.id, editId, payload, companionName);
      } else {
        await svc.create(profile.id, payload, companionName);
      }

      const perm = await svc.requestPermissions();
      setPermission(perm);
      if (perm === 'denied') {
        Alert.alert(
          'Alerts disabled',
          'Your schedule was saved, but notifications are off. Open Settings to allow Voxa to alert you when a scheduled companion call is ready.',
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Open Settings', onPress: () => void svc.openSystemSettings() },
          ],
        );
      } else {
        Alert.alert(
          'Scheduled',
          'This is a companion alert inside Voxa — not a real phone call.',
        );
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert('Could not schedule', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenShell padded={false}>
      <ScreenHeader showBack title={editId ? 'Edit call' : 'Schedule a call'} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <VoxaText variant="body" color="textSecondary">
          Allow Voxa to alert you when a scheduled companion call is ready. This is not a telephone call.
        </VoxaText>

        <GlassCard style={styles.card}>
          <VoxaText variant="subtitle">What should Voxa call about?</VoxaText>
          <View style={styles.chips}>
            {REASONS.map(([id, label]) => (
              <Pressable
                key={id}
                onPress={() => setReason(id)}
                style={[styles.chip, reason === id && styles.chipActive]}>
                <VoxaText variant="caption" color={reason === id ? 'text' : 'textSecondary'}>
                  {label}
                </VoxaText>
              </Pressable>
            ))}
          </View>
          {reason === 'custom' ? (
            <TextInput
              value={customReason}
              onChangeText={setCustomReason}
              placeholder="e.g. Review my presentation"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
          ) : null}
        </GlassCard>

        <GlassCard style={styles.card}>
          <VoxaText variant="subtitle">Date & time</VoxaText>
          <Pressable
            style={styles.rowBtn}
            onPress={() => {
              setShowDate((v) => !v);
              setShowTime(false);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Date ${when.toLocaleDateString()}`}>
            <Ionicons name="calendar-outline" size={18} color={colors.primarySoft} />
            <VoxaText variant="body">{when.toLocaleDateString()}</VoxaText>
          </Pressable>
          <Pressable
            style={styles.rowBtn}
            onPress={() => {
              setShowTime((v) => !v);
              setShowDate(false);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Time ${when.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`}>
            <Ionicons name="time-outline" size={18} color={colors.primarySoft} />
            <VoxaText variant="body">
              {when.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </VoxaText>
          </Pressable>
          {showDate ? (
            <DateTimePicker
              value={when}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              minimumDate={new Date()}
              onChange={(_, date) => {
                if (Platform.OS === 'android') setShowDate(false);
                if (date) {
                  const next = new Date(when);
                  next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                  setWhen(next);
                }
              }}
            />
          ) : null}
          {showTime ? (
            <DateTimePicker
              value={when}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, date) => {
                if (Platform.OS === 'android') setShowTime(false);
                if (date) {
                  const next = new Date(when);
                  next.setHours(date.getHours(), date.getMinutes(), 0, 0);
                  setWhen(next);
                }
              }}
            />
          ) : null}
        </GlassCard>

        <GlassCard style={styles.card}>
          <VoxaText variant="subtitle">Repeat</VoxaText>
          <View style={styles.chips}>
            {(['never', 'daily', 'weekdays', 'weekly', 'custom_days'] as const).map((id) => (
              <Pressable
                key={id}
                onPress={() => setRepeat(id)}
                style={[styles.chip, repeat === id && styles.chipActive]}>
                <VoxaText variant="caption" color={repeat === id ? 'text' : 'textSecondary'}>
                  {id === 'custom_days' ? 'Custom days' : id[0].toUpperCase() + id.slice(1)}
                </VoxaText>
              </Pressable>
            ))}
          </View>
          {repeat === 'custom_days' ? (
            <View style={styles.weekRow}>
              {WEEKDAY_LABELS.map((label, index) => {
                const active = customDays.includes(index);
                return (
                  <Pressable
                    key={`${label}-${index}`}
                    onPress={() =>
                      setCustomDays((prev) =>
                        prev.includes(index) ? prev.filter((d) => d !== index) : [...prev, index].sort(),
                      )
                    }
                    style={[styles.day, active && styles.dayActive]}>
                    <VoxaText variant="caption">{label}</VoxaText>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </GlassCard>

        <GlassCard style={styles.card}>
          <VoxaText variant="subtitle">Companion tone</VoxaText>
          <View style={styles.chips}>
            {TONES.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => setTone(item.id)}
                style={[styles.chip, tone === item.id && styles.chipActive]}>
                <VoxaText variant="caption" color={tone === item.id ? 'text' : 'textSecondary'}>
                  {item.label}
                </VoxaText>
              </Pressable>
            ))}
          </View>
        </GlassCard>

        <GlassCard style={styles.card}>
          <View style={styles.switchRow}>
            <VoxaText variant="body">Ringtone</VoxaText>
            <Switch value={ringtoneEnabled} onValueChange={setRingtoneEnabled} />
          </View>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <VoxaText variant="body">Start live conversation after Answer</VoxaText>
              <VoxaText variant="caption" color="textMuted">
                Microphone starts only after Voxa is open in the foreground.
              </VoxaText>
            </View>
            <Switch value={autoStartRealtime} onValueChange={setAutoStartRealtime} />
          </View>
        </GlassCard>

        <GlassCard style={styles.card}>
          <VoxaText variant="subtitle">Optional context</VoxaText>
          <TextInput
            value={context}
            onChangeText={setContext}
            placeholder="Short note for Voxa (not shown on lock screen by default)"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, styles.multiline]}
            multiline
          />
        </GlassCard>

        {permission === 'denied' ? (
          <GlassCard style={styles.card}>
            <VoxaText variant="subtitle">Alerts disabled</VoxaText>
            <VoxaText variant="caption" color="textSecondary">
              Your schedule can still be saved, but Voxa cannot ring until notifications are allowed.
            </VoxaText>
            <PremiumButton label="Open Settings" onPress={() => void svc.openSystemSettings()} />
          </GlassCard>
        ) : null}

        <PremiumButton
          label={saving ? 'Saving…' : editId ? 'Save changes' : 'Confirm schedule'}
          onPress={() => void save()}
          disabled={saving}
        />
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: { padding: layout.screenPadding, gap: spacing.md, paddingBottom: spacing.xxl },
  card: { gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.surface,
  },
  chipActive: { borderColor: colors.primarySoft, backgroundColor: 'rgba(45,212,191,0.15)' },
  rowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  multiline: { minHeight: 88, textAlignVertical: 'top' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  day: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  dayActive: { backgroundColor: 'rgba(45,212,191,0.2)', borderColor: colors.primarySoft },
});
