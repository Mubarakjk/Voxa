import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { colors, layout, radius, spacing } from '../../constants/theme';
import {
  TODAY_QUICK_ACTIONS,
  TodayQuickActionId,
  getTodayQuickActionStarter,
} from '../../constants/today-quick-actions';
import { VoxaText } from '../ui/voxa-text';

export type { TodayQuickActionId };
export { getTodayQuickActionStarter };

const VISIBLE_ACTIONS = TODAY_QUICK_ACTIONS.slice(0, 4);

type Props = {
  onAction: (starter: string, id: TodayQuickActionId) => void;
};

export function TodayQuickActions({ onAction }: Props) {
  return (
    <View style={styles.wrap} accessibilityRole="summary" accessibilityLabel="Quick actions">
      <VoxaText variant="label" color="textMuted">
        Quick actions
      </VoxaText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {VISIBLE_ACTIONS.map((action) => (
          <Pressable
            key={action.id}
            onPress={() => onAction(action.starter, action.id)}
            style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
            accessibilityRole="button"
            accessibilityLabel={action.label}>
            <Ionicons name={action.icon} size={16} color={colors.primarySoft} />
            <VoxaText variant="caption" color="textSecondary">
              {action.label}
            </VoxaText>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  row: { gap: spacing.sm, paddingVertical: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 40,
    paddingHorizontal: spacing.md12,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceQuiet,
  },
  chipPressed: { opacity: 0.85, backgroundColor: colors.surface },
});
