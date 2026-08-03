import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing } from '../../constants/theme';
import { useVoxa } from '../../context/voxa-context';
import { getNutritionService } from '../../services/nutrition/nutrition-service';
import { NutritionTodaySummary } from '../../types/nutrition';
import { VoxaText } from '../ui/voxa-text';

type Props = {
  onPress: () => void;
};

/**
 * Compact home summary — only render when parent confirms mode !== off,
 * or this component returns null while loading / disabled.
 */
export function NutritionHomeSummary({ onPress }: Props) {
  const { profile, services } = useVoxa();
  const nutrition = useMemo(() => getNutritionService(services.storage), [services.storage]);
  const [summary, setSummary] = useState<NutritionTodaySummary | null>(null);

  const load = useCallback(async () => {
    if (!profile) {
      setSummary(null);
      return;
    }
    const prefs = await nutrition.getPreferences(profile.id);
    if (prefs.mode === 'off') {
      setSummary(null);
      return;
    }
    setSummary(await nutrition.getTodaySummary(profile.id));
  }, [nutrition, profile]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!summary || summary.mode === 'off') return null;

  const label = `${nutrition.formatCalories(summary.caloriesLogged)} of ${nutrition.formatCalories(summary.calorieGoal)} kcal logged`;

  return (
    <Pressable style={styles.card} onPress={onPress} accessibilityRole="button">
      <View style={styles.iconWrap}>
        <Ionicons name="nutrition-outline" size={18} color={colors.primarySoft} />
      </View>
      <View style={styles.copy}>
        <VoxaText variant="caption" color="textMuted">
          Nutrition
        </VoxaText>
        <VoxaText variant="subtitle">{label}</VoxaText>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(45, 212, 191, 0.12)',
  },
  copy: { flex: 1, gap: 2 },
});
