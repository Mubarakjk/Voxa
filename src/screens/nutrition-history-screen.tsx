import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { EmptyState, ScreenHeader } from '../components/premium/premium-ui';
import { LoadingState } from '../components/ui/screen-state';
import { colors, layout, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import { getNutritionService } from '../services/nutrition/nutrition-service';
import { DailyNutritionLog, MEAL_KIND_LABELS } from '../types/nutrition';

type Props = NativeStackScreenProps<RootStackParamList, 'NutritionHistory'>;

export function NutritionHistoryScreen({ navigation }: Props) {
  const { profile, services } = useVoxa();
  const nutrition = getNutritionService(services.storage);
  const [logs, setLogs] = useState<DailyNutritionLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      setLogs(await nutrition.listLogs(profile.id, 60));
    } finally {
      setLoading(false);
    }
  }, [nutrition, profile]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const removeMeal = (mealId: string, mealName: string) => {
    if (!profile) return;
    Alert.alert('Remove meal', `Remove “${mealName}” from your log?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          void nutrition.deleteMeal(profile.id, mealId).then(() => load());
        },
      },
    ]);
  };

  if (loading) {
    return (
      <ScreenShell>
        <LoadingState label="Loading history…" />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenHeader showBack
          eyebrow="Past days"
          title="Nutrition history"
          subtitle="Days you’ve logged — tap a meal to remove it."
          right={
            <Pressable onPress={() => navigation.navigate('NutritionDashboard')} hitSlop={8}>
              <VoxaText variant="caption" color="primarySoft">
                Today
              </VoxaText>
            </Pressable>
          }
        />

        {!logs.some((log) => log.meals.length > 0) ? (
          <EmptyState
            icon="restaurant-outline"
            title="No meals yet"
            message="When you log meals, they’ll show up here by day."
          />
        ) : (
          logs
            .filter((log) => log.meals.length > 0)
            .map((log) => {
              const total = log.meals.reduce((sum, m) => sum + m.calories, 0);
              return (
                <GlassCard key={log.date} style={styles.card}>
                  <View style={styles.dayHeader}>
                    <VoxaText variant="subtitle">{formatDayLabel(log.date)}</VoxaText>
                    <VoxaText variant="caption" color="textMuted">
                      {nutrition.formatCalories(total)} / {nutrition.formatCalories(log.calorieGoal)} kcal
                    </VoxaText>
                  </View>
                  {log.meals.map((meal) => (
                    <Pressable
                      key={meal.id}
                      onLongPress={() => removeMeal(meal.id, meal.name)}
                      style={styles.mealRow}>
                      <View style={styles.mealCopy}>
                        <VoxaText variant="body">{meal.name}</VoxaText>
                        <VoxaText variant="caption" color="textMuted">
                          {MEAL_KIND_LABELS[meal.mealKind]}
                          {meal.isEstimate ? ' · ESTIMATE' : ''}
                        </VoxaText>
                      </View>
                      <VoxaText variant="subtitle">
                        {nutrition.formatCalories(meal.calories)}
                      </VoxaText>
                    </Pressable>
                  ))}
                </GlassCard>
              );
            })
        )}
      </ScrollView>
    </ScreenShell>
  );
}

function formatDayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y!, (m ?? 1) - 1, d ?? 1);
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  card: { gap: spacing.xs },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
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
