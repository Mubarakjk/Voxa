import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { colors, radius, spacing } from '../../constants/theme';
import { SmartChatAction } from '../../types/phase4-intelligence';
import { VoxaText } from '../ui/voxa-text';

type SmartActionsRowProps = {
  actions: SmartChatAction[];
  onSelect: (action: SmartChatAction) => void;
  disabled?: boolean;
};

export function SmartActionsRow({ actions, onSelect, disabled }: SmartActionsRowProps) {
  if (actions.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.wrap}>
      {actions.map((action) => (
        <Pressable
          key={action.id}
          disabled={disabled}
          onPress={() => onSelect(action)}
          style={[styles.chip, disabled && styles.disabled]}>
          <VoxaText variant="caption" color="primarySoft">
            {action.label}
          </VoxaText>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { maxHeight: 44 },
  row: { gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: `${colors.primary}22`,
    borderWidth: 1,
    borderColor: `${colors.primarySoft}44`,
  },
  disabled: { opacity: 0.5 },
});
