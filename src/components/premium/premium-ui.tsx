import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ReactNode, useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View, ViewStyle } from 'react-native';

import { colors, layout, radius, spacing, typography } from '../../constants/theme';
import { PREMIUM_MOTION, staggerDelay } from '../../utils/premium-motion';
import { useReduceMotion } from '../../hooks/use-reduce-motion';
import { BackButton } from '../ui/back-button';
import { VoxaText } from '../ui/voxa-text';
import { VoiceOrb } from '../ui/voice-orb';
import { RootStackParamList } from '../../navigation/types';
import {
  CompanionOrbMood,
  CompanionOrbState,
  LiveCompanionOrb,
} from '../live-companion/live-companion-orb';

export function ScreenHeader({
  eyebrow,
  title,
  subtitle,
  right,
  onBack,
  showBack,
  style,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  /** Drill-down screens: native-style back before the title row. */
  onBack?: () => void;
  /** When true, wires navigation.goBack() if onBack is not provided. */
  showBack?: boolean;
  style?: ViewStyle;
}) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const handleBack =
    onBack ??
    (showBack
      ? () => {
          if (navigation.canGoBack()) navigation.goBack();
        }
      : undefined);

  return (
    <View style={[styles.screenHeaderWrap, style]}>
      {handleBack ? <BackButton onPress={handleBack} /> : null}
      <View style={styles.screenHeader}>
        <View style={styles.screenHeaderCopy}>
          {eyebrow ? (
            <VoxaText variant="caption" color="textMuted">
              {eyebrow}
            </VoxaText>
          ) : null}
          <VoxaText variant="title">{title}</VoxaText>
          {subtitle ? (
            <VoxaText variant="body" color="textSecondary">
              {subtitle}
            </VoxaText>
          ) : null}
        </View>
        {right}
      </View>
    </View>
  );
}

export function HeroOrb({
  tint,
  size = 200,
  active = true,
  label,
  caption,
  onPress,
  onLongPress,
  orbState = 'idle',
  orbMood = 'calm',
  intensity = 0.5,
}: {
  tint: string;
  size?: number;
  active?: boolean;
  label?: string;
  caption?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  orbState?: CompanionOrbState;
  orbMood?: CompanionOrbMood;
  intensity?: number;
}) {
  const content = (
    <View style={styles.heroOrbWrap}>
      <LiveCompanionOrb
        size={size}
        tint={tint}
        active={active}
        state={orbState}
        mood={orbMood}
        intensity={intensity}
      />
      {label ? <VoxaText variant="subtitle" style={styles.heroLabel}>{label}</VoxaText> : null}
      {caption ? (
        <VoxaText variant="caption" color="textMuted" style={styles.heroCaption}>
          {caption}
        </VoxaText>
      ) : null}
    </View>
  );

  if (onPress || onLongPress) {
    return (
      <Pressable onPress={onPress} onLongPress={onLongPress} style={({ pressed }) => pressed && styles.pressed}>
        {content}
      </Pressable>
    );
  }
  return content;
}

export function SectionCard({
  title,
  subtitle,
  children,
  onPress,
  actionLabel,
  style,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  onPress?: () => void;
  actionLabel?: string;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      style={[styles.sectionCard, style]}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}>
      <View style={styles.sectionCardHeader}>
        <View style={styles.sectionCardCopy}>
          <VoxaText variant="subtitle">{title}</VoxaText>
          {subtitle ? (
            <VoxaText variant="caption" color="textMuted">
              {subtitle}
            </VoxaText>
          ) : null}
        </View>
        {actionLabel ? (
          <VoxaText variant="caption" color="primarySoft">
            {actionLabel}
          </VoxaText>
        ) : null}
      </View>
      {children}
    </Pressable>
  );
}

export function ActionPill({
  icon,
  label,
  onPress,
  accent = colors.primarySoft,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  accent?: string;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.actionPill, pressed && styles.pressed]} onPress={onPress}>
      <View style={[styles.actionPillIcon, { backgroundColor: `${accent}22`, borderColor: `${accent}44` }]}>
        <Ionicons name={icon} size={18} color={accent} />
      </View>
      <VoxaText variant="caption" color="textSecondary">
        {label}
      </VoxaText>
    </Pressable>
  );
}

