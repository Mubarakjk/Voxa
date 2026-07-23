import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { GlassCard } from '../components/ui/glass-card';
import { PrimaryButton } from '../components/ui/buttons';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { ScreenHeader } from '../components/premium/premium-ui';
import { colors, layout, radius, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import { getNutritionService } from '../services/nutrition/nutrition-service';
import {
  DEFAULT_CALORIE_GOAL,
  MIN_CALORIE_GOAL,
  NUTRITION_DISCLAIMER,
  NutritionMode,
  clampCalorieGoal,
} from '../types/nutrition';

type Props = NativeStackScreenProps<RootStackParamList, 'NutritionOnboarding'>;

const MODES: Array<{ id: Exclude<NutritionMode, 'off'>; title: string; subtitle: string }> = [
  { id: 'simple', title: 'Simple', subtitle: 'Daily calories only — calm and light' },
  { id: 'detailed', title: 'Detailed', subtitle: 'Calories plus optional macros and water' },
];

export function NutritionOnboardingScreen({ navigation }: Props) {
  const { profile, services } = useVoxa();
  const nutrition = getNutritionService(services.storage);
  const [mode, setMode] = useState<Exclude<NutritionMode, 'off'>>('simple');
  const [goalText, setGoalText] = useState(String(DEFAULT_CALORIE_GOAL));
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = async () => {
    if (!profile) return;
    if (!accepted) {
      setError('Please acknowledge the disclaimer to continue.');
      return;
    }
    const goal = clampCalorieGoal(Number(goalText));
    if (Number(goalText) < MIN_CALORIE_GOAL) {
      setError(`Daily goal can’t be below ${MIN_CALORIE_GOAL} kcal (adult safety floor).`);
      setGoalText(String(goal));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await nutrition.enableMode(profile.id, mode, {
        calorieGoal: goal,
        trackWater: mode === 'detailed',
      });
      navigation.replace('NutritionDashboard');
    } finally {
      setSaving(false);
    }
  };

  const skip = () => {
    navigation.goBack();
  };

  return (
    <ScreenShell padded={false}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <ScreenHeader
            eyebrow="Optional"
            title="Calorie tracking"
            subtitle="Opt in only when it feels useful. You can turn it off any time."
          />

          <GlassCard style={styles.card}>
            <VoxaText variant="subtitle">How would you like to track?</VoxaText>
            <View style={styles.modeList}>
              {MODES.map((item) => {
                const selected = mode === item.id;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => setMode(item.id)}
                    style={[styles.modeRow, selected && styles.modeRowSelected]}>
                    <View style={styles.modeCopy}>
                      <VoxaText variant="subtitle">{item.title}</VoxaText>
                      <VoxaText variant="caption" color="textMuted">
                        {item.subtitle}
                      </VoxaText>
                    </View>
                    <View style={[styles.radio, selected && styles.radioOn]} />
                  </Pressable>
                );
              })}
            </View>
          </GlassCard>

          <GlassCard style={styles.card}>
            <VoxaText variant="subtitle">Daily calorie goal</VoxaText>
            <VoxaText variant="caption" color="textMuted">
              Minimum {MIN_CALORIE_GOAL.toLocaleString()} kcal — a safety floor for adults.
            </VoxaText>
            <TextInput
              value={goalText}
              onChangeText={setGoalText}
              keyboardType="number-pad"
              placeholder={String(DEFAULT_CALORIE_GOAL)}
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
          </GlassCard>

          <GlassCard style={styles.card}>
            <VoxaText variant="subtitle">Important</VoxaText>
            <VoxaText variant="caption" color="textSecondary">
              {NUTRITION_DISCLAIMER}
            </VoxaText>
            <Pressable
              onPress={() => setAccepted((v) => !v)}
              style={styles.disclaimerRow}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: accepted }}>
              <View style={[styles.checkbox, accepted && styles.checkboxOn]} />
              <VoxaText variant="caption" color="textSecondary" style={styles.disclaimerLabel}>
                I understand this is not medical advice
              </VoxaText>
            </Pressable>
          </GlassCard>

          {error ? (
            <VoxaText variant="caption" color="danger">
              {error}
            </VoxaText>
          ) : null}

          <PrimaryButton
            label={saving ? 'Saving…' : 'Enable tracking'}
            onPress={() => void finish()}
            loading={saving}
            disabled={!accepted}
          />
          <PrimaryButton label="Not now" variant="ghost" onPress={skip} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  card: { gap: spacing.sm },
  modeList: { gap: spacing.sm, marginTop: spacing.xs },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.surface,
  },
  modeRowSelected: {
    borderColor: colors.primarySoft,
    backgroundColor: 'rgba(139, 124, 246, 0.1)',
  },
  modeCopy: { flex: 1, gap: 4 },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.textMuted,
  },
  radioOn: {
    borderColor: colors.primarySoft,
    backgroundColor: colors.primarySoft,
  },
  input: {
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.textMuted,
  },
  checkboxOn: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primarySoft,
  },
  disclaimerLabel: { flex: 1 },
});
