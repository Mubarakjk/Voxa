import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';

import { VoxaText } from '../ui/voxa-text';
import { PremiumButton } from '../premium/premium-ui';
import { colors, spacing } from '../../constants/theme';
import { CelebrationPayload } from '../../types/phase10-play';
import { subscribeCelebrations } from '../../services/phase10/celebration-service';
import { hapticCelebrate } from '../../utils/haptics';

type Props = {
  onLevelUpDismiss?: (payload: CelebrationPayload) => void;
};

function ConfettiDot({ delay, x, color }: { delay: number; x: number; color: string }) {
  const y = useRef(new Animated.Value(-20)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(y, { toValue: 280, duration: 1400 + delay, useNativeDriver: true, delay }),
      Animated.timing(opacity, { toValue: 0, duration: 1400 + delay, useNativeDriver: true, delay: 400 }),
    ]).start();
  }, [delay, opacity, y]);

  return (
    <Animated.View
      style={[styles.confetti, { left: x, backgroundColor: color, transform: [{ translateY: y }], opacity }]}
    />
  );
}

export function CelebrationOverlay({ onLevelUpDismiss }: Props) {
  const [payload, setPayload] = useState<CelebrationPayload | null>(null);
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const count = useRef(new Animated.Value(0)).current;
  const [displayAmount, setDisplayAmount] = useState(0);
  const { width } = useWindowDimensions();

  useEffect(() => {
    return subscribeCelebrations((p) => {
      setPayload(p);
      void hapticCelebrate();
      scale.setValue(0.85);
      opacity.setValue(0);
      count.setValue(0);
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 7, tension: 120 }),
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
      if (p.amount) {
        Animated.timing(count, { toValue: p.amount, duration: 700, useNativeDriver: false }).start();
      }
    });
  }, [count, opacity, scale]);

  useEffect(() => {
    if (!payload?.amount) return;
    const id = count.addListener(({ value }) => setDisplayAmount(Math.round(value)));
    return () => count.removeListener(id);
  }, [count, payload?.amount]);

  const dismiss = () => {
    Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      if (payload?.kind === 'level_up') onLevelUpDismiss?.(payload);
      setPayload(null);
    });
  };

  if (!payload) return null;

  const confettiColors = [colors.primarySoft, colors.blue, colors.glow, '#fbbf24'];
  const dots = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    x: (width * 0.1) + ((width * 0.8) / 12) * i,
    delay: i * 40,
    color: confettiColors[i % confettiColors.length],
  }));

  return (
    <Modal transparent visible animationType="none" onRequestClose={dismiss}>
      <Pressable style={styles.backdrop} onPress={dismiss}>
        {dots.map((d) => (
          <ConfettiDot key={d.id} delay={d.delay} x={d.x} color={d.color} />
        ))}
        <Pressable onPress={(e) => e.stopPropagation()}>
        <Animated.View style={[styles.card, { opacity, transform: [{ scale }] }]}>
          <View style={styles.glow} />
          <VoxaText variant="hero" style={styles.emoji}>{payload.emoji ?? '✨'}</VoxaText>
          <VoxaText variant="subtitle">{payload.title}</VoxaText>
          {payload.subtitle ? (
            <VoxaText variant="body" color="textSecondary" style={styles.subtitle}>{payload.subtitle}</VoxaText>
          ) : null}
          {payload.amount && payload.kind !== 'level_up' ? (
            <VoxaText variant="subtitle" color="primarySoft">+{displayAmount} XP</VoxaText>
          ) : null}
          {payload.oldLevel && payload.newLevel ? (
            <VoxaText variant="body" color="textMuted">
              Level {payload.oldLevel} → {payload.newLevel}
            </VoxaText>
          ) : null}
          {payload.rewardTitle ? (
            <VoxaText variant="caption" color="primarySoft">Unlocked: {payload.rewardTitle}</VoxaText>
          ) : null}
          <PremiumButton label="Continue" onPress={dismiss} />
        </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.surfaceStrong,
    borderRadius: 20,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  glow: {
    position: 'absolute',
    top: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primarySoft,
    opacity: 0.15,
  },
  emoji: { fontSize: 44, lineHeight: 52 },
  subtitle: { textAlign: 'center' },
  tap: { marginTop: spacing.md },
  confetti: {
    position: 'absolute',
    top: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
