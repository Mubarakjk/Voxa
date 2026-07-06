import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { colors } from '../../constants/theme';

type Props = {
  size?: number;
  active?: boolean;
  tint?: string;
};

export function VoiceOrb({ size = 180, active = true, tint = colors.primary }: Props) {
  const pulse = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0.4)).current;
  const ring = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return;

    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.07, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );

    const glowAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 0.85, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.35, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );

    const ringAnim = Animated.loop(
      Animated.timing(ring, { toValue: 1, duration: 2800, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    );

    pulseAnim.start();
    glowAnim.start();
    ringAnim.start();

    return () => {
      pulseAnim.stop();
      glowAnim.stop();
      ringAnim.stop();
    };
  }, [active, pulse, glow, ring]);

  const inner = size * 0.72;
  const glowSize = size * 1.45;

  const orbStyle = { transform: [{ scale: pulse }] };
  const glowStyle = {
    opacity: glow,
    transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] }) }],
  };
  const ringStyle = {
    opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
    transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] }) }],
  };

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Animated.View
        style={[
          styles.glow,
          { width: glowSize, height: glowSize, borderRadius: glowSize / 2, backgroundColor: `${tint}55` },
          glowStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.ring,
          { width: size, height: size, borderRadius: size / 2, borderColor: tint },
          ringStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.orb,
          { width: inner, height: inner, borderRadius: inner / 2, backgroundColor: tint, shadowColor: tint },
          orbStyle,
        ]}>
        <View style={styles.core} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute' },
  ring: { position: 'absolute', borderWidth: 1 },
  orb: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.75,
    shadowRadius: 28,
    elevation: 12,
  },
  core: {
    width: '36%',
    height: '36%',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
});
