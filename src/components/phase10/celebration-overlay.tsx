import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { VoxaText } from '../ui/voxa-text';
import { colors, radius, shadows, spacing } from '../../constants/theme';
import { CelebrationPayload } from '../../types/phase10-play';
import { subscribeCelebrations } from '../../services/phase10/celebration-service';
import { hapticCelebrate } from '../../utils/haptics';
import { useReduceMotion } from '../../hooks/use-reduce-motion';

type Props = {
  onLevelUpDismiss?: (payload: CelebrationPayload) => void;
};

export function CelebrationOverlay({ onLevelUpDismiss }: Props) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const [payload, setPayload] = useState<CelebrationPayload | null>(null);
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onDismissRef = useRef(onLevelUpDismiss);
  onDismissRef.current = onLevelUpDismiss;

  const dismiss = (current: CelebrationPayload) => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -120, duration: 220, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      if (current.kind === 'level_up') onDismissRef.current?.(current);
      setPayload(null);
    });
  };

  useEffect(() => {
    return subscribeCelebrations((p) => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      setPayload(p);
      void hapticCelebrate();
      translateY.setValue(-120);
      opacity.setValue(0);
      if (reduceMotion) {
        opacity.setValue(1);
        translateY.setValue(0);
      } else {
        Animated.parallel([
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 8, tension: 90 }),
          Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();
      }
      dismissTimer.current = setTimeout(() => dismiss(p), p.kind === 'level_up' ? 5200 : 3800);
    });
  }, [opacity, reduceMotion, translateY]);

  useEffect(
    () => () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    },
    [],
  );

  if (!payload) return null;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Animated.View
        style={[
          styles.toast,
          {
            top: insets.top + spacing.sm,
            opacity,
            transform: [{ translateY }],
          },
          shadows.soft,
        ]}>
        <Pressable
          onPress={() => dismiss(payload)}
          style={styles.toastInner}
          accessibilityRole="button">
          <VoxaText variant="subtitle" style={styles.emoji}>
            {payload.emoji ?? '✨'}
          </VoxaText>
          <View style={styles.copy}>
            <VoxaText variant="subtitle" numberOfLines={1}>
              {payload.title}
            </VoxaText>
            {payload.subtitle ? (
              <VoxaText variant="caption" color="textSecondary" numberOfLines={2}>
                {payload.subtitle}
              </VoxaText>
            ) : null}
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 1000,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
  },
  toastInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md12,
    minHeight: 64,
  },
  emoji: { fontSize: 28, lineHeight: 32 },
  copy: { flex: 1, gap: 2 },
});
