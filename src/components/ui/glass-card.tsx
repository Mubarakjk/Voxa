import { ReactNode } from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';

import { colors, radius, spacing } from '../../constants/theme';

type Props = {
  children: ReactNode;
  style?: ViewStyle | ViewStyle[];
  onPress?: () => void;
  variant?: 'default' | 'highlight' | 'safe' | 'elevated' | 'flat' | 'quiet';
};

export function GlassCard({ children, style, onPress, variant = 'default' }: Props) {
  const bg =
    variant === 'flat' || variant === 'quiet'
      ? 'transparent'
      : variant === 'highlight' || variant === 'elevated'
        ? colors.surfaceStrong
        : variant === 'safe'
          ? colors.safeGlow
          : colors.surface;

  const borderWidth = variant === 'flat' || variant === 'quiet' ? 0 : 1;
  const borderColor =
    variant === 'safe'
      ? 'rgba(52, 211, 153, 0.25)'
      : variant === 'elevated'
        ? 'rgba(45, 212, 191, 0.14)'
        : variant === 'flat' || variant === 'quiet'
          ? 'transparent'
          : colors.borderSubtle;

  const overflowStyle =
    variant === 'flat' || variant === 'quiet' ? ('visible' as const) : ('hidden' as const);

  const cardStyle = [
    styles.card,
    {
      backgroundColor: bg,
      borderColor,
      borderWidth,
      overflow: overflowStyle,
      // Only override padding for flat/quiet. Never set `padding: undefined` —
      // Object.assign-style merges wipe styles.card.padding and leave content flush to borders.
      ...(variant === 'flat' || variant === 'quiet' ? { padding: 0 } : null),
    },
    style,
  ];
  if (variant === 'elevated') cardStyle.push(styles.elevated);

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [cardStyle, pressed && styles.pressed]}>
        {children}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
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
    borderColor: 'rgba(45, 212, 191, 0.18)',
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
});
