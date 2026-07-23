import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';

import { ScreenShell } from '../ui/screen-shell';
import { colors, layout, spacing } from '../../constants/theme';

type Props = {
  children: ReactNode;
  style?: ViewStyle;
  noPadding?: boolean;
};

/** Premium screen wrapper with consistent spacing and background. */
export function PremiumScreen({ children, style, noPadding }: Props) {
  return (
    <ScreenShell padded={false}>
      <ScrollView
        contentContainerStyle={[styles.scroll, noPadding && styles.noPad, style]}
        showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </ScreenShell>
  );
}

export const premiumTokens = {
  tapTargetMin: 44,
  animationDuration: 220,
  surfaceLevels: {
    base: colors.background,
    card: colors.surface,
    elevated: colors.surfaceStrong,
  },
  borderOpacity: 0.14,
  accentPrimary: colors.blue,
  accentSecondary: colors.primarySoft,
} as const;

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: layout.tabBarHeight + spacing.xxl,
    gap: spacing.lg,
  },
  noPad: { paddingHorizontal: 0 },
});
