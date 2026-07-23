import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import { colors, spacing } from '../../constants/theme';
import { VoxaText } from './voxa-text';

type BackButtonProps = {
  onPress: () => void;
  label?: string;
  compact?: boolean;
};

export function BackButton({ onPress, label = 'Back', compact }: BackButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      style={({ pressed }) => [styles.wrap, compact && styles.compact, pressed && styles.pressed]}>
      <Ionicons name="chevron-back" size={compact ? 16 : 20} color={colors.textSecondary} />
      {!compact ? (
        <VoxaText variant="caption" color="textSecondary">
          {label}
        </VoxaText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 2,
    paddingVertical: spacing.xs,
    paddingRight: spacing.sm,
  },
  pressed: { opacity: 0.7 },
  compact: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    justifyContent: 'center',
    paddingRight: 0,
  },
});
