import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DailyReflectionTimeline } from '../components/reflection/daily-reflection-timeline';
import { GlassCard } from '../components/ui/glass-card';
import { PrimaryButton } from '../components/ui/buttons';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { LoadingState } from '../components/ui/screen-state';
import { ScreenHeader } from '../components/premium/premium-ui';
import { colors, layout, radius, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import { getDailyReflectionService } from '../services/reflection/daily-reflection-service';
import { getRelationshipGrowthService } from '../services/relationship/relationship-growth-service';
import { suggestReflectionPrompts } from '../services/journal/journal-signal';
import {
  DAILY_REFLECTION_QUESTIONS,
  DAILY_REFLECTION_XP,
  DailyReflectionAnswers,
  DailyReflectionEntry,
} from '../types/daily-reflection';
import { hapticCelebrate } from '../utils/haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'DailyReflection'>;

export function DailyReflectionScreen(_props: Props) {
  const insets = useSafeAreaInsets();
  const { profile, services } = useVoxa();
  const reflectionSvc = getDailyReflectionService(services.storage);
  const growthSvc = getRelationshipGrowthService(services.storage, services.repositories);
  const [entries, setEntries] = useState<DailyReflectionEntry[]>([]);
  const [answers, setAnswers] = useState<DailyReflectionAnswers>({ smiled: '', challenged: '', grateful: '' });
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [placeholders, setPlaceholders] = useState<Partial<Record<keyof DailyReflectionAnswers, string>>>({});

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [list, today, memories] = await Promise.all([
        reflectionSvc.list(profile.id, 60),
        reflectionSvc.getToday(profile.id),
        services.repositories.memories.listMemories(profile.id).catch(() => []),
      ]);
      setEntries(list);
      setPlaceholders(suggestReflectionPrompts({ memories, timeZone: profile.timezone }));
      if (!editingDate && today) {
        setAnswers(today.answers);
        setEditingDate(today.date);
      }
    } finally {
      setLoading(false);
    }
  }, [editingDate, profile, reflectionSvc, services.repositories.memories]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const save = async () => {
    if (!profile) return;
    if (!answers.smiled.trim() || !answers.grateful.trim()) {
      Alert.alert('Almost there', 'Please answer at least what made you smile and what you are grateful for.');
      return;
    }
    setSaving(true);
    try {
      Keyboard.dismiss();
      const { entry, xpAwarded } = await reflectionSvc.save(profile.id, answers, editingDate ?? undefined);
      if (xpAwarded > 0) {
        await growthSvc.recordReflectionCompleted(profile.id);
      }
      setEditingDate(entry.date);
      if (xpAwarded > 0) {
        hapticCelebrate();
        Alert.alert('Reflection saved', `+${xpAwarded} XP for showing up tonight.`);
      } else {
        Alert.alert('Reflection updated', 'Your timeline has been saved.');
      }
      await load();
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (entry: DailyReflectionEntry) => {
    Keyboard.dismiss();
    setAnswers(entry.answers);
    setEditingDate(entry.date);
  };

  if (loading) {
    return (
      <ScreenShell>
        <LoadingState label="Loading reflection..." />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell padded={false} safeBottom={false}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xxxl }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}>
          <Pressable style={styles.formBody} onPress={Keyboard.dismiss} accessible={false}>
            <ScreenHeader
              showBack
              eyebrow="Evening ritual"
              title="Daily reflection"
              subtitle={`Three gentle questions · +${DAILY_REFLECTION_XP} XP when you complete tonight`}
            />

            <GlassCard style={styles.form}>
              {DAILY_REFLECTION_QUESTIONS.map((question) => (
                <View key={question.id} style={styles.field}>
                  <VoxaText variant="subtitle">{question.label}</VoxaText>
                  <TextInput
                    value={answers[question.id]}
                    onChangeText={(text) => setAnswers((prev) => ({ ...prev, [question.id]: text }))}
                    placeholder={placeholders[question.id] ?? question.placeholder}
                    placeholderTextColor={colors.textMuted}
                    multiline
                    blurOnSubmit={false}
                    textAlignVertical="top"
                    style={styles.input}
                    accessibilityLabel={question.label}
                  />
                </View>
              ))}
              <PrimaryButton
                label={saving ? 'Saving…' : editingDate ? 'Update reflection' : 'Save tonight'}
                onPress={() => void save()}
                disabled={saving}
              />
            </GlassCard>

            <VoxaText variant="subtitle">Your timeline</VoxaText>
            <DailyReflectionTimeline entries={entries} onEdit={startEdit} />
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: layout.screenPadding,
    paddingTop: layout.screenPadding,
  },
  formBody: {
    flexGrow: 1,
    gap: spacing.lg,
  },
  form: {
    gap: spacing.lg,
    paddingVertical: spacing.md,
  },
  field: {
    gap: spacing.sm,
  },
  input: {
    minHeight: 80,
    paddingVertical: spacing.md12,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
});
