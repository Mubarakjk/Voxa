import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';

import { PrimaryButton } from '../components/ui/buttons';
import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { GOAL_CATEGORIES } from '../constants/goal-options';
import { colors, layout, radius, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import { GoalCategory } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateGoal'>;

export function CreateGoalScreen({ navigation }: Props) {
  const { profile, companion } = useVoxa();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<GoalCategory>('general');
  const [progress, setProgress] = useState('0');
  const [linkCheckIn, setLinkCheckIn] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveGoal = async () => {
    if (!profile) return;
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Please add a goal title.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const result = await companion.createGoal(
        {
          userId: profile.id,
          title: trimmedTitle,
          description: description.trim() || undefined,
          category,
          progress: Number(progress) || 0,
        },
        { linkCheckIn },
      );

      Alert.alert(
        'Goal saved',
        linkCheckIn && result.linkedReminder
          ? `Voxa will check in daily on "${trimmedTitle}".`
          : `"${trimmedTitle}" is now being tracked locally.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save goal.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScreenShell padded={false}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <VoxaText variant="title" style={styles.title}>
          New goal
        </VoxaText>
        <VoxaText variant="body" color="textSecondary" style={styles.subtitle}>
          Track progress locally and optionally link a daily check-in.
        </VoxaText>

        {error ? (
          <GlassCard style={styles.errorCard}>
            <VoxaText variant="caption" style={{ color: colors.danger }}>
              {error}
            </VoxaText>
          </GlassCard>
        ) : null}

        <GlassCard style={styles.field}>
          <VoxaText variant="label" color="textMuted">
            Title
          </VoxaText>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="What do you want to achieve?"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
        </GlassCard>

        <GlassCard style={styles.field}>
          <VoxaText variant="label" color="textMuted">
            Description
          </VoxaText>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Optional details"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, styles.multiline]}
            multiline
          />
        </GlassCard>

        <VoxaText variant="label" color="textMuted" style={styles.sectionLabel}>
          Category
        </VoxaText>
        <View style={styles.chips}>
          {GOAL_CATEGORIES.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => setCategory(item.id)}
              style={[styles.chip, category === item.id && styles.chipActive]}>
              <VoxaText variant="caption" color={category === item.id ? 'text' : 'textSecondary'}>
                {item.label}
              </VoxaText>
            </Pressable>
          ))}
        </View>

        <GlassCard style={styles.field}>
          <VoxaText variant="label" color="textMuted">
            Progress (%)
          </VoxaText>
          <TextInput
            value={progress}
            onChangeText={setProgress}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
        </GlassCard>

        <GlassCard style={styles.switchRow}>
          <View style={styles.switchCopy}>
            <VoxaText variant="subtitle">Daily check-in</VoxaText>
            <VoxaText variant="caption" color="textSecondary">
              Link a goal reminder so Voxa can check in
            </VoxaText>
          </View>
          <Switch value={linkCheckIn} onValueChange={setLinkCheckIn} />
        </GlassCard>

        <PrimaryButton
          label={isSaving ? 'Saving...' : 'Save goal'}
          onPress={isSaving ? () => undefined : saveGoal}
        />
        <PrimaryButton label="Cancel" variant="ghost" onPress={() => navigation.goBack()} />
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
  title: { marginTop: spacing.md },
  subtitle: { marginBottom: spacing.sm },
  errorCard: { padding: spacing.md },
  field: { gap: spacing.sm },
  input: {
    color: colors.text,
    fontSize: 16,
    paddingVertical: spacing.sm,
  },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  sectionLabel: { marginTop: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(45, 212, 191, 0.12)',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  switchCopy: { flex: 1, gap: 4 },
});
