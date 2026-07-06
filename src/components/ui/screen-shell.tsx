import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../constants/theme';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  glow?: 'purple' | 'blue' | 'safe' | 'none';
  style?: ViewStyle;
};

export function ScreenShell({ children, scroll, padded = true, glow = 'purple', style }: Props) {
  const insets = useSafeAreaInsets();
  const glowColor =
    glow === 'blue' ? colors.blueGlow : glow === 'safe' ? colors.safeGlow : glow === 'none' ? 'transparent' : colors.glow;

  const content = (
    <View
      style={[
        styles.content,
        padded && { paddingHorizontal: 20 },
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 },
        style,
      ]}>
      {children}
    </View>
  );

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0E0E18', colors.background, colors.backgroundDeep]} style={StyleSheet.absoluteFill} />
      {glow !== 'none' && <View style={[styles.glowOrb, { backgroundColor: glowColor }]} />}
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
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.5,
  },
  scroll: { flexGrow: 1 },
  content: { flex: 1 },
});
