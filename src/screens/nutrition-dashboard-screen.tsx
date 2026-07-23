import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { GlassCard } from '../components/ui/glass-card';
import { PrimaryButton } from '../components/ui/buttons';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { LoadingState } from '../components/ui/screen-state';
import { ScreenHeader } from '../components/premium/premium-ui';
import { colors, layout, radius, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import { getNutritionService, localDateKey } from '../services/nutrition/nutrition-service';
import {
  DailyNutritionLog,
  MEAL_KIND_LABELS,
  NutritionPreferences,
  NutritionTodaySummary,
  WeeklyConsistency,
} from '../types/nutrition';

type Props = NativeStackScreenProps<RootStackParamList, 'NutritionDashboard'>;

export function NutritionDashboardScreen({ navigation }: Props) {
  const { profile, services } = useVoxa();
  const nutrition = getNutritionService(services.storage);
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState<NutritionPreferences | null>(null);
  const [summary, setSummary] = useState<NutritionTodaySummary | null>(null);
  const [log, setLog] = useState<DailyNutritionLog | null>(null);
  const [weekly, setWeekly] = useState<WeeklyConsistency | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const preferences = await nutrition.getPreferences(profile.id);
      if (preferences.mode === 'off') {
        navigation.replace(
          preferences.onboardingCompleted ? 'NutritionSettings' : 'NutritionOnboarding',
        );
        return;
      }
      const [today, daily, consistency] = await Promise.all([
        nutrition.getTodaySummary(profile.id),
        nutrition.getOrCreateDailyLog(profile.id, localDateKey()),
        nutrition.getWeeklyConsistency(profile.id, 7),
      ]);
      setPrefs(preferences);
      setSummary(today);
      setLog(daily);
      setWeekly(consistency);
    } finally {
      setLoading(false);
    }
  }, [navigation, nutrition, profile]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (loading || !summary || !prefs) {
    return (
      <ScreenShell>
        <LoadingState label="Loading nutrition…" />
      </ScreenShell>
    );
  }

  const progress = Math.min(1, summary.calorieGoal > 0 ? summary.caloriesLogged / summary.calorieGoal : 0);
  const remaining = Math.max(0, summary.calorieGoal - summary.caloriesLogged);

  return (
    <ScreenShell padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenHeader
          eyebrow="Today"
          title="Nutrition"
          subtitle={`${nutrition.formatCalories(summary.caloriesLogged)} of ${nutrition.formatCalories(summary.calorieGoal)} kcal logged`}
          right={
            <Pressable onPress={() => navigation.navigate('NutritionSettings')} hitSlop={8}>
              <VoxaText variant="caption" color="primarySoft">
                Settings
              </VoxaText>
            </Pressable>
          }
        />

        <GlassCard style={styles.progressCard}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
          <VoxaText variant="caption" color="textMuted">
            {remaining > 0
              ? `${nutrition.formatCalories(remaining)} kcal remaining toward your goal`
              : 'Daily goal reached'}
          </VoxaText>
          {weekly ? (
            <VoxaText variant="caption" color="textSecondary">
              This week: logged on {weekly.daysLogged} of {weekly.daysInWindow} days
              {weekly.averageCalories > 0
                ? ` · avg ${nutrition.formatCalories(weekly.averageCalories)} kcal`
                : ''}
            </VoxaText>
          ) : null}
        </GlassCard>

        {prefs.mode === 'detailed' ? (
          <GlassCard style={styles.macrosCard}>
            <VoxaText variant="subtitle">Macros so far</VoxaText>
            <View style={styles.macroRow}>
              <MacroChip label="Protein" value={`${Math.round(summary.macros.proteinG)}g`} />
              <MacroChip label="Carbs" value={`${Math.round(summary.macros.carbsG)}g`} />
              <MacroChip label="Fat" value={`${Math.round(summary.macros.fatG)}g`} />
            </View>
            {prefs.trackWater ? (
              <View style={styles.waterRow}>
                <VoxaText variant="caption" color="textMuted">
                  Water · {summary.waterMl ?? 0}
                  {summary.waterGoalMl ? ` / ${summary.waterGoalMl}` : ''} ml
                </VoxaText>
                <View style={styles.waterBtns}>
                  <PrimaryButton
                    label="+250 ml"
                    variant="ghost"
                    onPress={() => {
                      if (!profile) return;
                      void nutrition
                        .setWater(profile.id, (summary.waterMl ?? 0) + 250)
                        .then(() => load());
                    }}
                  />
                </View>
              </View>
            ) : null}
          </GlassCard>
        ) : null}

        <PrimaryButton
          label="Add meal"
          icon="add"
          onPress={() => navigation.navigate('NutritionAddMeal')}
        />
        <PrimaryButton
          label="History"
          variant="ghost"
          onPress={() => navigation.navigate('NutritionHistory')}
        />

        <GlassCard style={styles.mealsCard}>
          <VoxaText variant="subtitle">Today’s meals</VoxaText>
          {!log?.meals.length ? (
            <VoxaText variant="caption" color="textMuted">
              Nothing logged yet — add a meal when you’re ready.
            </VoxaText>
          ) : (
            log.meals.map((meal) => (
              <View key={meal.id} style={styles.mealRow}>
                <View style={styles.mealCopy}>
                  <VoxaText variant="body">{meal.name}</VoxaText>
                  <VoxaText variant="caption" color="textMuted">
                    {MEAL_KIND_LABELS[meal.mealKind]}
                    {meal.isEstimate ? ' · ESTIMATE' : ''}
                  </VoxaText>
                </View>
                <VoxaText variant="subtitle">{nutrition.formatCalories(meal.calories)}</VoxaText>
              </View>
            ))
          )}
        </GlassCard>
      </ScrollView>
    </ScreenShell>
  );
}

function MacroChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.macroChip}>
      <VoxaText variant="caption" color="textMuted">
        {label}
      </VoxaText>
      <VoxaText variant="subtitle">{value}</VoxaText>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  progressCard: { gap: spacing.sm },
  progressTrack: {
    height: 10,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
  },
  macrosCard: { gap: spacing.sm },
  macroRow: { flexDirection: 'row', gap: spacing.sm },
  macroChip: {
    flex: 1,
    gap: 4,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  waterRow: { gap: spacing.xs, marginTop: spacing.xs },
  waterBtns: { alignSelf: 'flex-start' },
  mealsCard: { gap: spacing.sm },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.glassBorder,
  },
  mealCopy: { flex: 1, gap: 2 },
});
