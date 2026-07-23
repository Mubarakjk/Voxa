import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';

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
import {
  DAILY_REFLECTION_QUESTIONS,
  DAILY_REFLECTION_XP,
  DailyReflectionAnswers,
  DailyReflectionEntry,
} from '../types/daily-reflection';
import { hapticCelebrate } from '../utils/haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'DailyReflection'>;

export function DailyReflectionScreen(_props: Props) {
  const { profile, services } = useVoxa();
  const reflectionSvc = getDailyReflectionService(services.storage);
  const growthSvc = getRelationshipGrowthService(services.storage, services.repositories);
  const [entries, setEntries] = useState<DailyReflectionEntry[]>([]);
  const [answers, setAnswers] = useState<DailyReflectionAnswers>({ smiled: '', challenged: '', grateful: '' });
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [list, today] = await Promise.all([
        reflectionSvc.list(profile.id, 60),
        reflectionSvc.getToday(profile.id),
      ]);
      setEntries(list);
      if (!editingDate && today) {
        setAnswers(today.answers);
        setEditingDate(today.date);
      }
    } finally {
      setLoading(false);
    }
  }, [editingDate, profile, reflectionSvc]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const save = async () => {
    if (!profile) return;
    if (!answers.smiled.trim() || !answers.grateful.trim()) {
      Alert.alert('Almost there', 'Please answer at least what made you smile and what you are grateful for.');
      return;
    }
    setSaving(true);
    try {
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
    <ScreenShell padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenHeader
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
                placeholder={question.placeholder}
                placeholderTextColor={colors.textMuted}
                multiline
                style={styles.input}
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
  form: { gap: spacing.md },
  field: { gap: spacing.xs },
  input: {
    minHeight: 72,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    color: colors.text,
    textAlignVertical: 'top',
  },
});
