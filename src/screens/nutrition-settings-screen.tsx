import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { GlassCard } from '../components/ui/glass-card';
import { PrimaryButton } from '../components/ui/buttons';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { LoadingState } from '../components/ui/screen-state';
import { ScreenHeader } from '../components/premium/premium-ui';
import { colors, layout, radius, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import { getNutritionService } from '../services/nutrition/nutrition-service';
import {
  MIN_CALORIE_GOAL,
  NUTRITION_DISCLAIMER,
  NUTRITION_MODE_LABELS,
  NutritionMode,
  NutritionPreferences,
  clampCalorieGoal,
} from '../types/nutrition';

type Props = NativeStackScreenProps<RootStackParamList, 'NutritionSettings'>;

const MODES: NutritionMode[] = ['off', 'simple', 'detailed'];

export function NutritionSettingsScreen({ navigation }: Props) {
  const { profile, services } = useVoxa();
  const nutrition = getNutritionService(services.storage);
  const [prefs, setPrefs] = useState<NutritionPreferences | null>(null);
  const [goalText, setGoalText] = useState('');
  const [proteinText, setProteinText] = useState('');
  const [carbsText, setCarbsText] = useState('');
  const [fatText, setFatText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const next = await nutrition.getPreferences(profile.id);
      setPrefs(next);
      setGoalText(String(next.calorieGoal));
      setProteinText(next.proteinGoalG != null ? String(next.proteinGoalG) : '');
      setCarbsText(next.carbsGoalG != null ? String(next.carbsGoalG) : '');
      setFatText(next.fatGoalG != null ? String(next.fatGoalG) : '');
    } finally {
      setLoading(false);
    }
  }, [nutrition, profile]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const setMode = async (mode: NutritionMode) => {
    if (!profile || !prefs) return;
    if (mode !== 'off' && !prefs.onboardingCompleted) {
      navigation.navigate('NutritionOnboarding');
      return;
    }
    const next = await nutrition.setPreferences(profile.id, { mode });
    setPrefs(next);
  };

  const saveGoals = async () => {
    if (!profile) return;
    const goal = clampCalorieGoal(Number(goalText));
    if (Number(goalText) < MIN_CALORIE_GOAL) {
      Alert.alert(
        'Goal too low',
        `Daily calorie goals can’t be below ${MIN_CALORIE_GOAL} kcal (adult safety floor).`,
      );
      setGoalText(String(goal));
      return;
    }
    setSaving(true);
    try {
      const next = await nutrition.setPreferences(profile.id, {
        calorieGoal: goal,
        proteinGoalG: proteinText ? Number(proteinText) : undefined,
        carbsGoalG: carbsText ? Number(carbsText) : undefined,
        fatGoalG: fatText ? Number(fatText) : undefined,
      });
      setPrefs(next);
      setGoalText(String(next.calorieGoal));
      Alert.alert('Saved', 'Your nutrition goals were updated.');
    } finally {
      setSaving(false);
    }
  };

  const toggleWater = async () => {
    if (!profile || !prefs) return;
    const next = await nutrition.setPreferences(profile.id, { trackWater: !prefs.trackWater });
    setPrefs(next);
  };

  const exportData = async () => {
    if (!profile) return;
    const payload = await nutrition.exportAll(profile.id);
    await Share.share({
      message: JSON.stringify(payload, null, 2),
      title: 'Voxa nutrition export',
    });
  };

  const deleteAll = () => {
    if (!profile) return;
    Alert.alert(
      'Delete nutrition data',
      'This removes your calorie logs, preferences, and offline queue for this feature. It cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete all',
          style: 'destructive',
          onPress: () => {
            void nutrition.deleteAll(profile.id).then(() => {
              Alert.alert('Deleted', 'Nutrition data cleared.');
              navigation.goBack();
            });
          },
        },
      ],
    );
  };

  if (loading || !prefs) {
    return (
      <ScreenShell>
        <LoadingState label="Loading settings…" />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell padded={false}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <ScreenHeader showBack
            eyebrow="Preferences"
            title="Calorie tracking"
            subtitle="Opt-in only. Change mode, goals, or remove your data."
          />

          <GlassCard style={styles.card}>
            <VoxaText variant="subtitle">Mode</VoxaText>
            <View style={styles.modeRow}>
              {MODES.map((mode) => (
                <Pressable
                  key={mode}
                  onPress={() => void setMode(mode)}
                  style={[styles.modeChip, prefs.mode === mode && styles.modeChipOn]}>
                  <VoxaText variant="caption">{NUTRITION_MODE_LABELS[mode]}</VoxaText>
                </Pressable>
              ))}
            </View>
            {!prefs.onboardingCompleted ? (
              <PrimaryButton
                label="Set up tracking"
                variant="ghost"
                onPress={() => navigation.navigate('NutritionOnboarding')}
              />
            ) : prefs.mode !== 'off' ? (
              <PrimaryButton
                label="Open dashboard"
                variant="ghost"
                onPress={() => navigation.navigate('NutritionDashboard')}
              />
            ) : null}
          </GlassCard>

          <GlassCard style={styles.card}>
            <VoxaText variant="subtitle">Daily calorie goal</VoxaText>
            <VoxaText variant="caption" color="textMuted">
              Floor: {MIN_CALORIE_GOAL.toLocaleString()} kcal
            </VoxaText>
            <TextInput
              value={goalText}
              onChangeText={setGoalText}
              keyboardType="number-pad"
              style={styles.input}
            />
            {prefs.mode === 'detailed' ? (
              <>
                <TextInput
                  value={proteinText}
                  onChangeText={setProteinText}
                  placeholder="Protein goal (g)"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  style={styles.input}
                />
                <TextInput
                  value={carbsText}
                  onChangeText={setCarbsText}
                  placeholder="Carbs goal (g)"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  style={styles.input}
                />
                <TextInput
                  value={fatText}
                  onChangeText={setFatText}
                  placeholder="Fat goal (g)"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  style={styles.input}
                />
                <Pressable onPress={() => void toggleWater()} style={styles.toggleRow}>
                  <VoxaText variant="body">Track water</VoxaText>
                  <VoxaText variant="caption" color="primarySoft">
                    {prefs.trackWater ? 'On' : 'Off'}
                  </VoxaText>
                </Pressable>
              </>
            ) : null}
            <PrimaryButton
              label={saving ? 'Saving…' : 'Save goals'}
              loading={saving}
              onPress={() => void saveGoals()}
            />
          </GlassCard>

          <GlassCard style={styles.card}>
            <VoxaText variant="subtitle">Data</VoxaText>
            <PrimaryButton label="Export nutrition JSON" variant="ghost" onPress={() => void exportData()} />
            <PrimaryButton label="Delete all nutrition data" variant="ghost" onPress={deleteAll} />
          </GlassCard>

          <GlassCard style={styles.card}>
            <VoxaText variant="subtitle">Disclaimer</VoxaText>
            <VoxaText variant="caption" color="textSecondary">
              {NUTRITION_DISCLAIMER}
            </VoxaText>
          </GlassCard>
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
  modeRow: { flexDirection: 'row', gap: spacing.xs },
  modeChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.surface,
  },
  modeChipOn: {
    borderColor: colors.primarySoft,
    backgroundColor: 'rgba(45, 212, 191, 0.12)',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
});
