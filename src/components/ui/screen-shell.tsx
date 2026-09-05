import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, layout, spacing } from '../../constants/theme';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  /**
   * When false, omit bottom safe-area padding (use for tab scenes or screens
   * that manage their own footer inset). Top inset is always applied.
   */
  safeBottom?: boolean;
  /** Ambient glow accent. `purple` kept as alias for primary teal brand glow. */
  glow?: 'primary' | 'purple' | 'blue' | 'safe' | 'none';
  style?: ViewStyle;
};

export function ScreenShell({
  children,
  scroll,
  padded = true,
  safeBottom = true,
  glow = 'primary',
  style,
}: Props) {
  const insets = useSafeAreaInsets();
  const glowColor =
    glow === 'blue'
      ? colors.blueGlow
      : glow === 'safe'
        ? colors.safeGlow
        : glow === 'none'
          ? 'transparent'
          : colors.glow;

  const content = (
    <View
      style={[
        styles.content,
        padded && { paddingHorizontal: layout.screenPadding },
        {
          paddingTop: insets.top + spacing.md12,
          paddingBottom: safeBottom ? insets.bottom + spacing.md : 0,
        },
        style,
      ]}>
      {children}
    </View>
  );

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#12202A', colors.background, colors.backgroundDeep]} style={StyleSheet.absoluteFill} />
      {glow !== 'none' && (
        <View pointerEvents="none" style={[styles.glowOrb, { backgroundColor: glowColor }]} />
      )}
      {scroll ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  glowOrb: {
    position: 'absolute',
    top: -80,
    alignSelf: 'center',
    width: 280,
    height: 280,
    borderRadius: 140,
    opacity: 0.22,
  },
  scroll: { flexGrow: 1 },
  content: { flex: 1 },
});
