import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, ViewStyle } from 'react-native';

import { colors, shadows } from '../../constants/theme';
import { useReduceMotion } from '../../hooks/use-reduce-motion';

export type VoxaOrbSize = 'hero' | 'large' | 'medium' | 'small';

const SIZE_MAP: Record<VoxaOrbSize, number> = {
  hero: 220,
  large: 160,
  medium: 96,
  small: 48,
};

type VoxaOrbProps = {
  size?: number | VoxaOrbSize;
  tint?: string;
  active?: boolean;
  style?: ViewStyle;
};

function resolveSize(size: number | VoxaOrbSize): number {
  if (typeof size === 'number') return size;
  return SIZE_MAP[size];
}

function tintToGradient(tint: string): [string, string, string] {
  return [`${tint}EE`, `${tint}AA`, `${tint}55`];
}

export function VoxaOrb({ size = 'medium', tint = colors.primary, active = true, style }: VoxaOrbProps) {
  const reduceMotion = useReduceMotion();
  const px = resolveSize(size);
  const breathe = useRef(new Animated.Value(1)).current;
  const halo = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    if (!active || reduceMotion) {
      breathe.setValue(1);
      halo.setValue(0.45);
      return;
    }

    const breatheAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1.04,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 1,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    const haloAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(halo, {
          toValue: 0.65,
          duration: 2800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(halo, {
          toValue: 0.3,
          duration: 2800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    breatheAnim.start();
    haloAnim.start();
    return () => {
      breatheAnim.stop();
      haloAnim.stop();
    };
  }, [active, breathe, halo, reduceMotion]);

  const inner = px * 0.68;
  const haloSize = px * 1.35;
  const gradient = tintToGradient(tint);

  return (
    <View style={[styles.wrap, { width: px, height: px }, style]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.halo,
          {
            width: haloSize,
            height: haloSize,
            borderRadius: haloSize / 2,
            backgroundColor: `${tint}33`,
            opacity: halo,
            transform: [{ scale: breathe }],
          },
        ]}
      />
      <Animated.View style={{ transform: [{ scale: breathe }] }}>
        <LinearGradient
          colors={gradient}
          start={{ x: 0.2, y: 0.1 }}
          end={{ x: 0.85, y: 0.95 }}
          style={[
            styles.orb,
            {
              width: inner,
              height: inner,
              borderRadius: inner / 2,
              shadowColor: tint,
            },
            shadows.glow,
          ]}>
          <View style={styles.highlight} />
          <View style={styles.core} />
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

export function VoxaOrbHero(props: Omit<VoxaOrbProps, 'size'>) {
  return <VoxaOrb {...props} size="hero" />;
}

export function VoxaOrbLarge(props: Omit<VoxaOrbProps, 'size'>) {
  return <VoxaOrb {...props} size="large" />;
}

export function VoxaOrbMedium(props: Omit<VoxaOrbProps, 'size'>) {
  return <VoxaOrb {...props} size="medium" />;
}

export function VoxaOrbSmall(props: Omit<VoxaOrbProps, 'size'>) {
  return <VoxaOrb {...props} size="small" />;
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute' },
  orb: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  highlight: {
    position: 'absolute',
    top: '12%',
    left: '18%',
    width: '38%',
    height: '28%',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  core: {
    width: '28%',
    height: '28%',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
});
