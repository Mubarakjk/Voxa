import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { LiveCompanionOrb } from '../live-companion/live-companion-orb';
import { colors, spacing } from '../../constants/theme';
import { VoxaText } from '../ui/voxa-text';

type GoodnightViewProps = {
  message: string;
  voxaTint: string;
};

export function GoodnightView({ message, voxaTint }: GoodnightViewProps) {
  const fade = useRef(new Animated.Value(0)).current;
  const orbFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fade, { toValue: 1, duration: 1200, useNativeDriver: true }),
      Animated.delay(800),
      Animated.timing(orbFade, { toValue: 0.25, duration: 2000, useNativeDriver: true }),
    ]).start();
  }, [fade, orbFade]);

  return (
    <View style={styles.wrap}>
      <Animated.View style={{ opacity: orbFade }}>
        <LiveCompanionOrb size={160} tint={voxaTint} state="sleeping" mood="calm" active />
      </Animated.View>
      <Animated.View style={[styles.copy, { opacity: fade }]}>
        <VoxaText variant="title" style={styles.message}>
          {message}
        </VoxaText>
        <VoxaText variant="caption" color="textMuted" style={styles.sub}>
          Sleep well. I'll be here tomorrow.
        </VoxaText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    backgroundColor: colors.backgroundDeep,
    paddingHorizontal: spacing.xl,
  },
  copy: { alignItems: 'center', gap: spacing.md },
  message: { textAlign: 'center', lineHeight: 34 },
  sub: { textAlign: 'center' },
});
