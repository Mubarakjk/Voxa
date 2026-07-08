import { memo, useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { colors } from '../../constants/theme';

export type CompanionOrbMood = 'calm' | 'happy' | 'excited' | 'sleepy' | 'focused' | 'celebrating';
export type CompanionOrbState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'sleeping'
  | 'celebrating';

type Props = {
  size?: number;
  tint?: string;
  mood?: CompanionOrbMood;
  state?: CompanionOrbState;
  intensity?: number;
  active?: boolean;
};

const MOOD_GLOW: Record<CompanionOrbMood, string> = {
  calm: '0.35',
  happy: '0.55',
  excited: '0.75',
  sleepy: '0.2',
  focused: '0.45',
  celebrating: '0.85',
};

function LiveCompanionOrbComponent({
  size = 180,
  tint = colors.primary,
  mood = 'calm',
  state = 'idle',
  intensity = 0.5,
  active = true,
}: Props) {
  const breathe = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0.4)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const drift = useRef(new Animated.Value(0)).current;
  const heartbeat = useRef(new Animated.Value(1)).current;
  const leftEye = useRef(new Animated.Value(1)).current;
  const rightEye = useRef(new Animated.Value(1)).current;
  const blinkLoop = useRef<Animated.CompositeAnimation | null>(null);

  const isSleeping = state === 'sleeping' || (!active && new Date().getHours() >= 23);
  const isSpeaking = state === 'speaking';
  const isListening = state === 'listening';
  const isThinking = state === 'thinking';
  const isCelebrating = state === 'celebrating' || mood === 'celebrating';

  useEffect(() => {
    if (!active && !isSleeping) return;

    const breatheDuration = isSleeping ? 3200 : isSpeaking ? 900 : isListening ? 1400 : isThinking ? 1100 : 2000;
    const breatheScale = isCelebrating ? 1.12 : isSpeaking ? 1.06 + intensity * 0.04 : isListening ? 1.05 : 1.04;

    const breatheAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: breatheScale,
          duration: breatheDuration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 1,
          duration: breatheDuration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    const glowTarget = parseFloat(MOOD_GLOW[mood]) + (isListening ? 0.15 : isSpeaking ? 0.2 : 0);
    const glowAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: Math.min(glowTarget, 0.95),
          duration: isSpeaking ? 600 : 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: Math.max(glowTarget - 0.25, 0.15),
          duration: isSpeaking ? 600 : 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    const ringAnim = Animated.loop(
      Animated.timing(ring, { toValue: 1, duration: isListening ? 1800 : 2800, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    );

    const driftAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 4200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(drift, { toValue: -1, duration: 4200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );

    breatheAnim.start();
    glowAnim.start();
    if (isListening || isSpeaking || isCelebrating) ringAnim.start();
    if (state === 'idle' && !isSleeping) driftAnim.start();

    return () => {
      breatheAnim.stop();
      glowAnim.stop();
      ringAnim.stop();
      driftAnim.stop();
    };
  }, [active, breathe, glow, ring, drift, mood, state, intensity, isSleeping, isSpeaking, isListening, isThinking, isCelebrating]);

  useEffect(() => {
    if (isSleeping) {
      blinkLoop.current?.stop();
      leftEye.setValue(0.15);
      rightEye.setValue(0.15);
      return;
    }

    const blink = () =>
      Animated.sequence([
        Animated.delay(2200 + Math.random() * 3000),
        Animated.parallel([
          Animated.timing(leftEye, { toValue: 0.08, duration: 90, useNativeDriver: true }),
          Animated.timing(rightEye, { toValue: 0.08, duration: 90, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(leftEye, { toValue: 1, duration: 120, useNativeDriver: true }),
          Animated.timing(rightEye, { toValue: 1, duration: 120, useNativeDriver: true }),
        ]),
      ]);

    blinkLoop.current = Animated.loop(blink());
    blinkLoop.current.start();
    return () => blinkLoop.current?.stop();
  }, [isSleeping, leftEye, rightEye]);

  useEffect(() => {
    if (!isSpeaking) {
      heartbeat.setValue(1);
      return;
    }
    const hb = Animated.loop(
      Animated.sequence([
        Animated.timing(heartbeat, { toValue: 1.04, duration: 180, useNativeDriver: true }),
        Animated.timing(heartbeat, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(heartbeat, { toValue: 1.03, duration: 140, useNativeDriver: true }),
        Animated.timing(heartbeat, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
    );
    hb.start();
    return () => hb.stop();
  }, [isSpeaking, heartbeat]);

  const inner = size * 0.72;
  const glowSize = size * 1.5;
  const eyeSize = inner * 0.11;
  const eyeGap = inner * 0.14;

  const driftX = drift.interpolate({ inputRange: [-1, 1], outputRange: [-3, 3] });
  const driftY = drift.interpolate({ inputRange: [-1, 1], outputRange: [2, -2] });

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Animated.View
        style={[
          styles.glow,
          {
            width: glowSize,
            height: glowSize,
            borderRadius: glowSize / 2,
            backgroundColor: `${tint}${Math.round(parseFloat(MOOD_GLOW[mood]) * 99).toString(16).padStart(2, '0')}`,
          },
          {
            opacity: glow,
            transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.4] }) }],
          },
        ]}
      />
      {(isListening || isSpeaking || isCelebrating) && (
        <Animated.View
          style={[
            styles.ring,
            { width: size, height: size, borderRadius: size / 2, borderColor: tint },
            {
              opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
              transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.55] }) }],
            },
          ]}
        />
      )}
      <Animated.View
        style={[
          styles.orb,
          {
            width: inner,
            height: inner,
            borderRadius: inner / 2,
            backgroundColor: tint,
            shadowColor: tint,
          },
          {
            transform: [
              { translateX: driftX },
              { translateY: driftY },
              { scale: Animated.multiply(breathe, heartbeat) },
            ],
          },
        ]}>
        <View style={styles.face}>
          <Animated.View style={[styles.eye, { width: eyeSize, height: eyeSize, borderRadius: eyeSize / 2, transform: [{ scaleY: leftEye }] }]} />
          <Animated.View style={[styles.eye, { width: eyeSize, height: eyeSize, borderRadius: eyeSize / 2, transform: [{ scaleY: rightEye }] }]} />
        </View>
        <View style={[styles.face, { marginTop: eyeGap }]}>
          <View style={[styles.smile, isCelebrating && styles.smileWide, isSleeping && styles.smileSleep]} />
        </View>
        <View style={styles.coreHighlight} />
      </Animated.View>
    </View>
  );
}

export const LiveCompanionOrb = memo(LiveCompanionOrbComponent);

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute' },
  ring: { position: 'absolute', borderWidth: 1.5 },
  orb: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 32,
    elevation: 14,
  },
  face: { flexDirection: 'row', gap: 14, alignItems: 'center', justifyContent: 'center' },
  eye: { backgroundColor: 'rgba(255,255,255,0.92)' },
  smile: {
    width: 18,
    height: 8,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderWidth: 2,
    borderTopWidth: 0,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  smileWide: { width: 24, height: 10 },
  smileSleep: { width: 12, height: 4, opacity: 0.5 },
  coreHighlight: {
    position: 'absolute',
    top: '18%',
    left: '22%',
    width: '28%',
    height: '28%',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
});
