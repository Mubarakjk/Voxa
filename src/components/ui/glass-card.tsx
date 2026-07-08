import { ReactNode } from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';

import { colors, radius, spacing } from '../../constants/theme';

type Props = {
  children: ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  variant?: 'default' | 'highlight' | 'safe' | 'elevated';
};

export function GlassCard({ children, style, onPress, variant = 'default' }: Props) {
  const bg =
    variant === 'highlight' || variant === 'elevated'
      ? colors.surfaceStrong
      : variant === 'safe'
        ? colors.safeGlow
        : colors.surface;

  const borderColor = variant === 'safe' ? 'rgba(52, 211, 153, 0.25)' : colors.glassBorder;
  const cardStyle: ViewStyle[] = [styles.card, { backgroundColor: bg, borderColor }];
  if (variant === 'elevated') cardStyle.push(styles.elevated);

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [cardStyle, style, pressed && styles.pressed]}>
        {children}
      </Pressable>
    );
  }

  return <View style={[cardStyle, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  elevated: {
    padding: spacing.xl,
    borderColor: 'rgba(139, 124, 246, 0.18)',
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
});
