import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { PrimaryButton } from '../components/ui/buttons';
import { GlassCard } from '../components/ui/glass-card';
import { ErrorState, LoadingState } from '../components/ui/screen-state';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import {
  REMINDER_KIND_OPTIONS,
  REMINDER_MODE_OPTIONS,
  REMINDER_REPEAT_OPTIONS,
} from '../constants/reminder-options';
import { colors, layout, radius, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import { CompanionModeId, ReminderKind, ReminderRecurrence } from '../types';
import { combineDateAndTime } from '../utils/reminders';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateReminder'>;

function defaultDate(hoursFromNow = 1) {
  const date = new Date();
  date.setMinutes(0, 0, 0);
  date.setHours(date.getHours() + hoursFromNow);
  return date;
}

export function CreateReminderScreen({ navigation, route }: Props) {
  const { profile, companion } = useVoxa();
  const presetKind = route.params?.presetKind ?? 'check_in';

  const [title, setTitle] = useState(
    presetKind === 'check_in' ? 'Daily check-in with Voxa' : '',
  );
  const [kind, setKind] = useState<ReminderKind>(presetKind);
  const [mode, setMode] = useState<CompanionModeId>(
    presetKind === 'check_in' ? 'reflection' : 'friend',
  );
  const [recurrence, setRecurrence] = useState<ReminderRecurrence>(
    presetKind === 'check_in' ? 'daily' : 'none',
  );
  const [selectedDate, setSelectedDate] = useState(defaultDate());
  const [selectedTime, setSelectedTime] = useState(defaultDate());
  const [showDatePicker, setShowDatePicker] = useState(Platform.OS === 'ios');
  const [showTimePicker, setShowTimePicker] = useState(Platform.OS === 'ios');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) setSelectedDate(date);
  };

  const onTimeChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (date) setSelectedTime(date);
  };

  const saveReminder = async () => {
    if (!profile) return;
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Please add a title.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const scheduledAt = combineDateAndTime(selectedDate, selectedTime).toISOString();
      const result = await companion.createScheduledReminder({
        userId: profile.id,
        kind,
        title: trimmedTitle,
        scheduledAt,
        recurrence,
        mode,
        allowProactiveCall: kind === 'check_in' || kind === 'daily_goal',
      });

      Alert.alert('Scheduled', result.confirmationMessage, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save reminder.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!profile) {
    return (
      <ScreenShell padded={false}>
        <ErrorState message="Profile not available." />
      </ScreenShell>
    );
  }

  if (isSaving) {
    return (
      <ScreenShell padded={false}>
        <LoadingState label="Saving check-in..." />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell padded={false}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <VoxaText variant="caption" color="primarySoft">
              Cancel
            </VoxaText>
          </Pressable>
          <VoxaText variant="title">Set check-in</VoxaText>
          <VoxaText variant="body" color="textSecondary">
            Schedule when Voxa should reach out locally.
          </VoxaText>
        </View>

        <GlassCard style={styles.fieldCard}>
          <VoxaText variant="label" color="textMuted">
            Title
          </VoxaText>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="What should Voxa remember?"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
        </GlassCard>

        <SectionLabel label="Type" />
        <View style={styles.optionGrid}>
          {REMINDER_KIND_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              selected={kind === option.value}
              onPress={() => setKind(option.value)}
            />
          ))}
        </View>

        <SectionLabel label="Companion mode" />
        <View style={styles.optionGrid}>
          {REMINDER_MODE_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              selected={mode === option.value}
              onPress={() => setMode(option.value)}
            />
          ))}
        </View>

        <SectionLabel label="Repeat" />
        <View style={styles.optionRow}>
          {REMINDER_REPEAT_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              selected={recurrence === option.value}
              onPress={() => setRecurrence(option.value)}
            />
          ))}
        </View>

        <SectionLabel label="Date & time" />
        <GlassCard style={styles.fieldCard}>
          {Platform.OS === 'android' ? (
            <View style={styles.androidPickers}>
              <PrimaryButton label="Pick date" variant="ghost" onPress={() => setShowDatePicker(true)} />
              <PrimaryButton label="Pick time" variant="ghost" onPress={() => setShowTimePicker(true)} />
            </View>
          ) : null}
          {showDatePicker ? (
            <DateTimePicker value={selectedDate} mode="date" onChange={onDateChange} />
          ) : null}
          {showTimePicker ? (
            <DateTimePicker value={selectedTime} mode="time" onChange={onTimeChange} />
          ) : null}
          <VoxaText variant="caption" color="textSecondary">
            {combineDateAndTime(selectedDate, selectedTime).toLocaleString([], {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </VoxaText>
        </GlassCard>

        {error ? (
          <VoxaText variant="caption" color="textSecondary" style={styles.error}>
            {error}
          </VoxaText>
        ) : null}

        <PrimaryButton label="Schedule with Voxa" onPress={saveReminder} />
        <VoxaText variant="caption" color="textMuted" style={styles.note}>
          Local reminders on this device. Permission is requested when you save.
        </VoxaText>
      </ScrollView>
    </ScreenShell>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <VoxaText variant="label" color="textMuted" style={styles.sectionLabel}>
      {label}
    </VoxaText>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}>
      <VoxaText variant="caption" color={selected ? 'primarySoft' : 'textSecondary'}>
        {label}
      </VoxaText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.xxl,
  },
  header: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  fieldCard: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  input: {
    color: colors.text,
    fontSize: 16,
    paddingVertical: spacing.sm,
  },
  sectionLabel: {
    marginBottom: spacing.sm,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(45, 212, 191, 0.12)',
  },
  androidPickers: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  error: {
    marginBottom: spacing.md,
  },
  note: {
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
