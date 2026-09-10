import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../../constants/theme';
import {
  TODAY_QUICK_ACTIONS,
  TodayQuickActionId,
  getTodayQuickActionStarter,
} from '../../constants/today-quick-actions';
import { VoxaText } from '../ui/voxa-text';

export type { TodayQuickActionId };
export { getTodayQuickActionStarter };

const CORE_HOME_ACTIONS = TODAY_QUICK_ACTIONS.filter(
  (action) => action.id === 'brainstorm' || action.id === 'explain' || action.id === 'plan_day',
);

type Props = {
  onAction: (starter: string, id: TodayQuickActionId) => void;
};

export function TodayQuickActions({ onAction }: Props) {
  return (
    <View style={styles.wrap} accessibilityRole="summary" accessibilityLabel="Quick actions">
      <VoxaText variant="label" color="textMuted">
        Quick actions
      </VoxaText>
      <View style={styles.row}>
        {CORE_HOME_ACTIONS.map((action) => (
          <Pressable
            key={action.id}
            onPress={() => onAction(action.starter, action.id)}
            style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
            accessibilityRole="button"
            accessibilityLabel={action.label}>
            <Ionicons name={action.icon} size={15} color={colors.primarySoft} />
            <VoxaText variant="caption" color="textSecondary" numberOfLines={1}>
              {action.label}
            </VoxaText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 40,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceQuiet,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
  },
  chipPressed: { opacity: 0.85, backgroundColor: colors.surface },
});
