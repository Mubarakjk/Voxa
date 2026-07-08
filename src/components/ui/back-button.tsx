import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import { colors, spacing } from '../../constants/theme';
import { VoxaText } from './voxa-text';

type BackButtonProps = {
  onPress: () => void;
  label?: string;
};

export function BackButton({ onPress, label = 'Back' }: BackButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}>
      <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
      <VoxaText variant="caption" color="textSecondary">
        {label}
      </VoxaText>
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
});