export function StatCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <View style={styles.statCard}>
      <VoxaText variant="label" color="textMuted" style={styles.statLabel}>
        {label}
      </VoxaText>
      <VoxaText variant="subtitle" style={styles.statValue}>
        {value}
      </VoxaText>
      {detail ? (
        <VoxaText variant="caption" color="textMuted" style={styles.statDetail}>
          {detail}
        </VoxaText>
      ) : null}
    </View>
  );
}

export function TimelineItem({
  title,
  subtitle,
  date,
  isLast,
}: {
  title: string;
  subtitle?: string;
  date?: string;
  isLast?: boolean;
}) {
  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineRail}>
        <View style={styles.timelineDot} />
        {!isLast ? <View style={styles.timelineLine} /> : null}
      </View>
      <View style={styles.timelineCopy}>
        <VoxaText variant="body" style={styles.timelineTitle}>
          {title}
        </VoxaText>
        {subtitle ? (
          <VoxaText variant="caption" color="textSecondary" style={styles.timelineSubtitle}>
            {subtitle}
          </VoxaText>
        ) : null}
        {date ? (
          <VoxaText variant="caption" color="textMuted">
            {date}
          </VoxaText>
        ) : null}
      </View>
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name={icon} size={28} color={colors.primarySoft} />
      </View>
      <VoxaText variant="subtitle" style={styles.emptyTitle}>
        {title}
      </VoxaText>
      <VoxaText variant="body" color="textSecondary" style={styles.emptyMessage}>
        {message}
      </VoxaText>
      {actionLabel && onAction ? (
        <PremiumButton label={actionLabel} onPress={onAction} />
      ) : null}
    </View>
  );
}

export function SkeletonBlock({ height = 72, style }: { height?: number; style?: ViewStyle }) {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 700, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          height,
          borderRadius: radius.lg,
          backgroundColor: colors.surfaceStrong,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function LoadingPulse({ label = 'Loading...' }: { label?: string }) {
  const reduceMotion = useReduceMotion();
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (reduceMotion) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 900, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity, reduceMotion]);

  return (
    <View
      style={styles.loadingPulse}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}>
      <VoiceOrb size={56} active={!reduceMotion} tint={colors.primarySoft} />
      <Animated.View style={{ opacity: reduceMotion ? 1 : opacity }}>
        <VoxaText variant="caption" color="textMuted" style={styles.loadingLabel}>
          {label}
        </VoxaText>
      </Animated.View>
    </View>
  );
}

export function PremiumButton({
  label,
  onPress,
  icon,
  variant = 'primary',
  disabled,
}: {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: 'primary' | 'ghost';
  disabled?: boolean;
}) {
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      style={({ pressed }) => [
        styles.premiumButton,
        isPrimary ? styles.premiumButtonPrimary : styles.premiumButtonGhost,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}>
      {icon ? (
        <Ionicons
          name={icon}
          size={18}
          color={disabled ? colors.textMuted : isPrimary ? colors.background : colors.primarySoft}
        />
      ) : null}
      <VoxaText
        variant="buttonLabel"
        style={{
          color: disabled ? colors.textMuted : isPrimary ? colors.background : colors.primarySoft,
        }}>
        {label}
      </VoxaText>
    </Pressable>
  );
}

export function TypingDots({ tint = colors.primarySoft }: { tint?: string }) {
  const a = useRef(new Animated.Value(0)).current;
  const b = useRef(new Animated.Value(0)).current;
  const c = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, { toValue: 1, duration: 320, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(val, { toValue: 0.2, duration: 320, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      );
    const p1 = pulse(a, 0);
    const p2 = pulse(b, 120);
    const p3 = pulse(c, 240);
    p1.start();
    p2.start();
    p3.start();
    return () => {
      p1.stop();
      p2.stop();
      p3.stop();
    };
  }, [a, b, c]);

  const dot = (val: Animated.Value) => ({
    opacity: val,
    transform: [{ scale: val.interpolate({ inputRange: [0.2, 1], outputRange: [0.85, 1.15] }) }],
  });

  return (
    <View style={styles.typingDots}>
      <Animated.View style={[styles.dot, { backgroundColor: tint }, dot(a)]} />
      <Animated.View style={[styles.dot, { backgroundColor: tint }, dot(b)]} />
      <Animated.View style={[styles.dot, { backgroundColor: tint }, dot(c)]} />
    </View>
  );
}

