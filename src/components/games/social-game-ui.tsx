import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Alert,
  Animated,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { PremiumButton } from '../premium/premium-ui';
import { VoxaText } from '../ui/voxa-text';
import { colors, radius, spacing } from '../../constants/theme';
import { PREMIUM_MOTION } from '../../utils/premium-motion';
import { hapticLight, hapticSuccess } from '../../utils/haptics';

const HOLD_MS = 900;

type HoldToRevealProps = {
  lockedLabel: string;
  revealedTitle: string;
  revealedBody: string;
  onRevealed?: () => void;
  onContinue: () => void;
  continueLabel?: string;
};

/** Hold to reveal secret roles. Hides content from VoiceOver until revealed. */
export function HoldToReveal({
  lockedLabel,
  revealedTitle,
  revealedBody,
  onRevealed,
  onContinue,
  continueLabel = 'Got it — hide & pass',
}: HoldToRevealProps) {
  const [revealed, setRevealed] = useState(false);
  const [holding, setHolding] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  const clearHold = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    animRef.current?.stop();
    animRef.current = null;
    if (!revealed) {
      progress.setValue(0);
    }
    setHolding(false);
  }, [progress, revealed]);

  const startHold = useCallback(() => {
    if (revealed) return;
    setHolding(true);
    void hapticLight();
    progress.setValue(0);
    const duration = reduceMotion ? 200 : HOLD_MS;
    animRef.current = Animated.timing(progress, {
      toValue: 1,
      duration,
      useNativeDriver: false,
      easing: PREMIUM_MOTION.fadeIn.easing,
    });
    animRef.current.start();
    timerRef.current = setTimeout(() => {
      setRevealed(true);
      setHolding(false);
      void hapticSuccess();
      onRevealed?.();
    }, duration);
  }, [onRevealed, progress, reduceMotion, revealed]);

  useEffect(() => () => clearHold(), [clearHold]);

  const widthInterp = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.revealWrap}>
      {!revealed ? (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.secretHidden}>
          <VoxaText variant="caption" color="textMuted">
            Secret hidden until you hold
          </VoxaText>
          <Pressable
            onPressIn={startHold}
            onPressOut={clearHold}
            accessibilityRole="button"
            accessibilityLabel={lockedLabel}
            accessibilityHint="Hold to reveal your private role. Others should look away."
            style={({ pressed }) => [styles.holdPad, (pressed || holding) && styles.holdPadActive]}>
            <VoxaText variant="subtitle" color="primarySoft">
              Hold to reveal
            </VoxaText>
            <VoxaText variant="caption" color="textMuted">
              Others look away
            </VoxaText>
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, { width: widthInterp }]} />
            </View>
          </Pressable>
        </View>
      ) : (
        <View
          accessible
          accessibilityRole="summary"
          accessibilityLabel={`${revealedTitle}. ${revealedBody}`}>
          <VoxaText variant="caption" color="textMuted">
            Private — do not show others
          </VoxaText>
          <VoxaText variant="title" style={styles.revealTitle}>
            {revealedTitle}
          </VoxaText>
          <VoxaText variant="body" color="textSecondary">
            {revealedBody}
          </VoxaText>
          <View style={styles.revealActions}>
            <PremiumButton
              label={continueLabel}
              onPress={() => {
                void hapticLight();
                onContinue();
              }}
            />
          </View>
        </View>
      )}
    </View>
  );
}

type GameChromeProps = {
  title: string;
  subtitle?: string;
  paused: boolean;
  onPause: () => void;
  onResume: () => void;
  onRestart: () => void;
  onLeave: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

export function GameChrome({
  title,
  subtitle,
  paused,
  onPause,
  onResume,
  onRestart,
  onLeave,
  children,
  footer,
}: GameChromeProps) {
  const confirmLeave = () => {
    Alert.alert('Leave game?', 'Your round is saved. You can resume from Games Hub.', [
      { text: 'Stay', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: () => {
          void hapticLight();
          onLeave();
        },
      },
    ]);
  };

  const confirmRestart = () => {
    Alert.alert('Restart round?', 'Current progress for this round will reset.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Restart',
        onPress: () => {
          void hapticLight();
          onRestart();
        },
      },
    ]);
  };

  return (
    <View style={styles.chrome}>
      <View style={styles.chromeHeader}>
        <View style={styles.chromeCopy}>
          <VoxaText variant="caption" color="primarySoft">
            Social games
          </VoxaText>
          <VoxaText variant="title">{title}</VoxaText>
          {subtitle ? (
            <VoxaText variant="body" color="textSecondary">
              {subtitle}
            </VoxaText>
          ) : null}
        </View>
        <View style={styles.chromeActions}>
          {paused ? (
            <PremiumButton label="Resume" variant="ghost" onPress={onResume} />
          ) : (
            <PremiumButton label="Pause" variant="ghost" onPress={onPause} />
          )}
          <Pressable onPress={confirmRestart} hitSlop={8}>
            <VoxaText variant="caption" color="textMuted">
              Restart
            </VoxaText>
          </Pressable>
          <Pressable onPress={confirmLeave} hitSlop={8}>
            <VoxaText variant="caption" color="danger">
              Leave
            </VoxaText>
          </Pressable>
        </View>
      </View>

      {paused ? (
        <View style={styles.pausedBanner}>
          <VoxaText variant="subtitle">Paused</VoxaText>
          <VoxaText variant="body" color="textSecondary">
            Timers are frozen. Resume when everyone is ready.
          </VoxaText>
          <PremiumButton label="Resume game" onPress={onResume} />
        </View>
      ) : (
        children
      )}

      {footer && !paused ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

export function PlayerNameEditor({
  names,
  onChange,
  min = 2,
  max = 10,
}: {
  names: string[];
  onChange: (names: string[]) => void;
  min?: number;
  max?: number;
}) {
  return (
    <View style={styles.names}>
      {names.map((name, index) => (
        <View key={`p-${index}`} style={styles.nameRow}>
          <TextInput
            value={name}
            onChangeText={(text) => {
              const next = [...names];
              next[index] = text;
              onChange(next);
            }}
            placeholder={`Player ${index + 1}`}
            placeholderTextColor={colors.textMuted}
            style={styles.nameField}
            autoCapitalize="words"
            accessibilityLabel={`Player ${index + 1} name`}
          />
          {names.length > min ? (
            <Pressable
              onPress={() => onChange(names.filter((_, i) => i !== index))}
              hitSlop={8}>
              <VoxaText variant="caption" color="danger">
                Remove
              </VoxaText>
            </Pressable>
          ) : null}
        </View>
      ))}
      {names.length < max ? (
        <PremiumButton
          label="Add player"
          variant="ghost"
          onPress={() => onChange([...names, `Player ${names.length + 1}`])}
        />
      ) : null}
    </View>
  );
}

export function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  chrome: { flex: 1, gap: spacing.md },
  chromeHeader: { gap: spacing.sm },
  chromeCopy: { gap: spacing.xs },
  chromeActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.md,
  },
  pausedBanner: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  footer: { gap: spacing.sm, paddingTop: spacing.sm },
  revealWrap: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  secretHidden: { gap: spacing.md },
  holdPad: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xxl,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  holdPadActive: { borderColor: colors.primarySoft },
  progressTrack: {
    marginTop: spacing.md,
    width: '70%',
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    backgroundColor: colors.primarySoft,
  },
  revealTitle: { marginTop: spacing.sm },
  revealActions: { marginTop: spacing.lg },
  names: { gap: spacing.sm },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  nameField: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    color: colors.text,
    fontSize: 15,
  },
});
