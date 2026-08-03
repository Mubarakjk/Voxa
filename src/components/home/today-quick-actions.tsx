import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, layout, radius, spacing } from '../../constants/theme';
import {
  TODAY_QUICK_ACTIONS,
  TodayQuickActionId,
  getTodayQuickActionStarter,
} from '../../constants/today-quick-actions';
import { VoxaText } from '../ui/voxa-text';

export type { TodayQuickActionId };
export { getTodayQuickActionStarter };

type Props = {
  onAction: (starter: string, id: TodayQuickActionId) => void;
};

export function TodayQuickActions({ onAction }: Props) {
  return (
    <View style={styles.wrap} accessibilityRole="summary" accessibilityLabel="Smart quick actions">
      <VoxaText variant="caption" color="textMuted" style={styles.title}>
        Quick actions
      </VoxaText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {TODAY_QUICK_ACTIONS.map((action) => (
          <Pressable
            key={action.id}
            onPress={() => onAction(action.starter, action.id)}
            style={styles.chip}
            accessibilityRole="button"
            accessibilityLabel={action.label}>
            <Ionicons name={action.icon} size={16} color={colors.primarySoft} />
            <VoxaText variant="caption">{action.label}</VoxaText>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  title: { paddingHorizontal: 2 },
  row: { gap: spacing.sm, paddingVertical: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: layout.minTapTarget,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.surfaceStrong,
  },
});
