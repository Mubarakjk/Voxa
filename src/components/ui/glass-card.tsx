import { ReactNode } from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';

import { colors, radius, spacing } from '../../constants/theme';

type Props = {
  children: ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  variant?: 'default' | 'highlight' | 'safe';
};

export function GlassCard({ children, style, onPress, variant = 'default' }: Props) {
  const bg =
    variant === 'highlight'
      ? colors.surfaceStrong
      : variant === 'safe'
        ? colors.safeGlow
        : colors.surface;

  const borderColor = variant === 'safe' ? 'rgba(52, 211, 153, 0.25)' : colors.glassBorder;
  const cardStyle: ViewStyle[] = [styles.card, { backgroundColor: bg, borderColor }];

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
    padding: spacing.md,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
});