export function FadeIn({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const reduceMotion = useReduceMotion();
  const opacity = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(reduceMotion ? 0 : PREMIUM_MOTION.slideUp.distance)).current;

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(1);
      translateY.setValue(0);
      return;
    }
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: PREMIUM_MOTION.fadeIn.duration, delay, useNativeDriver: true }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: PREMIUM_MOTION.slideUp.duration,
        delay,
        easing: PREMIUM_MOTION.fadeIn.easing,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, opacity, reduceMotion, translateY]);

  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}

export function StaggerFade({ children, index = 0, baseDelay = 0 }: { children: ReactNode; index?: number; baseDelay?: number }) {
  return <FadeIn delay={baseDelay + staggerDelay(index)}>{children}</FadeIn>;
}

export function SpringPressable({
  children,
  onPress,
  style,
  disabled,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
  disabled?: boolean;
}) {
  const reduceMotion = useReduceMotion();
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () => {
    if (reduceMotion) return;
    Animated.spring(scale, { toValue: PREMIUM_MOTION.buttonScale.pressIn, useNativeDriver: true, ...PREMIUM_MOTION.spring }).start();
  };
  const pressOut = () => {
    if (reduceMotion) return;
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, ...PREMIUM_MOTION.spring }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      disabled={disabled}
      accessibilityRole="button">
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

export function VoiceWavePulse({ active, tint = colors.primarySoft }: { active: boolean; tint?: string }) {
  return (
    <View style={styles.waveRow}>
      {[...Array(10)].map((_, i) => (
        <View
          key={i}
          style={[
            styles.waveBar,
            {
              height: 8 + (i % 4) * 8,
              backgroundColor: tint,
              opacity: active ? 0.25 + (i % 3) * 0.22 : 0.1,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screenHeaderWrap: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  screenHeaderCopy: { flex: 1, gap: 4 },
  heroOrbWrap: { alignItems: 'center', gap: spacing.md },
  heroLabel: { marginTop: spacing.sm },
  heroCaption: { textAlign: 'center', maxWidth: 280 },
  sectionCard: {
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceQuiet,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md12,
    marginBottom: spacing.md12,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  sectionCardCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
  actionPill: { alignItems: 'center', gap: spacing.sm, minWidth: 72 },
  actionPillIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  statCard: {
    flex: 1,
    minWidth: 0,
    paddingVertical: spacing.md12,
    paddingHorizontal: spacing.md12,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
    gap: spacing.xs,
  },
  statLabel: { lineHeight: 16 },
  statValue: { fontSize: 20, lineHeight: 26 },
  statDetail: { lineHeight: 17 },
  timelineRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  timelineRail: { alignItems: 'center', width: 16 },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primarySoft,
    marginTop: 6,
  },
  timelineLine: { flex: 1, width: 2, backgroundColor: colors.borderSubtle, marginTop: 4 },
  timelineCopy: { flex: 1, minWidth: 0, gap: spacing.xs, paddingBottom: spacing.sm },
  timelineTitle: { lineHeight: 22 },
  timelineSubtitle: { lineHeight: 18 },
  emptyState: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(45, 212, 191, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.22)',
    marginBottom: spacing.sm,
  },
  emptyTitle: { textAlign: 'center', maxWidth: 300 },
  emptyMessage: { textAlign: 'center', maxWidth: 320, lineHeight: 22 },
  loadingPulse: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.md },
  loadingLabel: { textAlign: 'center' },
  premiumButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    minHeight: layout.minTapTarget,
    paddingVertical: 12,
    borderRadius: radius.full,
  },
  premiumButtonPrimary: { backgroundColor: colors.primary },
  premiumButtonGhost: {
    backgroundColor: 'rgba(45, 212, 191, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.28)',
  },
  pressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
  disabled: {
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  typingDots: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  waveRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.md },
  waveBar: { width: 4, borderRadius: 4 },
});
