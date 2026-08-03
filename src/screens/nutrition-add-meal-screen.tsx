import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import {
  Alert,
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
  MEAL_KIND_LABELS,
  MealKind,
  NutritionMode,
  ParsedMealEstimate,
  QUICK_ADD_PRESETS,
} from '../types/nutrition';

type Props = NativeStackScreenProps<RootStackParamList, 'NutritionAddMeal'>;

type Tab = 'manual' | 'quick' | 'estimate';

const KINDS: MealKind[] = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];

export function NutritionAddMealScreen({ navigation, route }: Props) {
  const { profile, services } = useVoxa();
  const nutrition = getNutritionService(services.storage);
  const dateKey = route.params?.dateKey;
  const [tab, setTab] = useState<Tab>('manual');
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [mealKind, setMealKind] = useState<MealKind>('lunch');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [nlInput, setNlInput] = useState('');
  const [estimate, setEstimate] = useState<ParsedMealEstimate | null>(null);
  const [mode, setMode] = useState<NutritionMode>('simple');
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!profile) return;
      void nutrition.getPreferences(profile.id).then((prefs) => setMode(prefs.mode));
    }, [nutrition, profile]),
  );

  const saveManual = async (opts?: {
    name: string;
    calories: number;
    mealKind: MealKind;
    isEstimate?: boolean;
    source?: 'manual' | 'quick' | 'natural_language';
    macros?: { proteinG?: number; carbsG?: number; fatG?: number };
  }) => {
    if (!profile) return;
    const mealName = (opts?.name ?? name).trim();
    const kcal = opts?.calories ?? Number(calories);
    if (!mealName || !Number.isFinite(kcal) || kcal < 0) {
      Alert.alert('Check entry', 'Add a name and a calorie amount.');
      return;
    }
    setSaving(true);
    try {
      const macros =
        mode === 'detailed'
          ? opts?.macros ?? {
              proteinG: protein ? Number(protein) : undefined,
              carbsG: carbs ? Number(carbs) : undefined,
              fatG: fat ? Number(fat) : undefined,
            }
          : opts?.macros;
      await nutrition.addMeal(profile.id, {
        name: mealName,
        calories: kcal,
        mealKind: opts?.mealKind ?? mealKind,
        isEstimate: opts?.isEstimate ?? false,
        source: opts?.source ?? 'manual',
        macros,
        date: dateKey,
      });
      navigation.goBack();
    } catch (err) {
      Alert.alert('Saved offline', err instanceof Error ? err.message : 'Will retry shortly.');
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  const runEstimate = () => {
    const parsed = nutrition.parseNaturalLanguage(nlInput);
    if (!parsed) {
      Alert.alert('Try again', 'Describe what you ate in a short phrase.');
      return;
    }
    setEstimate(parsed);
    setName(parsed.name);
    setCalories(String(parsed.calories));
    setMealKind(parsed.mealKind);
    if (parsed.macros) {
      setProtein(parsed.macros.proteinG != null ? String(parsed.macros.proteinG) : '');
      setCarbs(parsed.macros.carbsG != null ? String(parsed.macros.carbsG) : '');
      setFat(parsed.macros.fatG != null ? String(parsed.macros.fatG) : '');
    }
  };

  return (
    <ScreenShell padded={false}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <ScreenHeader
            eyebrow="Log"
            title="Add meal"
            subtitle="Manual, quick add, or a natural-language estimate you can edit."
          />

          <View style={styles.tabs}>
            {([
              ['manual', 'Manual'],
              ['quick', 'Quick'],
              ['estimate', 'Estimate'],
            ] as const).map(([id, label]) => (
              <Pressable
                key={id}
                onPress={() => setTab(id)}
                style={[styles.tab, tab === id && styles.tabOn]}>
                <VoxaText variant="caption" color={tab === id ? 'text' : 'textMuted'}>
                  {label}
                </VoxaText>
              </Pressable>
            ))}
          </View>

          {tab === 'quick' ? (
            <GlassCard style={styles.card}>
              <VoxaText variant="caption" color="textMuted">
                Approximate values — edit anytime from history.
              </VoxaText>
              {QUICK_ADD_PRESETS.map((preset) => (
                <Pressable
                  key={preset.id}
                  style={styles.quickRow}
                  onPress={() =>
                    void saveManual({
                      name: preset.name,
                      calories: preset.calories,
                      mealKind: preset.mealKind,
                      macros: preset.macros,
                      isEstimate: true,
                      source: 'quick',
                    })
                  }>
                  <View style={styles.mealCopy}>
                    <VoxaText variant="body">{preset.name}</VoxaText>
                    <VoxaText variant="caption" color="textMuted">
                      {MEAL_KIND_LABELS[preset.mealKind]} · ESTIMATE
                    </VoxaText>
                  </View>
                  <VoxaText variant="subtitle">
                    {nutrition.formatCalories(preset.calories)}
                  </VoxaText>
                </Pressable>
              ))}
            </GlassCard>
          ) : null}

          {tab === 'estimate' ? (
            <GlassCard style={styles.card}>
              <VoxaText variant="subtitle">Describe what you ate</VoxaText>
              <VoxaText variant="caption" color="textMuted">
                Returns an ESTIMATE only. Review and edit before saving — nothing is logged automatically.
              </VoxaText>
              <TextInput
                value={nlInput}
                onChangeText={setNlInput}
                placeholder="e.g. chicken rice bowl, or oatmeal 320 kcal"
                placeholderTextColor={colors.textMuted}
                multiline
                style={[styles.input, styles.multiline]}
              />
              <PrimaryButton label="Generate estimate" variant="ghost" onPress={runEstimate} />
              {estimate ? (
                <View style={styles.estimateBadge}>
                  <VoxaText variant="caption" color="primarySoft">
                    ESTIMATE · {estimate.confidence} confidence
                  </VoxaText>
                  <VoxaText variant="caption" color="textMuted">
                    Edit the fields below, then save.
                  </VoxaText>
                </View>
              ) : null}
            </GlassCard>
          ) : null}

          {(tab === 'manual' || tab === 'estimate') && (
            <GlassCard style={styles.card}>
              <Field label="Name" value={name} onChangeText={setName} placeholder="Meal name" />
              <Field
                label="Calories (kcal)"
                value={calories}
                onChangeText={setCalories}
                placeholder="0"
                keyboardType="number-pad"
              />
              <VoxaText variant="caption" color="textMuted">
                Meal type
              </VoxaText>
              <View style={styles.kindRow}>
                {KINDS.map((kind) => (
                  <Pressable
                    key={kind}
                    onPress={() => setMealKind(kind)}
                    style={[styles.kindChip, mealKind === kind && styles.kindChipOn]}>
                    <VoxaText variant="caption">{MEAL_KIND_LABELS[kind]}</VoxaText>
                  </Pressable>
                ))}
              </View>
              {mode === 'detailed' ? (
                <View style={styles.macroInputs}>
                  <Field label="Protein (g)" value={protein} onChangeText={setProtein} keyboardType="number-pad" placeholder="—" />
                  <Field label="Carbs (g)" value={carbs} onChangeText={setCarbs} keyboardType="number-pad" placeholder="—" />
                  <Field label="Fat (g)" value={fat} onChangeText={setFat} keyboardType="number-pad" placeholder="—" />
                </View>
              ) : null}
              {estimate || tab === 'estimate' ? (
                <VoxaText variant="caption" color="primarySoft">
                  Marked as ESTIMATE when saved
                </VoxaText>
              ) : null}
              <PrimaryButton
                label={saving ? 'Saving…' : 'Save meal'}
                loading={saving}
                onPress={() =>
                  void saveManual({
                    name,
                    calories: Number(calories),
                    mealKind,
                    isEstimate: Boolean(estimate) || tab === 'estimate',
                    source: estimate ? 'natural_language' : 'manual',
                  })
                }
              />
            </GlassCard>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad';
}) {
  return (
    <View style={styles.field}>
      <VoxaText variant="caption" color="textMuted">
        {label}
      </VoxaText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
        style={styles.input}
      />
    </View>
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
  tabs: { flexDirection: 'row', gap: spacing.xs },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.surface,
  },
  tabOn: {
    borderColor: colors.primarySoft,
    backgroundColor: 'rgba(45, 212, 191, 0.12)',
  },
  card: { gap: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  field: { gap: 4 },
  kindRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  kindChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  kindChipOn: {
    borderColor: colors.primarySoft,
    backgroundColor: 'rgba(45, 212, 191, 0.12)',
  },
  quickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.glassBorder,
  },
  mealCopy: { flex: 1, gap: 2 },
  estimateBadge: { gap: 4 },
  macroInputs: { gap: spacing.sm },
});
